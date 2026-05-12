/**
 * Enrichment internals. NOT a Server Action module — this lives outside
 * `lib/actions/` so the API route at /api/enrich-stream can call the
 * individual helpers (fetchAndParse, classifyWithClaude) directly to
 * emit phased progress events.
 *
 * Server-only by convention: no client component should import from here.
 * The Server Action wrapper lives at lib/actions/enrich-url.ts.
 */

import type { Database } from '@/lib/types/supabase'
import {
  detectUrlType,
  extractMapsCoords,
  extractMapsPlaceName,
  findCoordsInText,
} from '@/lib/utils/url-detect'
import { lookupPlace } from '@/lib/enrichment/places'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Category-specific structured data extracted from the source.
 * Whichever fields are relevant to the chosen category get filled;
 * the rest stay null. Stored on saves.canonical_data.extracted so
 * detail pages can render rich, source-equivalent context without
 * the user needing to follow the link.
 */
export type ExtractedData = {
  // recipe
  ingredients?: string[]
  instructions?: string[]
  totalTime?: string
  servings?: string | number

  // workout
  exercises?: Array<{ name: string; sets?: string; reps?: string; notes?: string }>
  duration?: string
  equipment?: string[]

  // place / restaurant / hotel
  address?: string
  hours?: string
  phone?: string
  website?: string
  priceLevel?: string

  // article / book
  author?: string
  summary?: string
  readTime?: string
  publishedAt?: string

  // tv / movie
  year?: string | number
  director?: string
  runtime?: string

  // product
  brand?: string
  price?: string

  // podcast / music
  episodeNumber?: string | number
  showName?: string
  artist?: string
}

export type EnrichedUrl = {
  title: string | null
  subtitle: string | null
  category: SaveCategory | null
  imageUrl: string | null
  canonicalUrl: string  // resolved URL (for shortened links)
  coords: { lat: number; lng: number } | null
  note: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'google_maps' | 'ai' | 'og' | 'heuristic'
  // For UX disambiguation when category confidence is low
  alternativeCategories?: SaveCategory[]
  // Per-category structured data — the save IS the artifact, not a bookmark.
  extracted?: ExtractedData
}

// ─── Fetch + OG parser ────────────────────────────────────────────────────────

export type OgData = {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

export type FetchResult = {
  finalUrl: string
  html: string
  og: OgData
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Some sites (Instagram, TikTok, certain news) return richer OG data to
// social-bot user agents than to a regular browser UA. Facebook's preview
// crawler is the most permissive — and Instagram especially is built to
// feed it well.
const FB_BOT_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

function pickUserAgent(url: string): string {
  if (url.includes('instagram.com')) return FB_BOT_UA
  return USER_AGENT
}

export async function fetchAndParse(url: string): Promise<FetchResult | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': pickUserAgent(url),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Upgrade-Insecure-Requests': '1',
        'sec-ch-ua':
          '"Not_A Brand";v="8", "Chromium";v="124", "Google Chrome";v="124"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })

    const finalUrl = res.url || url
    const html = await res.text()

    // Don't bail on non-2xx. Many sites (Dotdash/Meredith — foodandwine,
    // allrecipes, eatingwell, realsimple, etc.) sit behind WAFs that return
    // 403/429 but still include the full HTML body with OG markup intact.
    // We only give up if the body is too small to contain anything useful.
    if (!res.ok && html.length < 5_000) return null

    const extract = (pattern: RegExp): string | null => {
      const m = html.match(pattern)
      if (!m) return null
      return m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim() || null
    }

    const og: OgData = {
      title:
        extract(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
        extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ??
        extract(/<title>([^<]+)<\/title>/i),
      description:
        extract(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ??
        extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ??
        extract(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ??
        extract(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i),
      image:
        extract(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ??
        extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i),
      siteName:
        extract(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ??
        extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:site_name["']/i),
    }

    return { finalUrl, html, og }
  } catch {
    return null
  }
}

// ─── Claude classifier ────────────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlyArray<SaveCategory> = [
  'recipe', 'tv', 'movie', 'restaurant', 'hotel', 'place', 'event',
  'book', 'podcast', 'music', 'article', 'product', 'workout', 'noted',
]

export type ClaudeResult = {
  category: SaveCategory | null
  alternativeCategories: SaveCategory[]
  title: string | null
  subtitle: string | null
  note: string | null
  confidence: 'high' | 'medium' | 'low'
  extracted: ExtractedData
}

const EMPTY_CLAUDE: ClaudeResult = {
  category: null,
  alternativeCategories: [],
  title: null,
  subtitle: null,
  note: null,
  confidence: 'low',
  extracted: {},
}

export async function classifyWithClaude(
  url: string,
  og: OgData,
  htmlExcerpt: string,
  hint?: 'place' | null,
): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return EMPTY_CLAUDE

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })

    const placeHint = hint === 'place'
      ? '\nThis is a Google Maps URL, so the category is one of: restaurant, hotel, place, event. Pick the most likely one.'
      : ''

    // Pull text content from HTML body — strip tags, normalize whitespace,
    // cap at ~6k chars. This is where recipe ingredients, workout sets,
    // article body, etc. live. JSON-LD structured data also gets scanned.
    const bodyText = htmlExcerpt
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)

    // Look for JSON-LD structured data (recipe sites, articles, products often have this)
    const jsonLdMatches = htmlExcerpt.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    const jsonLd = jsonLdMatches
      ? jsonLdMatches.map(m => m.replace(/<\/?script[^>]*>/gi, '').trim()).join('\n').slice(0, 4000)
      : ''

    const prompt = `You are extracting a save for a personal recommendation library. The save IS the destination — extract enough context that the user does not have to follow the link later.

URL: ${url}
OG Title: ${og.title ?? '(none)'}
OG Description: ${og.description ?? '(none)'}
Site Name: ${og.siteName ?? '(none)'}${placeHint}

${jsonLd ? `JSON-LD structured data (parse for recipe/article/product fields):\n${jsonLd}\n\n` : ''}Page text excerpt:
${bodyText.slice(0, 3500) || '(empty)'}

Categories: recipe | tv | movie | restaurant | hotel | place | event | book | podcast | music | article | product | workout | noted

Return ONLY valid JSON (no markdown, no explanation):
{
  "category": "<best single category>",
  "alternativeCategories": ["<one or two plausible alternates if uncertain, else []>"],
  "title": "<clean short title — strip site suffixes, fix Instagram noise, null to keep OG>",
  "subtitle": "<one short sentence: byline, address, neighborhood, episode label, or null>",
  "note": "<one short sentence on why someone would save this, or null>",
  "confidence": "<high | medium | low>",
  "extracted": {
    // Fill ONLY fields relevant to the chosen category. Use null for unknowns.
    // Be specific and concrete — these go straight into the saved card.

    // recipe:
    "ingredients": ["1 cup flour", "2 eggs", ...] or null,
    "instructions": ["Mix dry ingredients", "Add eggs and stir", ...] or null,
    "totalTime": "30 min" or null,
    "servings": 4 or null,

    // workout:
    "exercises": [{"name":"Kettlebell Swing","sets":"3","reps":"15","notes":null}, ...] or null,
    "duration": "20 min" or null,
    "equipment": ["kettlebell"] or null,

    // place/restaurant/hotel:
    "address": "123 Main St, Brooklyn, NY" or null,
    "hours": "Mon-Fri 9am-10pm" or null,
    "phone": "(555) 123-4567" or null,
    "website": "https://..." or null,
    "priceLevel": "$$" or null,

    // article/book:
    "author": "Jane Smith" or null,
    "summary": "2-3 sentence summary capturing the main point" or null,
    "readTime": "8 min read" or null,
    "publishedAt": "2024-03-15" or null,

    // tv/movie:
    "year": 2023 or null,
    "director": "Greta Gerwig" or null,
    "runtime": "2h 15m" or null,

    // product:
    "brand": "Patagonia" or null,
    "price": "$249" or null,

    // podcast/music:
    "episodeNumber": 142 or null,
    "showName": "Ezra Klein Show" or null,
    "artist": "Phoebe Bridgers" or null
  }
}

Rules:
- Be DECISIVE on category. Only mark medium/low confidence if genuinely ambiguous.
- Extract structured data WHENEVER the source has it — recipe sites usually do, Instagram captions often do for workouts/recipes if the user typed them out.
- Do not invent data. Null is correct when info is not available.
- For Instagram posts, the OG description is often the caption — read it carefully for workout sets, recipe ingredients, etc.
- Keep summaries to 2-3 sentences max, no preamble.`

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as {
      category?: string
      alternativeCategories?: string[]
      title?: string | null
      subtitle?: string | null
      note?: string | null
      confidence?: string
      extracted?: ExtractedData
    }

    const validate = (c: string | undefined): SaveCategory | null =>
      (c && (VALID_CATEGORIES as readonly string[]).includes(c)) ? (c as SaveCategory) : null

    const confidence: 'high' | 'medium' | 'low' =
      parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
        ? parsed.confidence
        : 'medium'

    // Strip out any null/empty fields from extracted so the JSONB stays clean
    const cleanExtracted: ExtractedData = {}
    if (parsed.extracted) {
      for (const [k, v] of Object.entries(parsed.extracted)) {
        if (v === null || v === undefined) continue
        if (Array.isArray(v) && v.length === 0) continue
        if (typeof v === 'string' && !v.trim()) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(cleanExtracted as any)[k] = v
      }
    }

    // Hard constraint: when the caller passed hint='place' (Google Maps
    // URL), the category MUST be one of the place-shaped categories.
    // Claude has been seen to pick 'recipe' or 'noted' when OG data is
    // sparse, even with the prompt hint — so we override here.
    const PLACE_CATEGORIES: ReadonlySet<SaveCategory> = new Set([
      'restaurant', 'hotel', 'place', 'event',
    ])
    let category = validate(parsed.category)
    if (hint === 'place') {
      if (!category || !PLACE_CATEGORIES.has(category)) {
        category = 'place'
      }
    }
    const alternativeCategories = (parsed.alternativeCategories ?? [])
      .map(validate)
      .filter((c): c is SaveCategory => c !== null)
      // For place hint, also filter alternatives to place-shaped only.
      .filter(c => hint !== 'place' || PLACE_CATEGORIES.has(c))

    return {
      category,
      alternativeCategories,
      title: parsed.title ?? null,
      subtitle: parsed.subtitle ?? null,
      note: parsed.note ?? null,
      confidence,
      extracted: cleanExtracted,
    }
  } catch {
    return EMPTY_CLAUDE
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function enrichUrl(rawUrl: string): Promise<EnrichedUrl> {
  const urlType = detectUrlType(rawUrl)
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)

  // ── Google Maps ──────────────────────────────────────────────────────────
  // Fetch + follow redirects to resolve shortened maps.app.goo.gl URLs.
  // The full URL has @LAT,LNG and /maps/place/NAME embedded. Then we hand
  // the place name + coords to Places API for the real data — formatted
  // name, address, photo, hours, phone, website, rating. OG scraping
  // alone gives us almost nothing useful for Maps URLs.
  if (urlType === 'google_maps') {
    const fetched = await fetchAndParse(rawUrl)
    const resolvedUrl = fetched?.finalUrl ?? rawUrl
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    const html = fetched?.html ?? ''

    const urlCoords =
      extractMapsCoords(resolvedUrl) ??
      // Fallback: Google sometimes embeds coords in the page HTML
      findCoordsInText(html.slice(0, 50_000))

    const placeName = extractMapsPlaceName(resolvedUrl)

    // Clean up Google's "X - Google Maps" suffix from OG title
    const cleanOgTitle = og.title?.replace(/\s*-\s*Google Maps\s*$/i, '').trim() ?? null

    // Places API — authoritative source for category, photo, address.
    // Query priority: parsed place name from URL, then OG title cleaned up.
    const placesQuery = placeName ?? cleanOgTitle ?? null
    const place = placesQuery
      ? await lookupPlace(placesQuery, urlCoords)
      : null

    // Use Places result when available; fall back to Claude classification
    // only when Places didn't return a hit (rare — name + coords almost
    // always lands a result inside the 500m bias radius).
    const claude = place
      ? EMPTY_CLAUDE
      : (hasApiKey
          ? await classifyWithClaude(resolvedUrl, og, html, 'place')
          : EMPTY_CLAUDE)

    const category: SaveCategory =
      place?.category ?? claude.category ?? 'place'

    const coords = place?.coords ?? urlCoords

    // Compose extracted from Places + any Claude extras (notably summary
    // / notes Claude may have inferred from accompanying text).
    const placeExtracted: ExtractedData = place
      ? {
          address:    place.address    ?? undefined,
          hours:      place.hours      ?? undefined,
          phone:      place.phone      ?? undefined,
          website:    place.website    ?? undefined,
          priceLevel: place.priceLevel ?? undefined,
        }
      : {}
    const mergedExtracted: ExtractedData = { ...claude.extracted, ...placeExtracted }

    return {
      title:    place?.name    ?? claude.title    ?? placeName ?? cleanOgTitle,
      subtitle: place?.address ?? claude.subtitle ?? og.description ?? null,
      category,
      imageUrl: place?.photoUrl ?? og.image,
      canonicalUrl: resolvedUrl,
      coords,
      note: claude.note,
      confidence: place ? 'high' : (claude.confidence === 'low' ? 'medium' : claude.confidence),
      source: 'google_maps',
      alternativeCategories: claude.alternativeCategories,
      extracted: mergedExtracted,
    }
  }

  // ── Instagram ────────────────────────────────────────────────────────────
  // Instagram heavily limits scrapers; OG title is often just "Instagram".
  // We work around this with URL-pattern detection + caption parsing from
  // the rare cases where IG does include `Username on Instagram: "caption"`.
  if (urlType === 'instagram') {
    const fetched = await fetchAndParse(rawUrl)
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }

    // What kind of Instagram URL? Used for title fallback + Claude hint.
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

    // Some IG posts return title as `Username on Instagram: "caption excerpt"`
    // Parse that out when present.
    let usernameFromOg: string | null = null
    let captionFromOg: string | null = null
    if (og.title) {
      const m = og.title.match(/^(.+?)\s+on\s+Instagram[:.]?\s*"?([^"]*?)"?\s*$/i)
      if (m) {
        usernameFromOg = m[1].trim()
        if (m[2] && m[2].trim()) captionFromOg = m[2].trim()
      }
    }

    const username = usernameFromOg ?? usernameFromUrl
    const ogTitleIsGeneric =
      !og.title || og.title.trim().toLowerCase() === 'instagram'

    // Build a sensible default title even when IG gives us nothing.
    // Caption (if scraped) > username's PostType > Instagram PostType.
    const fallbackTitle = captionFromOg
      ? captionFromOg
      : username
        ? `${username}'s ${postType}`
        : `Instagram ${postType}`

    // Subtitle: pull from username if we have it but no caption surfaced
    const fallbackSubtitle = og.description
      ?? (username && !captionFromOg ? `@${username} on Instagram` : null)

    if (hasApiKey) {
      // Hint Claude that the OG data may be unhelpful and to use the URL pattern
      const claude = await classifyWithClaude(rawUrl, og, fetched?.html ?? '')
      return {
        title: claude.title
          ?? (ogTitleIsGeneric ? fallbackTitle : og.title),
        subtitle: claude.subtitle ?? fallbackSubtitle,
        category: claude.category,
        imageUrl: og.image,
        canonicalUrl: rawUrl,
        coords: null,
        note: claude.note,
        confidence: claude.category ? claude.confidence : 'low',
        source: 'ai',
        alternativeCategories: claude.alternativeCategories,
        extracted: claude.extracted,
      }
    }

    return {
      title: ogTitleIsGeneric ? fallbackTitle : og.title,
      subtitle: fallbackSubtitle,
      category: null,
      imageUrl: og.image,
      canonicalUrl: rawUrl,
      coords: null,
      note: null,
      confidence: 'low',
      source: ogTitleIsGeneric ? 'heuristic' : 'og',
    }
  }

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (urlType === 'youtube') {
    const fetched = await fetchAndParse(rawUrl)
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    return {
      title: og.title,
      subtitle: og.siteName ?? null,
      category: 'noted',  // YouTube doesn't cleanly map — let user override
      imageUrl: og.image,
      canonicalUrl: rawUrl,
      coords: null,
      note: null,
      confidence: 'low',
      source: og.title ? 'og' : 'heuristic',
    }
  }

  // ── Generic ──────────────────────────────────────────────────────────────
  const fetched = await fetchAndParse(rawUrl)
  const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }

  if (hasApiKey) {
    const claude = await classifyWithClaude(rawUrl, og, fetched?.html ?? '')
    return {
      title: claude.title ?? og.title,
      subtitle: claude.subtitle ?? og.description ?? null,
      category: claude.category,
      imageUrl: og.image,
      canonicalUrl: fetched?.finalUrl ?? rawUrl,
      coords: null,
      note: claude.note,
      confidence: claude.category ? claude.confidence : 'low',
      source: 'ai',
      alternativeCategories: claude.alternativeCategories,
      extracted: claude.extracted,
    }
  }

  return {
    title: og.title,
    subtitle: og.description ?? null,
    category: null,
    imageUrl: og.image,
    canonicalUrl: fetched?.finalUrl ?? rawUrl,
    coords: null,
    note: null,
    confidence: og.title ? 'medium' : 'low',
    source: og.title ? 'og' : 'heuristic',
  }
}
