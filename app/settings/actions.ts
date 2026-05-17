'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHouseholdId } from '@/lib/data/household'

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
