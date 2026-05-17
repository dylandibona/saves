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
  extractSpotifyKind,
  extractTikTokUsername,
  extractYouTubeId,
  findCoordsInText,
  type SpotifyKind,
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

export type EnrichmentError = {
  ts: string
  phase: 'fetch' | 'oembed' | 'classify' | 'places'
  message: string
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
  // Warnings recorded during enrichment. Persisted to saves.enrichment_errors
  // when present. Used for post-hoc triage of capture failures.
  errors?: EnrichmentError[]
}

// ─── HTML entity decoder ─────────────────────────────────────────────────────
// Why this exists: OG meta values come in HTML-encoded. Sites use the full
// set of named entities (`&rsquo;` for curly apostrophes, `&mdash;` for em
// dashes, `&hellip;` for ellipses, etc.) and numeric entities (`&#8217;`,
// `&#x2014;`). The previous implementation only handled five and left
// everything else as literal text, surfacing as artifacts like "you&rsquo;ll"
// in card titles. This decoder covers the common named set plus all numeric
// entities (decimal and hex). Used by fetchAndParse below.

const NAMED_ENTITIES: Record<string, string> = {
  amp:    '&',  lt:     '<',  gt:     '>',  quot:   '"',  apos:   "'",
  nbsp:   ' ',
  // Punctuation we actually see in titles in the wild
  ndash:  '–', mdash: '—',
  lsquo:  '‘', rsquo: '’', sbquo: '‚',
  ldquo:  '“', rdquo: '”', bdquo: '„',
  hellip: '…', laquo: '«', raquo: '»',
  // Diacritics commonly seen on recipe and travel sites
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ',
  uuml:   'ü', ouml:   'ö', auml:   'ä',
  Uuml:   'Ü', Ouml:   'Ö', Auml:   'Ä',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  ccedil: 'ç', Ccedil: 'Ç',
  szlig:  'ß',
  // Misc
  copy:   '©', reg: '®', trade: '™',
  middot: '·', bull: '•',
  deg:    '°',
}

export function decodeHtmlEntities(s: string): string {
  if (!s) return s
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]+);/g, (raw, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10)
      if (Number.isFinite(code) && code > 0 && code <= 0x10FFFF) {
        try { return String.fromCodePoint(code) } catch { return raw }
      }
      return raw
    }
    const named = NAMED_ENTITIES[body]
    return named ?? raw
  })
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

// Facebook's preview crawler — Instagram is built to feed it well, and
// Google Maps shortlinks redirect cleanly under this UA where they'd
// serve an empty interstitial to anything that looks like a browser.
const FB_BOT_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

// Slack's link-expander. The single most permissive UA we've found for
// Cloudflare-protected publishers — Dotdash/Meredith (foodandwine,
// allrecipes, eatingwell, simplyrecipes, etc.), most newsrooms, and many
// indie blogs whitelist it because Slack previews are common and they
// don't want them broken. Returns the full rendered page with all OG
// markup and JSON-LD intact where Chrome UA gets a 403 challenge.
const SLACK_BOT_UA =
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'

function pickUserAgent(url: string): string {
  // Instagram: FB's own bot gets the richest OG markup, including captions.
  if (url.includes('instagram.com')) return FB_BOT_UA

  // Google Maps shortlinks: FB-bot UA bypasses the consent interstitial
  // and returns the full /maps?q=NAME,ADDRESS redirect with rich OG.
  if (url.includes('maps.app.goo.gl') || url.includes('goo.gl') || url.includes('maps.google')) {
    return FB_BOT_UA
  }

  // Everything else: Slackbot. Better hit rate than Chrome UA on WAF'd
  // publishers and behaves identically on every site that returns the
  // same content to both.
  return SLACK_BOT_UA
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
      return decodeHtmlEntities(m[1]).trim() || null
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

// ─── Error derivation ─────────────────────────────────────────────────────────
// Observe a finished EnrichedUrl and synthesize error entries from the
// fallback signals. Cheap, no rewrite of the branchy enrichUrl required —
// the rule is: low confidence + heuristic source ≈ something went wrong.

export function deriveEnrichmentErrors(e: EnrichedUrl): EnrichmentError[] | null {
  const errors: EnrichmentError[] = []
  const ts = new Date().toISOString()

  if (e.source === 'heuristic') {
    errors.push({
      ts,
      phase: 'fetch',
      message: 'No OG metadata returned; falling back to URL-only heuristics.',
    })
  }
  if (e.title === null) {
    errors.push({
      ts,
      phase: 'classify',
      message: 'No title resolved; user will need to set one manually.',
    })
  }
  if (e.category === null) {
    errors.push({
      ts,
      phase: 'classify',
      message: 'No category resolved; user will need to pick one.',
    })
  }
  return errors.length > 0 ? errors : null
}

// ─── oEmbed (YouTube / TikTok / Spotify) ──────────────────────────────────────

export type OEmbed = {
  title: string | null
  authorName: string | null
  thumbnailUrl: string | null
  providerName: string | null
  type: string | null
}

const OEMBED_ENDPOINTS: Record<string, (url: string) => string> = {
  youtube: (u) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
  tiktok:  (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
  spotify: (u) => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
}

export async function fetchOEmbed(
  provider: 'youtube' | 'tiktok' | 'spotify',
  url: string,
): Promise<OEmbed | null> {
  try {
    const endpoint = OEMBED_ENDPOINTS[provider](url)
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
      provider_name?: string
      type?: string
    }
    return {
      title: data.title ?? null,
      authorName: data.author_name ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      providerName: data.provider_name ?? null,
      type: data.type ?? null,
    }
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

export type ClassifyHint =
  | 'place'
  | 'video'           // YouTube / TikTok — wide net, includes workout/recipe/music/podcast/article/noted
  | 'music'           // Spotify track/album/playlist, Apple Music — bias toward music
  | 'podcast'         // Spotify episode/show, Apple Podcasts — bias toward podcast
  | 'movie'           // Letterboxd — bias toward movie
  | 'book'            // Goodreads — bias toward book
  | null
  | undefined

const HINT_PROMPTS: Record<Exclude<ClassifyHint, null | undefined>, string> = {
  place:   'This is a Google Maps URL, so the category is one of: restaurant, hotel, place, event. Pick the most likely one.',
  video:   'This is a short-form or long-form video share (YouTube or TikTok). Use the title, channel/creator name, and any caption to decide between: workout, recipe, music, podcast, movie, tv, article, product, or noted. Do NOT default to noted unless you genuinely cannot tell.',
  music:   'This is a music share (Spotify or Apple Music track/album/playlist). The category is "music". Extract artist, album, and song name into the extracted fields.',
  podcast: 'This is a podcast share (Spotify or Apple Podcasts episode/show). The category is "podcast". Extract showName, episodeNumber, and any guest/host names.',
  movie:   'This is a Letterboxd film page. The category is "movie" (or "tv" if the title indicates a series). Extract year, director, runtime.',
  book:    'This is a Goodreads book page. The category is "book". Extract author and a short summary of the premise.',
}

export async function classifyWithClaude(
  url: string,
  og: OgData,
  htmlExcerpt: string,
  hint?: ClassifyHint,
): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return EMPTY_CLAUDE

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })

    const placeHint = hint ? `\n${HINT_PROMPTS[hint]}` : ''

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

    // 20s hard cap. Anthropic Opus 4.5 usually responds in 2–4s; anything
    // beyond 20s is almost certainly a hung connection. Failing fast gives
    // the user OG-only fallback rather than a spinner stuck forever.
    const msg = await client.messages.create(
      {
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      },
      { timeout: 20_000 },
    )

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

    // Clean up Google's OG title. Two formats observed:
    //   - Legacy: "Place Name - Google Maps"
    //   - Current: "Place Name · 4.3★(37) · Restaurant"
    // For the new middot-separated form we keep just the first segment.
    const cleanOgTitle = og.title
      ? og.title
          .replace(/\s*-\s*Google Maps\s*$/i, '')
          .split(/\s+·\s+/)[0]
          .trim() || null
      : null

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
  // oEmbed (no key) gives us clean title + channel + thumbnail. Claude then
  // picks the right category from {workout, recipe, music, podcast, movie,
  // tv, article, product, noted} based on title + channel + description.
  if (urlType === 'youtube') {
    const videoId = extractYouTubeId(rawUrl)
    const [oembed, fetched] = await Promise.all([
      fetchOEmbed('youtube', rawUrl),
      fetchAndParse(rawUrl),
    ])
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    // Prefer maxres thumbnail when we have a video ID — oEmbed gives hqdefault.
    const heroImage =
      (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null) ??
      oembed?.thumbnailUrl ??
      og.image
    // Build composite OG so Claude sees channel as siteName.
    const composite: OgData = {
      title: oembed?.title ?? og.title,
      description: og.description,
      image: heroImage,
      siteName: oembed?.authorName ?? og.siteName,
    }
    const claude = hasApiKey
      ? await classifyWithClaude(rawUrl, composite, fetched?.html ?? '', 'video')
      : EMPTY_CLAUDE
    return {
      title: claude.title ?? oembed?.title ?? og.title,
      subtitle: oembed?.authorName ?? claude.subtitle ?? og.description ?? null,
      category: claude.category ?? 'noted',
      imageUrl: heroImage,
      canonicalUrl: rawUrl,
      coords: null,
      note: claude.note,
      confidence: claude.category
        ? claude.confidence
        : (oembed?.title ? 'medium' : 'low'),
      source: claude.category ? 'ai' : (oembed?.title ? 'og' : 'heuristic'),
      alternativeCategories: claude.alternativeCategories,
      extracted: claude.extracted,
    }
  }

  // ── TikTok ───────────────────────────────────────────────────────────────
  // oEmbed gives us title (which is usually the caption), author_name (the
  // @handle), and thumbnail. Slackbot fetch supplies OG description as a
  // backup. Claude classifies into workout/recipe/music/etc.
  if (urlType === 'tiktok') {
    const [oembed, fetched] = await Promise.all([
      fetchOEmbed('tiktok', rawUrl),
      fetchAndParse(rawUrl),
    ])
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    const resolvedUrl = fetched?.finalUrl ?? rawUrl
    const handle = extractTikTokUsername(resolvedUrl) ?? oembed?.authorName ?? null
    const composite: OgData = {
      title: oembed?.title ?? og.title,
      description: og.description,
      image: oembed?.thumbnailUrl ?? og.image,
      siteName: handle ?? og.siteName,
    }
    const claude = hasApiKey
      ? await classifyWithClaude(resolvedUrl, composite, fetched?.html ?? '', 'video')
      : EMPTY_CLAUDE
    const fallbackTitle = oembed?.title ?? og.title ?? (handle ? `@${handle} on TikTok` : 'TikTok')
    return {
      title: claude.title ?? fallbackTitle,
      subtitle: handle ? `@${handle} on TikTok` : (claude.subtitle ?? og.description ?? null),
      category: claude.category ?? 'noted',
      imageUrl: oembed?.thumbnailUrl ?? og.image,
      canonicalUrl: resolvedUrl,
      coords: null,
      note: claude.note,
      confidence: claude.category ? claude.confidence : (oembed?.title ? 'medium' : 'low'),
      source: claude.category ? 'ai' : (oembed?.title ? 'og' : 'heuristic'),
      alternativeCategories: claude.alternativeCategories,
      extracted: claude.extracted,
    }
  }

  // ── Spotify (track / album / playlist / episode / show / artist) ─────────
  // The URL path tells us the kind; we bias Claude toward music vs podcast
  // accordingly. oEmbed gives thumbnail + title. OG description on Spotify
  // is rich enough that Claude can pull artist / album / showName cleanly.
  if (urlType === 'spotify') {
    const kind: SpotifyKind | null = extractSpotifyKind(rawUrl)
    const [oembed, fetched] = await Promise.all([
      fetchOEmbed('spotify', rawUrl),
      fetchAndParse(rawUrl),
    ])
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    const composite: OgData = {
      title: oembed?.title ?? og.title,
      description: og.description,
      image: oembed?.thumbnailUrl ?? og.image,
      siteName: og.siteName ?? 'Spotify',
    }
    const isPodcast = kind === 'episode' || kind === 'show'
    const claude = hasApiKey
      ? await classifyWithClaude(rawUrl, composite, fetched?.html ?? '', isPodcast ? 'podcast' : 'music')
      : EMPTY_CLAUDE
    return {
      title: claude.title ?? oembed?.title ?? og.title,
      subtitle: claude.subtitle ?? og.description ?? null,
      category: claude.category ?? (isPodcast ? 'podcast' : 'music'),
      imageUrl: oembed?.thumbnailUrl ?? og.image,
      canonicalUrl: fetched?.finalUrl ?? rawUrl,
      coords: null,
      note: claude.note,
      confidence: claude.category ? claude.confidence : 'medium',
      source: claude.category ? 'ai' : 'og',
      alternativeCategories: claude.alternativeCategories,
      extracted: claude.extracted,
    }
  }

  // ── Apple Music / Apple Podcasts ─────────────────────────────────────────
  // Apple's OG markup is decent. No oEmbed. Just hint Claude toward the
  // right category and let it extract structure from OG.
  if (urlType === 'apple_music' || urlType === 'apple_podcasts') {
    const fetched = await fetchAndParse(rawUrl)
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    const isPodcast = urlType === 'apple_podcasts'
    const claude = hasApiKey
      ? await classifyWithClaude(rawUrl, og, fetched?.html ?? '', isPodcast ? 'podcast' : 'music')
      : EMPTY_CLAUDE
    return {
      title: claude.title ?? og.title,
      subtitle: claude.subtitle ?? og.description ?? null,
      category: claude.category ?? (isPodcast ? 'podcast' : 'music'),
      imageUrl: og.image,
      canonicalUrl: fetched?.finalUrl ?? rawUrl,
      coords: null,
      note: claude.note,
      confidence: claude.category ? claude.confidence : 'medium',
      source: claude.category ? 'ai' : 'og',
      alternativeCategories: claude.alternativeCategories,
      extracted: claude.extracted,
    }
  }

  // ── Letterboxd / Goodreads ───────────────────────────────────────────────
  // Both have rich OG + JSON-LD. Pass a category hint so Claude commits.
  if (urlType === 'letterboxd' || urlType === 'goodreads') {
    const fetched = await fetchAndParse(rawUrl)
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    const hint: ClassifyHint = urlType === 'letterboxd' ? 'movie' : 'book'
    const claude = hasApiKey
      ? await classifyWithClaude(rawUrl, og, fetched?.html ?? '', hint)
      : EMPTY_CLAUDE
    return {
      title: claude.title ?? og.title,
      subtitle: claude.subtitle ?? og.description ?? null,
      category: claude.category ?? (urlType === 'letterboxd' ? 'movie' : 'book'),
      imageUrl: og.image,
      canonicalUrl: fetched?.finalUrl ?? rawUrl,
      coords: null,
      note: claude.note,
      confidence: claude.category ? claude.confidence : 'medium',
      source: claude.category ? 'ai' : 'og',
      alternativeCategories: claude.alternativeCategories,
      extracted: claude.extracted,
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
