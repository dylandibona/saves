'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/data/household'
import { enrichUrl } from '@/lib/enrichment/enrich'
import { persistHeroImage } from '@/lib/enrichment/image-persist'
import type { Database, Json } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Soft-delete a save by archiving it.
 *
 * We use status='archived' rather than a hard DELETE so:
 *   - The dedup logic (canonical_url match) won't resurrect it on next save
 *   - We can restore it later if requested
 *   - Captures and variations (FK-related rows) stay intact
 *
 * RLS already restricts updates to household members, so we just need to
 * check household ownership client-side for a clean redirect.
 */
export async function deleteSave(saveId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId()
  if (!householdId) redirect('/login')

  // Confirm the save belongs to this household before archiving
  const { data: save } = await supabase
    .from('saves')
    .select('id, household_id')
    .eq('id', saveId)
    .single()

  if (!save || save.household_id !== householdId) {
    redirect('/')
  }

  const { error } = await supabase
    .from('saves')
    .update({ status: 'archived' })
    .eq('id', saveId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath('/map')
  redirect('/')
}

/**
 * Re-run enrichment on an existing save and refresh its derived fields.
 *
 * Use cases:
 *   - Older saves whose titles have HTML-entity artifacts (decoder fix
 *     2026-05-17 covers new saves; existing rows need this to update)
 *   - Hero image rotted (Instagram CDN tokens expire)
 *   - Source page got better metadata after the original save
 *
 * Overwrites: title, subtitle, hero_image_url, hero_image_storage_path,
 * category (unless caller passes preserveCategory=true), canonical_data
 * (coords + extracted).
 *
 * Per Dylan's call: the client should prompt before invoking this so
 * hand-edited fields aren't silently overwritten. The Server Action
 * itself does not gate; the modal is the confirmation surface.
 */
export async function reEnrichSave(saveId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId()
  if (!householdId) redirect('/login')

  const { data: save } = await supabase
    .from('saves')
    .select('id, household_id, canonical_url')
    .eq('id', saveId)
    .single()

  if (!save || save.household_id !== householdId) {
    throw new Error('Save not found')
  }
  if (!save.canonical_url) {
    throw new Error('This save has no source URL to refresh from.')
  }

  const enriched = await enrichUrl(save.canonical_url)

  const canonicalData: Record<string, Json> = {}
  if (enriched.coords) canonicalData.coords = enriched.coords as unknown as Json
  if (enriched.extracted && Object.keys(enriched.extracted).length > 0) {
    canonicalData.extracted = enriched.extracted as unknown as Json
  }

  const baseUpdate = {
    title:           enriched.title ?? 'Untitled',
    subtitle:        enriched.subtitle,
    hero_image_url:  enriched.imageUrl,
    canonical_data:  canonicalData as Json,
  }
  const update = enriched.category
    ? { ...baseUpdate, category: enriched.category as SaveCategory }
    : baseUpdate

  const { error } = await supabase
    .from('saves')
    .update(update)
    .eq('id', saveId)
  if (error) throw new Error(error.message)

  // Persist the (possibly new) hero image into Storage too. Overwrites
  // the existing object at {saveId}.webp in place.
  if (enriched.imageUrl) {
    const persisted = await persistHeroImage(saveId, enriched.imageUrl)
    if (persisted.ok) {
      await supabase
        .from('saves')
        .update({ hero_image_storage_path: persisted.path })
        .eq('id', saveId)
    }
  }

  revalidatePath(`/saves/${saveId}`)
  revalidatePath('/')
  revalidatePath('/map')
}
