'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/data/household'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

export async function addSave(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId()
  if (!householdId) redirect('/login')

  const url = (formData.get('url') as string | null)?.trim() || null
  const category = formData.get('category') as SaveCategory
  const title = (formData.get('title') as string).trim()
  const note = (formData.get('note') as string | null)?.trim() || null
  const coordsRaw = (formData.get('coords') as string | null)?.trim() || null
  const coords = (() => {
    if (!coordsRaw) return null
    try {
      const parsed = JSON.parse(coordsRaw) as { lat: number; lng: number }
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed
      return null
    } catch { return null }
  })()

  // Get the user's self recommender
  const { data: selfRecommender } = await supabase
    .from('recommenders')
    .select('id')
    .eq('household_id', householdId)
    .eq('kind', 'self')
    .single()

  let saveId: string

  // Check for existing save with same canonical_url
  if (url) {
    const { data: existing } = await supabase
      .from('saves')
      .select('id')
      .eq('household_id', householdId)
      .eq('canonical_url', url)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      // Add a new capture to the existing save
      await supabase.from('captures').insert({
        save_id: existing.id,
        user_id: user.id,
        recommender_id: selfRecommender?.id ?? null,
        note,
        capture_method: 'manual',
        captured_at: new Date().toISOString(),
      })
      redirect(`/saves/${existing.id}`)
    }
  }

  // Create new save
  const { data: newSave, error } = await supabase
    .from('saves')
    .insert({
      household_id: householdId,
      category,
      title,
      canonical_url: url,
      ...(coords ? { canonical_data: { coords } } : {}),
    })
    .select('id')
    .single()

  if (error || !newSave) throw new Error(error?.message ?? 'Failed to create save')
  saveId = newSave.id

  // Create first capture
  await supabase.from('captures').insert({
    save_id: saveId,
    user_id: user.id,
    recommender_id: selfRecommender?.id ?? null,
    note,
    capture_method: 'manual',
    captured_at: new Date().toISOString(),
  })

  redirect(`/saves/${saveId}`)
}
