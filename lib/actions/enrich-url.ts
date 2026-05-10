'use server'

import type { Database } from '@/lib/types/supabase'
import {
  detectUrlType,
  extractMapsCoords,
  extractMapsPlaceName,
  findCoordsInText,
} from '@/lib/utils/url-detect'

type SaveCategory = Database['public']['Enums']['save_category']

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
}

// ─── Fetch + OG parser ────────────────────────────────────────────────────────

type OgData = {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

type FetchResult = {
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

async function fetchAndParse(url: string): Promise<FetchResult | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': pickUserAgent(url),
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })

    if (!res.ok) return null

    const finalUrl = res.url || url
    const html = await res.text()

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

type ClaudeResult = {
  category: SaveCategory | null
  alternativeCategories: SaveCategory[]
  title: string | null
  subtitle: string | null
  note: string | null
  confidence: 'high' | 'medium' | 'low'
}

const EMPTY_CLAUDE: ClaudeResult = {
  category: null,
  alternativeCategories: [],
  title: null,
  subtitle: null,
  note: null,
  confidence: 'low',
}

async function classifyWithClaude(
  url: string,
  og: OgData,
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

    const prompt = `You are classifying a URL for a personal saves library.

URL: ${url}
OG Title: ${og.title ?? '(none)'}
OG Description: ${og.description ?? '(none)'}
Site Name: ${og.siteName ?? '(none)'}${placeHint}

Categories available:
recipe | tv | movie | restaurant | hotel | place | event | book | podcast | music | article | product | workout | noted

Return ONLY valid JSON (no markdown, no explanation):
{
  "category": "<best single category from the list>",
  "alternativeCategories": ["<one or two other plausible categories, or empty array if confident>"],
  "title": "<clean, short title — improve OG title if noisy, strip ' - Google Maps' suffixes, or null to keep OG>",
  "subtitle": "<address, neighborhood, byline, or other secondary detail — or null>",
  "note": "<one short sentence on why someone might save this, or null>",
  "confidence": "<high | medium | low>"
}

Be decisive. Only mark medium/low if the URL is genuinely ambiguous.`

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 384,
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
    }

    const validate = (c: string | undefined): SaveCategory | null =>
      (c && (VALID_CATEGORIES as readonly string[]).includes(c)) ? (c as SaveCategory) : null

    const confidence: 'high' | 'medium' | 'low' =
      parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
        ? parsed.confidence
        : 'medium'

    return {
      category: validate(parsed.category),
      alternativeCategories: (parsed.alternativeCategories ?? [])
        .map(validate)
        .filter((c): c is SaveCategory => c !== null),
      title: parsed.title ?? null,
      subtitle: parsed.subtitle ?? null,
      note: parsed.note ?? null,
      confidence,
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
  // The full URL has @LAT,LNG and /maps/place/NAME embedded.
  if (urlType === 'google_maps') {
    const fetched = await fetchAndParse(rawUrl)
    const resolvedUrl = fetched?.finalUrl ?? rawUrl
    const og = fetched?.og ?? { title: null, description: null, image: null, siteName: null }
    const html = fetched?.html ?? ''

    const coords =
      extractMapsCoords(resolvedUrl) ??
      // Fallback: Google sometimes embeds coords in the page HTML
      findCoordsInText(html.slice(0, 50_000))

    const placeName = extractMapsPlaceName(resolvedUrl)

    // Clean up Google's "X - Google Maps" suffix from OG title
    const cleanOgTitle = og.title?.replace(/\s*-\s*Google Maps\s*$/i, '').trim() ?? null

    // Use Claude to classify (restaurant/hotel/place/event) — always, since
    // the keyword heuristic was too weak. Falls back to 'place' if no API key.
    const claude = hasApiKey
      ? await classifyWithClaude(resolvedUrl, og, 'place')
      : EMPTY_CLAUDE

    const category: SaveCategory =
      claude.category ?? 'place'

    return {
      title: claude.title ?? placeName ?? cleanOgTitle,
      subtitle: claude.subtitle ?? og.description ?? null,
      category,
      imageUrl: og.image,
      canonicalUrl: resolvedUrl,
      coords,
      note: claude.note,
      confidence: claude.confidence === 'low' ? 'medium' : claude.confidence, // we know it's a place
      source: 'google_maps',
      alternativeCategories: claude.alternativeCategories,
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
      const claude = await classifyWithClaude(rawUrl, og)
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
    const claude = await classifyWithClaude(rawUrl, og)
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
