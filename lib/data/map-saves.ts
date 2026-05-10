import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

export type MapSave = {
  id: string
  title: string
  subtitle: string | null
  category: SaveCategory
  hero_image_url: string | null
  canonical_url: string | null
  location_address: string | null
  lat: number
  lng: number
}

export async function getMapSaves(householdId: string): Promise<MapSave[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('saves')
    .select('id, title, subtitle, category, hero_image_url, canonical_url, location_address, canonical_data')
    .eq('household_id', householdId)
    .eq('status', 'active')
    .not('canonical_data', 'is', null)

  if (error) throw error

  const result: MapSave[] = []
  for (const s of data ?? []) {
    const cd = s.canonical_data as { coords?: { lat: number; lng: number } } | null
    if (!cd?.coords || typeof cd.coords.lat !== 'number' || typeof cd.coords.lng !== 'number') continue

    result.push({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      category: s.category as SaveCategory,
      hero_image_url: s.hero_image_url,
      canonical_url: s.canonical_url,
      location_address: s.location_address,
      lat: cd.coords.lat,
      lng: cd.coords.lng,
    })
  }

  return result
}
