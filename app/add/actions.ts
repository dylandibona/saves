'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/data/household'
import { userCanSave } from '@/lib/billing/can-save'
import type { Database, Json } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']
type SaveVisibility = Database['public']['Enums']['save_visibility']

export async function addSave(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId()
  if (!householdId) redirect('/login')

  // Billing gate — returns ok:true today; one env-var flip enforces tiers later.
  const gate = await userCanSave(user.id)
  if (!gate.ok) {
    redirect(`/billing?reason=${gate.reason}`)
  }

  const url = (formData.get('url') as string | null)?.trim() || null
  const category = formData.get('category') as SaveCategory
  const title = (formData.get('title') as string).trim()
  const note = (formData.get('note') as string | null)?.trim() || null

  // Visibility — radio button defaults to 'household' if missing
  const visibilityRaw = (formData.get('visibility') as string | null) ?? 'household'
  const visibility: SaveVisibility =
    visibilityRaw === 'private' ? 'private' : 'household'

  // Rich enrichment fields (forwarded from add-form via hidden inputs)
  const subtitle = (formData.get('subtitle') as string | null)?.trim() || null
  const heroImageUrl = (formData.get('hero_image_url') as string | null)?.trim() || null
  const locationAddress = (formData.get('location_address') as string | null)?.trim() || null

  const coordsRaw = (formData.get('coords') as string | null)?.trim() || null
  const coords = (() => {
    if (!coordsRaw) return null
    try {
      const parsed = JSON.parse(coordsRaw) as { lat: number; lng: number }
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed
      return null
    } catch { return null }
  })()

  // Per-category structured data extracted by enrichment (ingredients,
  // exercises, hours, summary, etc). Stored in canonical_data.extracted.
  const extractedRaw = (formData.get('extracted') as string | null)?.trim() || null
  const extracted = (() => {
    if (!extractedRaw) return null
    try {
      const parsed = JSON.parse(extractedRaw)
      return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0
        ? parsed
        : null
    } catch { return null }
  })()

  // Compose canonical_data
  const canonicalData: Record<string, Json> = {}
  if (coords) canonicalData.coords = coords as unknown as Json
  if (extracted) canonicalData.extracted = extracted as unknown as Json

  // Get the user's self recommender
  const { data: selfRecommender } = await supabase
    .from('recommenders')
    .select('id')
    .eq('household_id', householdId)
    .eq('kind', 'self')
    .single()

  // Check for existing save with same canonical_url — dedupe by adding capture
  if (url) {
    const { data: existing } = await supabase
      .from('saves')
      .select('id')
      .eq('household_id', householdId)
      .eq('canonical_url', url)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
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

  // Create new save with all enrichment data preserved
  const { data: newSave, error } = await supabase
    .from('saves')
    .insert({
      household_id: householdId,
      category,
      title,
      subtitle,
      canonical_url: url,
      hero_image_url: heroImageUrl,
      location_address: locationAddress,
      visibility,
      created_by: user.id,
      ...(Object.keys(canonicalData).length > 0 ? { canonical_data: canonicalData } : {}),
    })
    .select('id')
    .single()

  if (error || !newSave) throw new Error(error?.message ?? 'Failed to create save')
  const saveId = newSave.id

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
