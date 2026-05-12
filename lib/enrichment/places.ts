/**
 * Google Places API (New) — text search + photo resolution.
 *
 * Why this exists: Google Maps share URLs (especially the shortened
 * `maps.app.goo.gl/...` form) come back from OG scraping with almost
 * nothing — Google's preview image is just a generic map snippet and
 * the title is "Google Maps." Places API gives us the real thing:
 * formatted name, address, primary photo, hours, phone, rating, types.
 *
 * The save IS the artifact, not a bookmark — so we want the actual
 * place data baked into the save, not a link.
 *
 * Used by:
 *   - lib/enrichment/enrich.ts  (one-shot path, used by /api/share-save)
 *   - app/api/enrich-stream/route.ts  (phased SSE for /add)
 *
 * Auth: GOOGLE_PLACES_API_KEY (server-only). Restrict to Places API (New)
 * in Cloud Console. Free tier covers personal use; per-call cost is
 * pennies — see CLAUDE.md §13.
 */

import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
// We always request the same fields; FieldMask is required by the API.
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.regularOpeningHours',
  'places.priceLevel',
  'places.photos',
].join(',')

// Photo target — long edge ~1200px gives us a good hero image without
// blowing through quota. Google charges per photo media call so we
// fetch only the first photo per place.
const PHOTO_MAX_HEIGHT = 1200

type PlacesApiPhoto = {
  name: string
  widthPx?: number
  heightPx?: number
}

type PlacesApiPlace = {
  id: string
  displayName?: { text?: string; languageCode?: string }
  formattedAddress?: string
  shortFormattedAddress?: string
  location?: { latitude: number; longitude: number }
  types?: string[]
  primaryType?: string
  primaryTypeDisplayName?: { text?: string }
  rating?: number
  userRatingCount?: number
  websiteUri?: string
  nationalPhoneNumber?: string
  regularOpeningHours?: {
    openNow?: boolean
    weekdayDescriptions?: string[]
  }
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE'
  photos?: PlacesApiPhoto[]
}

export type PlaceLookupResult = {
  id: string
  name: string
  address: string | null
  coords: { lat: number; lng: number } | null
  category: SaveCategory     // mapped from Places types
  photoUrl: string | null
  rating: number | null
  ratingCount: number | null
  website: string | null
  phone: string | null
  hours: string | null
  priceLevel: string | null
}

/**
 * Look up a place via Places API text search.
 *
 * @param query     Free-text query — usually the place name extracted from
 *                  the /maps/place/{name} URL segment. Required.
 * @param coords    Optional location bias to disambiguate common names
 *                  ("Joe's Coffee" matches the one near these coordinates).
 *                  500m radius is tight enough to pick the actual pinned
 *                  spot when coords come from the URL.
 *
 * Returns null when no key is configured, the search returns zero
 * results, or the network call fails. Callers should fall back to
 * their existing OG/Claude path in that case.
 */
export async function lookupPlace(
  query: string,
  coords: { lat: number; lng: number } | null
): Promise<PlaceLookupResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null
  if (!query.trim()) return null

  try {
    const body: Record<string, unknown> = {
      textQuery: query.trim(),
      // Tune for the share-from-Maps case: the user pinned a specific
      // place, so we don't want a long list of restaurants 50 miles
      // away. Bias to a tight radius when we have coords.
      maxResultCount: 3,
    }
    if (coords) {
      body.locationBias = {
        circle: {
          center: { latitude: coords.lat, longitude: coords.lng },
          radius: 500,
        },
      }
    }

    const res = await fetch(TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      console.warn('[places] searchText non-ok', {
        status: res.status,
        body: await res.text().catch(() => '<no-body>').then(t => t.slice(0, 300)),
      })
      return null
    }

    const data = await res.json() as { places?: PlacesApiPlace[] }
    const place = data.places?.[0]
    if (!place) return null

    // Resolve the first photo to a final CDN URL (skipHttpRedirect
    // returns JSON with photoUri instead of a 302). Fire and forget —
    // if photo resolution fails, we still return the place data.
    let photoUrl: string | null = null
    const photo = place.photos?.[0]
    if (photo?.name) {
      photoUrl = await resolvePhotoUrl(photo.name, apiKey)
    }

    return {
      id: place.id,
      name: place.displayName?.text ?? query,
      address: place.formattedAddress ?? place.shortFormattedAddress ?? null,
      coords: place.location
        ? { lat: place.location.latitude, lng: place.location.longitude }
        : coords,
      category: typesToCategory(place.types, place.primaryType),
      photoUrl,
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      website: place.websiteUri ?? null,
      phone: place.nationalPhoneNumber ?? null,
      hours: summarizeHours(place.regularOpeningHours?.weekdayDescriptions),
      priceLevel: priceLevelLabel(place.priceLevel),
    }
  } catch (err) {
    console.warn('[places] lookup failed', {
      query,
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Photos in Places API (New) are returned as resource names like
 * `places/<id>/photos/<photo-id>` and must be fetched via a separate
 * media endpoint. With `skipHttpRedirect=true` we get back JSON with
 * the final googleusercontent URL, which is what we store on the save.
 *
 * That CDN URL has no API key in it — it's safe to render with
 * <Image src=...> on the client.
 */
async function resolvePhotoUrl(photoName: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${PHOTO_MAX_HEIGHT}&skipHttpRedirect=true&key=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json() as { photoUri?: string }
    return data.photoUri ?? null
  } catch {
    return null
  }
}

/**
 * Map a Places type set to one of our save categories.
 * Places returns many types — we look for the strongest signal:
 *   lodging-family   → hotel
 *   food/drink       → restaurant
 *   event-ish        → event (movie_theater, stadium, concert_hall when
 *                              the URL is shared as a destination)
 *   everything else  → place
 */
function typesToCategory(types: string[] | undefined, primary: string | undefined): SaveCategory {
  const all = new Set<string>([
    ...(primary ? [primary] : []),
    ...(types ?? []),
  ])

  const hasAny = (...keys: string[]) => keys.some(k => all.has(k))

  if (hasAny(
    'lodging', 'hotel', 'motel', 'resort_hotel', 'bed_and_breakfast',
    'extended_stay_hotel', 'hostel', 'inn',
  )) return 'hotel'

  if (hasAny(
    'restaurant', 'cafe', 'bar', 'bakery', 'food', 'meal_takeaway',
    'meal_delivery', 'fine_dining_restaurant', 'casual_dining_restaurant',
    'fast_food_restaurant', 'sushi_restaurant', 'pizza_restaurant',
    'coffee_shop', 'ice_cream_shop', 'wine_bar', 'pub', 'brewery',
  )) return 'restaurant'

  if (hasAny(
    'movie_theater', 'stadium', 'concert_hall', 'opera_house',
    'amusement_park', 'night_club', 'performing_arts_theater',
  )) return 'event'

  return 'place'
}

/**
 * Condense Google's verbose `weekdayDescriptions` (one string per weekday)
 * down to the single most useful summary line for the save UI. We try to
 * detect "open 24 hours" or a uniform schedule; otherwise return today's
 * line so the user sees something actionable on the detail page.
 */
function summarizeHours(weekdays: string[] | undefined): string | null {
  if (!weekdays || weekdays.length === 0) return null

  // "Monday: Open 24 hours" repeated 7×
  if (weekdays.every(w => /open 24 hours/i.test(w))) return 'Open 24 hours'

  // Today's line, if available
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayLine = weekdays.find(w => w.startsWith(today + ':'))
  if (todayLine) {
    // Strip the "Monday: " prefix for a more compact display.
    return `${today}: ${todayLine.split(':').slice(1).join(':').trim()}`
  }

  // Fallback: first line
  return weekdays[0]
}

function priceLevelLabel(level: PlacesApiPlace['priceLevel']): string | null {
  switch (level) {
    case 'PRICE_LEVEL_FREE':           return 'Free'
    case 'PRICE_LEVEL_INEXPENSIVE':    return '$'
    case 'PRICE_LEVEL_MODERATE':       return '$$'
    case 'PRICE_LEVEL_EXPENSIVE':      return '$$$'
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$'
    default:                           return null
  }
}
