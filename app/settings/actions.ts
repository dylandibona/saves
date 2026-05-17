'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/data/household'

/**
 * Sign the user out and bounce to /login. Used by the new Settings page
 * row that replaces the old top-nav sign-out chip.
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * Generate (or regenerate) the user's personal share token.
 * Uses the SECURITY DEFINER SQL function so the user can only ever
 * touch their own row (auth.uid() bound inside the function).
 */
export async function generateShareToken() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase.rpc('generate_share_token')

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return data as string
}

/**
 * Mint an "app" invite code — for inviting strangers to the beta.
 * Redeemed code grants the named plan as a 90-day comp trial.
 */
export async function createAppInviteCode(input: {
  notes?: string
  maxUses?: number
  expiresInDays?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
    : null

  const { data, error } = await supabase.rpc('create_invite_code', {
    p_kind:         'app',
    p_household_id: null as unknown as string,
    p_plan_grant:   'personal',
    p_role:         'member',
    p_max_uses:     input.maxUses ?? 1,
    p_expires_at:   expiresAt as unknown as string,
    p_notes:        input.notes ?? null as unknown as string,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return data
}

/**
 * Mint a household invite code — for inviting partner/family to share
 * your existing household. Redeemed code moves the new user into your
 * household. Requires owner role (enforced inside the SQL function).
 */
export async function createHouseholdInviteCode(input: {
  notes?: string
  maxUses?: number
  expiresInDays?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId()
  if (!householdId) throw new Error('no household')

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
    : null

  const { data, error } = await supabase.rpc('create_invite_code', {
    p_kind:         'household',
    p_household_id: householdId,
    p_plan_grant:   null as unknown as string,
    p_role:         'member',
    p_max_uses:     input.maxUses ?? 1,
    p_expires_at:   expiresAt as unknown as string,
    p_notes:        input.notes ?? null as unknown as string,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  return data
}

/**
 * Rename the household the current user owns. RLS limits the update
 * to households where the caller is an `owner` member (enforced below
 * via membership check + the household_id filter).
 */
export async function renameHousehold(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name cannot be empty')
  if (trimmed.length > 60) throw new Error('Name must be 60 characters or fewer')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const householdId = await getHouseholdId()
  if (!householdId) throw new Error('No household')

  // Owner-only rename. Members shouldn't be able to relabel the shared place.
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('household_id', householdId)
    .single()
  if (membership?.role !== 'owner') {
    throw new Error('Only the household owner can rename')
  }

  // Use `.select()` so the response carries back the updated rows. A
  // silent RLS denial (rows-matched=0) shows up as an empty array — we
  // surface that as an explicit error instead of returning a stale
  // success that masks the failure (the bug Dylan hit pre-RLS-fix).
  const { data: updated, error } = await supabase
    .from('households')
    .update({ name: trimmed })
    .eq('id', householdId)
    .select('id, name')
  if (error) throw new Error(error.message)
  if (!updated || updated.length === 0) {
    throw new Error('Rename was not saved — your account may not have owner permission on this household.')
  }
  revalidatePath('/settings')
  return trimmed
}

/**
 * Revoke (delete) an invite code. RLS limits to codes you created.
 */
export async function revokeInviteCode(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('invite_codes')
    .delete()
    .eq('code', code)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
