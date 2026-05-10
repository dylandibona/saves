export type UrlType = 'google_maps' | 'instagram' | 'youtube' | 'generic'

export type MapsCoords = { lat: number; lng: number } | null

export function detectUrlType(url: string): UrlType {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    if (
      hostname === 'maps.google.com' ||
      hostname === 'maps.app.goo.gl' ||
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
    // Shortened URLs never have coords inline
    if (parsed.hostname === 'maps.app.goo.gl') return null

    // Match @LAT,LNG or @LAT,LNG,ZOOM
    const match = parsed.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (!match) return null

    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    if (isNaN(lat) || isNaN(lng)) return null

    return { lat, lng }
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

    // Replace + with space before decoding
    const raw = match[1].replace(/\+/g, ' ')
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}
