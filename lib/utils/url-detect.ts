export type UrlType = 'google_maps' | 'instagram' | 'youtube' | 'generic'

/**
 * Clean up junk that comes from pasting URLs out of iOS clipboard, share
 * sheets, and certain apps. Common patterns we've seen:
 *   - Two URLs concatenated: "https://x.com/abc...https://x.com/..."
 *   - URL with text appended: "look at this https://x.com/abc"
 *   - Stray whitespace at either end
 *
 * Returns the first complete http(s) URL found in the input, or the input
 * unchanged if nothing URL-shaped is in there.
 */
export function sanitizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  // Find all https:// or http:// positions in the string
  const matches: number[] = []
  const protocolPattern = /https?:\/\//gi
  let m: RegExpExecArray | null
  while ((m = protocolPattern.exec(trimmed)) !== null) {
    matches.push(m.index)
  }

  // Zero or one protocols → return as-is (no duplication to fix)
  if (matches.length <= 1) return trimmed

  // Multiple protocols → take from first protocol to second protocol
  // (exclusive), trimming trailing whitespace.
  return trimmed.slice(matches[0], matches[1]).trim()
}

export type MapsCoords = { lat: number; lng: number } | null

export function detectUrlType(url: string): UrlType {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    if (
      hostname === 'maps.google.com' ||
      hostname === 'maps.app.goo.gl' ||
      hostname === 'goo.gl' ||
      (hostname.includes('google.com') && parsed.pathname.startsWith('/maps'))
    ) {
      return 'google_maps'
    }

    if (hostname === 'instagram.com' || hostname === 'www.instagram.com') {
      return 'instagram'
    }

    if (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'youtu.be'
    ) {
      return 'youtube'
    }

    return 'generic'
  } catch {
    return 'generic'
  }
}

/**
 * Parses @LAT,LNG from google.com/maps URLs.
 * Returns null for shortened maps.app.goo.gl URLs (no coordinate in path).
 */
export function extractMapsCoords(url: string): MapsCoords {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'maps.app.goo.gl' || parsed.hostname === 'goo.gl') return null

    // @LAT,LNG (most common: zoom view, place page)
    const at = parsed.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (at) {
      const lat = parseFloat(at[1])
      const lng = parseFloat(at[2])
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
    }

    // !3dLAT!4dLNG inside data param (place pages sometimes have this format)
    const data = parsed.pathname.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
    if (data) {
      const lat = parseFloat(data[1])
      const lng = parseFloat(data[2])
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
    }

    // ?q=LAT,LNG (search-by-coords URLs)
    const q = parsed.searchParams.get('q')
    if (q) {
      const m = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/)
      if (m) {
        const lat = parseFloat(m[1])
        const lng = parseFloat(m[2])
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Extracts place name from a Google Maps URL.
 *
 * Two shapes Google uses:
 *   1. /maps/place/NAME/...  — when sharing from the desktop place card
 *   2. /maps?q=NAME,ADDRESS  — when sharing from the iOS app via the
 *      share sheet, which is what maps.app.goo.gl shortlinks redirect to
 *
 * Both come URL-encoded with `+` as space. For the `?q=` form, the place
 * name is the first comma-separated segment; the rest is the postal
 * address. Skip if the first segment looks like coordinates ("48.7,7.2").
 */
export function extractMapsPlaceName(url: string): string | null {
  try {
    const parsed = new URL(url)

    // Shape 1: /maps/place/NAME
    const pathMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/)
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1].replace(/\+/g, ' '))
    }

    // Shape 2: ?q=NAME,ADDRESS — only on /maps* paths
    if (parsed.pathname.startsWith('/maps')) {
      const q = parsed.searchParams.get('q')
      if (q) {
        const first = q.split(',')[0].trim()
        // Skip if the first chunk is coords ("48.7,7.2" — extractMapsCoords
        // already handled that case)
        if (!/^-?\d+\.?\d*$/.test(first) && first.length > 0) {
          return first
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Extract lat/lng from any text by scanning for the @LAT,LNG pattern OR
 * !3dLAT!4dLNG. Used as a fallback to scan HTML body when URL parsing fails.
 */
export function findCoordsInText(text: string): MapsCoords {
  const at = text.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)
  if (at) {
    const lat = parseFloat(at[1])
    const lng = parseFloat(at[2])
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng }
    }
  }
  const data = text.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/)
  if (data) {
    const lat = parseFloat(data[1])
    const lng = parseFloat(data[2])
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng }
    }
  }
  return null
}
