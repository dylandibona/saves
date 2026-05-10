'use server'

import type { Database } from '@/lib/types/supabase'
import {
  detectUrlType,
  extractMapsCoords,
  extractMapsPlaceName,
} from '@/lib/utils/url-detect'

type SaveCategory = Database['public']['Enums']['save_category']

export type EnrichedUrl = {
  title: string | null
  subtitle: string | null
  category: SaveCategory | null
  imageUrl: string | null
  canonicalUrl: string
  coords: { lat: number; lng: number } | null
  note: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'google_maps' | 'ai' | 'og' | 'heuristic'
}

// ─── OG fetch helper ──────────────────────────────────────────────────────────

type OgData = {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

async function fetchOgData(url: string): Promise<OgData> {
  const empty: OgData = { title: null, description: null, image: null, siteName: null }
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })

    if (!res.ok) return empty

    const html = await res.text()

    const extract = (pattern: RegExp): string | null => {
      const m = html.match(pattern)
      if (!m) return null
      // Decode HTML entities minimally
      return m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim() || null
    }

    const ogTitle =
      extract(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
      extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i)

    const ogDescription =
      extract(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ??
      extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ??
      extract(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ??
      extract(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)

    const ogImage =
      extract(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ??
      extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)

    const ogSiteName =
      extract(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ??
      extract(/<meta\s+content=["']([^"']+)["']\s+property=["']og:site_name["']/i)

    return { title: ogTitle, description: ogDescription, image: ogImage, siteName: ogSiteName }
  } catch {
    return empty
  }
}

// ─── Google Maps category heuristic ──────────────────────────────────────────

function categoryFromMapsDescription(description: string | null): SaveCategory {
  if (!description) return 'place'
  const d = description.toLowerCase()
  if (/restaurant|cafe|café|bar|bistro|diner|eatery|food|grill|tavern/.test(d)) return 'restaurant'
  if (/hotel|inn|resort|motel|lodge|hostel|airbnb/.test(d)) return 'hotel'
  return 'place'
}

// ─── Claude enrichment ────────────────────────────────────────────────────────

type ClaudeResult = {
  category: SaveCategory | null
  title: string | null
  subtitle: string | null
  note: string | null
}

async function classifyWithClaude(
  url: string,
  og: OgData
): Promise<ClaudeResult> {
  const fallback: ClaudeResult = { category: null, title: null, subtitle: null, note: null }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallback

  try {
    // Lazy import so the SDK is never bundled on the client
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })

    const prompt = `You are classifying a URL for a personal saves library.

URL: ${url}
OG Title: ${og.title ?? '(none)'}
OG Description: ${og.description ?? '(none)'}
Site Name: ${og.siteName ?? '(none)'}

Categories available:
recipe | tv | movie | restaurant | hotel | place | event | book | podcast | music | article | product | workout | noted

Return ONLY valid JSON (no markdown, no explanation):
{
  "category": "<best single category from the list above>",
  "title": "<clean, short title — improve the OG title if it's noisy, or null to keep OG>",
  "subtitle": "<subtitle or address if relevant, otherwise null>",
  "note": "<one sentence suggested note about why someone might save this, or null>"
}

Be decisive. Pick the single best category.`

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as {
      category?: string
      title?: string | null
      subtitle?: string | null
      note?: string | null
    }

    const validCategories = new Set<string>([
      'recipe', 'tv', 'movie', 'restaurant', 'hotel', 'place', 'event',
      'book', 'podcast', 'music', 'article', 'product', 'workout', 'noted',
    ])

    return {
      category: (parsed.category && validCategories.has(parsed.category))
        ? (parsed.category as SaveCategory)
        : null,
      title: parsed.title ?? null,
      subtitle: parsed.subtitle ?? null,
      note: parsed.note ?? null,
    }
  } catch {
    return fallback
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function enrichUrl(rawUrl: string): Promise<EnrichedUrl> {
  const urlType = detectUrlType(rawUrl)

  // ── Google Maps ──────────────────────────────────────────────────────────
  if (urlType === 'google_maps') {
    const coords = extractMapsCoords(rawUrl)
    const placeName = extractMapsPlaceName(rawUrl)

    const og = await fetchOgData(rawUrl)
    const title = placeName ?? og.title
    const category = categoryFromMapsDescription(og.description)

    return {
      title,
      subtitle: og.description ?? null,
      category,
      imageUrl: og.image,
      canonicalUrl: rawUrl,
      coords,
      note: null,
      confidence: 'high',
      source: 'google_maps',
    }
  }

  // ── Instagram ────────────────────────────────────────────────────────────
  if (urlType === 'instagram') {
    const og = await fetchOgData(rawUrl)
    const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)

    if (hasApiKey) {
      const claude = await classifyWithClaude(rawUrl, og)
      return {
        title: claude.title ?? og.title,
        subtitle: claude.subtitle,
        category: claude.category,
        imageUrl: og.image,
        canonicalUrl: rawUrl,
        coords: null,
        note: claude.note,
        confidence: claude.category ? 'medium' : 'low',
        source: 'ai',
      }
    }

    return {
      title: og.title,
      subtitle: null,
      category: null,
      imageUrl: og.image,
      canonicalUrl: rawUrl,
      coords: null,
      note: null,
      confidence: 'low',
      source: og.title ? 'og' : 'heuristic',
    }
  }

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (urlType === 'youtube') {
    const og = await fetchOgData(rawUrl)
    return {
      title: og.title,
      subtitle: og.siteName ?? null,
      category: 'noted',   // YouTube doesn't cleanly map — let user override
      imageUrl: og.image,
      canonicalUrl: rawUrl,
      coords: null,
      note: null,
      confidence: 'low',
      source: og.title ? 'og' : 'heuristic',
    }
  }

  // ── Generic ──────────────────────────────────────────────────────────────
  const og = await fetchOgData(rawUrl)
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)

  if (hasApiKey) {
    const claude = await classifyWithClaude(rawUrl, og)
    return {
      title: claude.title ?? og.title,
      subtitle: claude.subtitle,
      category: claude.category,
      imageUrl: og.image,
      canonicalUrl: rawUrl,
      coords: null,
      note: claude.note,
      confidence: claude.category ? 'high' : 'medium',
      source: 'ai',
    }
  }

  // Fallback: pure OG heuristic, no AI
  return {
    title: og.title,
    subtitle: og.description ?? null,
    category: null,
    imageUrl: og.image,
    canonicalUrl: rawUrl,
    coords: null,
    note: null,
    confidence: og.title ? 'medium' : 'low',
    source: og.title ? 'og' : 'heuristic',
  }
}
