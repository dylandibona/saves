export type UrlType = 'google_maps' | 'instagram' | 'youtube' | 'generic'

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
 * Extracts place name from /maps/place/NAME/ path segment, URL-decoded.
 * Also handles + signs as spaces.
 */
export function extractMapsPlaceName(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/maps\/place\/([^/]+)/)
    if (!match) return null

    const raw = match[1].replace(/\+/g, ' ')
    return decodeURIComponent(raw)
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
