import { type NextRequest } from 'next/server'
import { detectUrlType, extractMapsCoords, extractMapsPlaceName, findCoordsInText, sanitizeUrl } from '@/lib/utils/url-detect'
import { fetchAndParse, classifyWithClaude, type ExtractedData } from '@/lib/enrichment/enrich'
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

        send('detected', { urlType, rawUrl })
        await sleep(PACE.betweenPhases)

        // ── Phase 2: fetch + parse OG ─────────────────────────────────
        send('fetching', { url: rawUrl })
        const fetched = await fetchAndParse(rawUrl)
        const resolvedUrl = fetched?.finalUrl ?? rawUrl
        const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
        const html = fetched?.html ?? ''

        send('og_parsed', {
          resolvedUrl,
          title: og.title,
          description: og.description,
          imageUrl: og.image,
          siteName: og.siteName,
        })
        await sleep(PACE.betweenPhases)

        // ── Phase 3: Claude classifier ────────────────────────────────
        send('classifying', null)

        const claude = hasApiKey
          ? await classifyWithClaude(
              resolvedUrl,
              og,
              html,
              urlType === 'google_maps' ? 'place' : null
            )
          : {
              category: null as SaveCategory | null,
              alternativeCategories: [] as SaveCategory[],
              title: null,
              subtitle: null,
              note: null,
              confidence: 'low' as const,
              extracted: {} as ExtractedData,
            }

        // For Google Maps: extract coords from URL or HTML body
        let coords: { lat: number; lng: number } | null = null
        if (urlType === 'google_maps') {
          coords = extractMapsCoords(resolvedUrl) ?? findCoordsInText(html.slice(0, 50_000))
        }

        // Pick final category — Google Maps falls back to 'place' if Claude fails
        const category: SaveCategory | null =
          claude.category ?? (urlType === 'google_maps' ? 'place' : null)

        // Pick final title — handle Instagram fallbacks + Google Maps place name
        const finalTitle = pickFinalTitle({
          rawUrl,
          urlType,
          claude,
          og,
          mapsPlaceName: urlType === 'google_maps' ? extractMapsPlaceName(resolvedUrl) : null,
        })

        send('classified', {
          category,
          confidence: claude.confidence,
          alternativeCategories: claude.alternativeCategories,
        })
        await sleep(PACE.betweenPhases)

        // ── Choreographed field reveals ────────────────────────────────
        if (finalTitle) {
          send('titled', { title: finalTitle })
          await sleep(PACE.betweenStructured)
        }

        const finalSubtitle = claude.subtitle ?? og.description ?? null
        if (finalSubtitle) {
          send('subtitled', { subtitle: finalSubtitle })
          await sleep(PACE.betweenStructured)
        }

        if (claude.note) {
          send('noted', { note: claude.note })
          await sleep(PACE.betweenStructured)
        }

        // ── Per-category structured field reveals ───────────────────────
        const ex = claude.extracted ?? {}

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
          imageUrl: og.image,
          canonicalUrl: resolvedUrl,
          coords,
          note: claude.note,
          confidence: claude.confidence,
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
