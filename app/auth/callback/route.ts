import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setCaptureEmail } from '@/lib/auth/set-capture-email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const invite = searchParams.get('invite')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        try {
          await setCaptureEmail(user.id, user.email)
        } catch {
          // Non-fatal — user can still use the app, capture_email can be set later
        }
      }

      // Redeem an invite code if one was threaded through the sign-in flow.
      // Household invites: moves user into inviter's household.
      // App invites: grants comp plan.
      // We do this AFTER the handle_new_user trigger has run, so the user
      // already has their solo household + self recommender to clean up.
      if (invite) {
        const { error: redeemError } = await supabase.rpc(
          'redeem_invite_code',
          { p_code: invite },
        )
        if (redeemError) {
          // Surface the failure without losing the session. User is signed in;
          // they can manually paste the code from /settings if they wish, or
          // request a fresh link from the inviter.
          const u = new URL('/login', origin)
          u.searchParams.set('error', 'invite_invalid')
          return NextResponse.redirect(u.toString())
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
