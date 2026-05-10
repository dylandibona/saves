'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/data/household'

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
