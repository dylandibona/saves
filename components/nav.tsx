import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * Top-bar Nav has been replaced with the bottom tab bar + FAB.
 * This file is kept as a thin shim so any remaining imports don't break.
 * New surfaces should render <BottomNav /> instead.
 *
 * `signOut` server action is also re-exported through the bottom nav.
 */
export async function Nav() {
  return <BottomNav signOutAction={signOut} />
}
