import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side auth gate. Call at the top of any protected Server Component
 * or Server Action.
 *
 * If unauthenticated, redirects to /login with a `next` param so the user
 * lands back where they came from after signing in.
 *
 * Returns the user when authenticated.
 *
 * Replaces the middleware-based auth gate. Middleware was crashing on
 * Vercel with __dirname not defined; per-page checks are slightly slower
 * (extra Supabase round-trip on every request) but bulletproof.
 */
export async function requireUser(redirectPath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = encodeURIComponent(redirectPath)
    redirect(`/login?next=${next}`)
  }
  return user
}
