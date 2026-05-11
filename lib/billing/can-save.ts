import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'
import { PLANS } from './stripe'

/**
 * Authoritative check: is this user allowed to create another save right now?
 *
 * THE GATE IS INTENTIONALLY OPEN TODAY. This always returns `{ ok: true }`
 * until BILLING_ENFORCED=true is set in the environment. The hook exists so
 * every save path (form action, /api/share-save, any future capture surface)
 * already routes through the right check. Flipping the lock later is
 * one environment variable.
 *
 * Reasoning: retrofitting save-action gating across multiple entry points
 * later is painful and easy to forget. Doing it once now means future-Claude
 * doesn't have to think about it.
 */

export type CanSaveResult =
  | { ok: true }
  | { ok: false; reason: 'free_limit_reached'; current: number; limit: number }
  | { ok: false; reason: 'subscription_lapsed'; status: string }
  | { ok: false; reason: 'no_user' }

export async function userCanSave(userId: string | null | undefined): Promise<CanSaveResult> {
  if (!userId) return { ok: false, reason: 'no_user' }

  // The lock is OPEN. Everything below is the architecture for when we flip it.
  if (process.env.BILLING_ENFORCED !== 'true') return { ok: true }

  const supabase = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: user } = await supabase
    .from('users')
    .select('subscription_status, subscription_plan')
    .eq('id', userId)
    .single()

  if (!user) return { ok: false, reason: 'no_user' }

  // Active paid subscribers are always allowed.
  const status = user.subscription_status ?? 'free'
  if (status === 'active' || status === 'trialing') return { ok: true }

  // Lapsed payment — block until they resolve it.
  if (status === 'past_due' || status === 'canceled' || status === 'incomplete') {
    return { ok: false, reason: 'subscription_lapsed', status }
  }

  // Free tier — gate by lifetime save count.
  const { count } = await supabase
    .from('saves')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .eq('status', 'active')

  const current = count ?? 0
  const limit = PLANS.free.saveLimit

  if (current >= limit) {
    return { ok: false, reason: 'free_limit_reached', current, limit }
  }

  return { ok: true }
}
