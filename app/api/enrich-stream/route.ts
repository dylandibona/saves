import { type NextRequest } from 'next/server'
import {
  detectUrlType,
  extractMapsCoords,
  extractMapsPlaceName,
  extractSpotifyKind,
  extractTikTokUsername,
  extractYouTubeId,
  findCoordsInText,
  sanitizeUrl,
} from '@/lib/utils/url-detect'
import {
  fetchAndParse,
  fetchOEmbed,
  classifyWithClaude,
  type ClassifyHint,
  type ExtractedData,
  type OEmbed,
  type OgData,
} from '@/lib/enrichment/enrich'
import { lookupPlace, type PlaceLookupResult } from '@/lib/enrichment/places'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Phased enrichment endpoint — Server-Sent Events.
 *
 * The /add form (and any future capture surface) calls this and reads
 * the stream as the save card builds itself in front of the user.
 *
 * Real phases (genuine sequential progress):
 *   1. detected         — URL type known instantly
 *   2. og_parsed        — page fetched, OG data extracted
 *   3. classified       — Claude returned category + confidence
 *
 * Choreographed reveals (after Claude returns, paced for animation):
 *   4. titled           — title resolved
 *   5. subtitled        — subtitle resolved
 *   6. ingredient/...   — structured fields populate one-at-a-time
 *   7. complete         — full EnrichedUrl payload for form submission
 *
 * Pacing constants below control the animation rhythm. Tune for feel.
 */

export const dynamic = 'force-dynamic'

// Pacing — milliseconds between event groups. Tune for feel.
const PACE = {
  betweenPhases: 90,       // wait after major phase before next
  betweenStructured: 70,   // wait between ingredients / exercises / steps
  finalBeat: 200,          // hold before 'complete' fires
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { url?: string }
  const inputUrl = body.url?.trim()
  // Clean iOS-clipboard-style duplicated URLs and trailing junk before
  // touching the rest of the pipeline.
  const rawUrl = inputUrl ? sanitizeUrl(inputUrl) : ''

  if (!rawUrl || !rawUrl.startsWith('http')) {
    return new Response(
      `data: ${JSON.stringify({ phase: 'error', data: { message: 'invalid url' } })}\n\n`,
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (phase: string, data?: unknown) => {
        const event = `data: ${JSON.stringify({ phase, data: data ?? null })}\n\n`
        controller.enqueue(encoder.encode(event))
      }

      try {
        const urlType = detectUrlType(rawUrl)
        const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)
        const oembedProvider: 'youtube' | 'tiktok' | 'spotify' | null =
          urlType === 'youtube' ? 'youtube'
          : urlType === 'tiktok' ? 'tiktok'
          : urlType === 'spotify' ? 'spotify'
          : null

        send('detected', { urlType, rawUrl })
        await sleep(PACE.betweenPhases)

        // ── Phase 2: fetch + parse OG (+ oEmbed in parallel where applicable) ──
        send('fetching', { url: rawUrl })
        const [fetched, oembed]: [Awaited<ReturnType<typeof fetchAndParse>>, OEmbed | null] =
          await Promise.all([
            fetchAndParse(rawUrl),
            oembedProvider ? fetchOEmbed(oembedProvider, rawUrl) : Promise.resolve(null),
          ])
        const resolvedUrl = fetched?.finalUrl ?? rawUrl
        const ogRaw = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
        const html = fetched?.html ?? ''

        // For YouTube, prefer maxres thumbnail derived from video id over
        // oEmbed's hqdefault. Falls back cleanly if we can't extract an id.
        const youtubeMaxres =
          urlType === 'youtube' && extractYouTubeId(resolvedUrl)
            ? `https://i.ytimg.com/vi/${extractYouTubeId(resolvedUrl)}/maxresdefault.jpg`
            : null
        const tikTokHandle =
          urlType === 'tiktok'
            ? (extractTikTokUsername(resolvedUrl) ?? oembed?.authorName ?? null)
            : null

        // Composite OG that incorporates oEmbed signals so Claude sees the
        // best available title + channel/handle + thumbnail.
        const og: OgData = oembedProvider
          ? {
              title: oembed?.title ?? ogRaw.title,
              description: ogRaw.description,
              image: youtubeMaxres ?? oembed?.thumbnailUrl ?? ogRaw.image,
              siteName: oembed?.authorName ?? tikTokHandle ?? ogRaw.siteName,
            }
          : ogRaw

        send('og_parsed', {
          resolvedUrl,
          title: og.title,
          description: og.description,
          imageUrl: og.image,
          siteName: og.siteName,
        })
        await sleep(PACE.betweenPhases)

        // ── Phase 2.5: Places API lookup (Maps URLs only) ─────────────
        // For Google Maps URLs we get the real artifact from Places API —
        // formatted name, address, photo, hours, phone, website, types.
        // Skipping Claude when Places hits saves a roundtrip and gives
        // better data anyway.
        let urlCoords: { lat: number; lng: number } | null = null
        let mapsPlaceName: string | null = null
        let place: PlaceLookupResult | null = null

        if (urlType === 'google_maps') {
          urlCoords = extractMapsCoords(resolvedUrl) ?? findCoordsInText(html.slice(0, 50_000))
          mapsPlaceName = extractMapsPlaceName(resolvedUrl)
          // Strip both legacy " - Google Maps" suffix and the new
          // middot-separated metadata (" · 4.3★(37) · Restaurant") so
          // only the place name remains.
          const cleanOg = og.title
            ? og.title
                .replace(/\s*-\s*Google Maps\s*$/i, '')
                .split(/\s+·\s+/)[0]
                .trim() || null
            : null
          const placesQuery = mapsPlaceName ?? cleanOg ?? null

          if (placesQuery) {
            send('place_looking_up', { query: placesQuery })
            place = await lookupPlace(placesQuery, urlCoords)
            if (place) {
              send('place_found', {
                name: place.name,
                address: place.address,
                photoUrl: place.photoUrl,
                category: place.category,
                rating: place.rating,
              })
              await sleep(PACE.betweenPhases)
            }
          }
        }

        // ── Phase 3: Claude classifier ────────────────────────────────
        // Skip Claude entirely when Places already gave us authoritative
        // data — its category, name, and address are better than what
        // Claude could infer from the same page.
        const skipClaude = Boolean(place)

        if (!skipClaude) {
          send('classifying', null)
        }

        // Map urlType → classifier hint so Claude commits to the right
        // category lane instead of falling back to 'noted' for YouTube etc.
        const classifyHint: ClassifyHint =
          urlType === 'google_maps' ? 'place'
          : urlType === 'youtube' || urlType === 'tiktok' ? 'video'
          : urlType === 'spotify' ? (() => {
              const k = extractSpotifyKind(resolvedUrl)
              return k === 'episode' || k === 'show' ? 'podcast' : 'music'
            })()
          : urlType === 'apple_music' ? 'music'
          : urlType === 'apple_podcasts' ? 'podcast'
          : urlType === 'letterboxd' ? 'movie'
          : urlType === 'goodreads' ? 'book'
          : null

        const claude = !skipClaude && hasApiKey
          ? await classifyWithClaude(resolvedUrl, og, html, classifyHint)
          : {
              category: null as SaveCategory | null,
              alternativeCategories: [] as SaveCategory[],
              title: null,
              subtitle: null,
              note: null,
              confidence: 'low' as const,
              extracted: {} as ExtractedData,
            }

        // Final coords — prefer Places-confirmed location when available
        const coords: { lat: number; lng: number } | null =
          place?.coords ?? urlCoords

        // Final category — Places types > Claude > urlType-aware fallback.
        // For media URLs we never want to fall through to null/noted just
        // because Claude wasn't confident; the URL itself tells us the lane.
        const urlTypeFallback: SaveCategory | null =
          urlType === 'google_maps' ? 'place'
          : urlType === 'spotify' ? ((() => {
              const k = extractSpotifyKind(resolvedUrl)
              return k === 'episode' || k === 'show' ? 'podcast' : 'music'
            })())
          : urlType === 'apple_music' ? 'music'
          : urlType === 'apple_podcasts' ? 'podcast'
          : urlType === 'letterboxd' ? 'movie'
          : urlType === 'goodreads' ? 'book'
          // YouTube / TikTok: prefer 'noted' only when Claude couldn't tell —
          // not a hard fallback at the urlType level, so we let claude.category
          // win when present and only fall back if it's null.
          : urlType === 'youtube' || urlType === 'tiktok' ? 'noted'
          : null
        const category: SaveCategory | null =
          place?.category ?? claude.category ?? urlTypeFallback

        // Pick final title — Places name wins, then Instagram fallbacks, then Claude/OG
        const finalTitle = place?.name ?? pickFinalTitle({
          rawUrl,
          urlType,
          claude,
          og,
          mapsPlaceName,
        })

        send('classified', {
          category,
          confidence: place ? 'high' : claude.confidence,
          alternativeCategories: claude.alternativeCategories,
        })
        await sleep(PACE.betweenPhases)

        // ── Choreographed field reveals ────────────────────────────────
        if (finalTitle) {
          send('titled', { title: finalTitle })
          await sleep(PACE.betweenStructured)
        }

        // Subtitle:
        //   - Places address wins for Maps URLs.
        //   - YouTube: channel name (already in og.siteName via composite).
        //   - TikTok: "@handle on TikTok".
        //   - Otherwise: Claude > OG description.
        const youtubeChannel = urlType === 'youtube' ? og.siteName : null
        const tiktokHandleSubtitle =
          urlType === 'tiktok' && tikTokHandle ? `@${tikTokHandle} on TikTok` : null
        const finalSubtitle =
          place?.address
          ?? youtubeChannel
          ?? tiktokHandleSubtitle
          ?? claude.subtitle
          ?? og.description
          ?? null
        if (finalSubtitle) {
          send('subtitled', { subtitle: finalSubtitle })
          await sleep(PACE.betweenStructured)
        }

        // Hero image — Places photo wins. og.image is already the
        // oEmbed-enriched composite for media URLs (maxres YouTube etc).
        const finalImageUrl = place?.photoUrl ?? og.image ?? null

        if (claude.note) {
          send('noted', { note: claude.note })
          await sleep(PACE.betweenStructured)
        }

        // ── Per-category structured field reveals ───────────────────────
        // Merge Places-derived fields into the extracted shape so the
        // detail page renders address/hours/phone/website/priceLevel
        // without any extra logic.
        const ex: ExtractedData = {
          ...(claude.extracted ?? {}),
          ...(place ? {
            address:    place.address    ?? undefined,
            hours:      place.hours      ?? undefined,
            phone:      place.phone      ?? undefined,
            website:    place.website    ?? undefined,
            priceLevel: place.priceLevel ?? undefined,
          } : {}),
        }

        // Recipe: ingredients (one at a time), then instructions (one at a time)
        if (ex.ingredients?.length) {
          send('extracting_section', { section: 'ingredients' })
          for (const ingredient of ex.ingredients) {
            send('ingredient', { ingredient })
            await sleep(PACE.betweenStructured)
          }
        }
        if (ex.instructions?.length) {
          send('extracting_section', { section: 'instructions' })
          for (const instruction of ex.instructions) {
            send('instruction', { instruction })
            await sleep(PACE.betweenStructured)
          }
        }
        if (ex.totalTime) send('recipe_meta', { totalTime: ex.totalTime })
        if (ex.servings) send('recipe_meta', { servings: ex.servings })

        // Workout: exercises one at a time
        if (ex.exercises?.length) {
          send('extracting_section', { section: 'exercises' })
          for (const exercise of ex.exercises) {
            send('exercise', exercise)
            await sleep(PACE.betweenStructured)
          }
        }
        if (ex.duration) send('workout_meta', { duration: ex.duration })
        if (ex.equipment?.length) send('workout_meta', { equipment: ex.equipment })

        // Place / restaurant / hotel
        if (ex.address || ex.hours || ex.phone || ex.website || ex.priceLevel) {
          send('place_detail', {
            address: ex.address,
            hours: ex.hours,
            phone: ex.phone,
            website: ex.website,
            priceLevel: ex.priceLevel,
          })
          await sleep(PACE.betweenStructured)
        }

        // Article / book
        if (ex.author || ex.summary || ex.readTime || ex.publishedAt) {
          send('article_detail', {
            author: ex.author,
            summary: ex.summary,
            readTime: ex.readTime,
            publishedAt: ex.publishedAt,
          })
          await sleep(PACE.betweenStructured)
        }

        // TV / movie
        if (ex.year || ex.director || ex.runtime) {
          send('movie_detail', { year: ex.year, director: ex.director, runtime: ex.runtime })
          await sleep(PACE.betweenStructured)
        }

        // Product
        if (ex.brand || ex.price) {
          send('product_detail', { brand: ex.brand, price: ex.price })
          await sleep(PACE.betweenStructured)
        }

        // Podcast / music
        if (ex.episodeNumber || ex.showName || ex.artist) {
          send('media_detail', {
            episodeNumber: ex.episodeNumber,
            showName: ex.showName,
            artist: ex.artist,
          })
          await sleep(PACE.betweenStructured)
        }

        // Coordinates pill (places)
        if (coords) {
          send('coords', coords)
          await sleep(PACE.betweenStructured)
        }

        // ── Final beat — full payload for form submission ──────────────
        await sleep(PACE.finalBeat)
        send('complete', {
          title: finalTitle,
          subtitle: finalSubtitle,
          category,
          imageUrl: finalImageUrl,
          canonicalUrl: resolvedUrl,
          coords,
          note: claude.note,
          confidence: place ? 'high' : claude.confidence,
          source: urlType === 'google_maps' ? 'google_maps' : hasApiKey ? 'ai' : 'og',
          alternativeCategories: claude.alternativeCategories,
          extracted: ex,
        })

        controller.close()
      } catch (err) {
        console.error('[enrich-stream] crash', {
          url: rawUrl,
          message: err instanceof Error ? err.message : String(err),
        })
        const errEvent = `data: ${JSON.stringify({
          phase: 'error',
          data: { message: err instanceof Error ? err.message : 'unknown error' },
        })}\n\n`
        controller.enqueue(encoder.encode(errEvent))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/**
 * Compose the final title across the various enrichment paths.
 * Mirrors the precedence rules from lib/enrichment/enrich.ts so the
 * streamed result matches the one-shot path exactly.
 */
function pickFinalTitle(args: {
  rawUrl: string
  urlType: ReturnType<typeof detectUrlType>
  claude: { title: string | null }
  og: { title: string | null; description: string | null }
  mapsPlaceName: string | null
}): string | null {
  const { urlType, claude, og, mapsPlaceName, rawUrl } = args

  if (urlType === 'google_maps') {
    const cleanOgTitle = og.title?.replace(/\s*-\s*Google Maps\s*$/i, '').trim() ?? null
    return claude.title ?? mapsPlaceName ?? cleanOgTitle
  }

  if (urlType === 'youtube' || urlType === 'tiktok' || urlType === 'spotify') {
    // og.title here is already the oEmbed-enriched composite. Claude's
    // cleaned-up title wins when present; otherwise use og.title.
    return claude.title ?? og.title
  }

  if (urlType === 'instagram') {
    // Parse 'Username on Instagram: "caption"' if Instagram leaked it
    let usernameFromOg: string | null = null
    let captionFromOg: string | null = null
    if (og.title) {
      const m = og.title.match(/^(.+?)\s+on\s+Instagram[:.]?\s*"?([^"]*?)"?\s*$/i)
      if (m) {
        usernameFromOg = m[1].trim()
        if (m[2]?.trim()) captionFromOg = m[2].trim()
      }
    }

    let postType: 'Post' | 'Reel' | 'Video' | 'Story' = 'Post'
    let usernameFromUrl: string | null = null
    try {
      const path = new URL(rawUrl).pathname
      if (path.startsWith('/reel/')) postType = 'Reel'
      else if (path.startsWith('/tv/')) postType = 'Video'
      else if (path.startsWith('/stories/')) {
        postType = 'Story'
        const m = path.match(/^\/stories\/([^/]+)/)
        if (m) usernameFromUrl = decodeURIComponent(m[1])
      }
    } catch {}

    const username = usernameFromOg ?? usernameFromUrl
    const ogTitleIsGeneric = !og.title || og.title.trim().toLowerCase() === 'instagram'
    const fallback = captionFromOg ?? (username ? `${username}'s ${postType}` : `Instagram ${postType}`)
    return claude.title ?? (ogTitleIsGeneric ? fallback : og.title)
  }

  return claude.title ?? og.title
}
