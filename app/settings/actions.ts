'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
