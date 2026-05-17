import { createClient } from '@/lib/supabase/server'

export type SaveWithRecommenders = Awaited<ReturnType<typeof getFeedSaves>>[number]

export async function getFeedSaves(householdId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('saves')
    .select(`
      id, title, subtitle, description, category, hero_image_url, hero_image_storage_path,
      capture_count, last_captured_at, status, visibility, created_by,
      captures(
        user_id,
        users(id, email, display_name, capture_color),
        recommenders(id, display_name, color, kind)
      )
    `)
    .eq('household_id', householdId)
    .eq('status', 'active')
    .order('last_captured_at', { ascending: false })

  if (error) throw error

  // Apply capture_count >= 2 recency boost in-memory
  const boostedMs = 2 * 24 * 60 * 60 * 1000 // 2 days
  return (data ?? []).sort((a, b) => {
    const tsA = new Date(a.last_captured_at ?? 0).getTime() + (a.capture_count >= 2 ? boostedMs : 0)
    const tsB = new Date(b.last_captured_at ?? 0).getTime() + (b.capture_count >= 2 ? boostedMs : 0)
    return tsB - tsA
  })
}

export async function getSaveById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('saves')
    .select(`
      *,
      captures(
        id, note, capture_method, captured_at, user_id,
        users(id, email, display_name, capture_color),
        recommenders(id, display_name, handle, platform, color, kind),
        sources(id, display_name, domain, icon_url)
      ),
      variations(id, label, delta, notes)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
