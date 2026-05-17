'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Redeem an invite code for the currently authenticated user.
 * Thin wrapper around the SQL function; throws on any error so the
 * caller can decide how to render the failure.
 */
export async function redeemInviteCode(code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('redeem_invite_code', {
    p_code: code,
  })
  if (error) throw new Error(error.message)
  return data
}
