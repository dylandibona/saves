import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setCaptureEmail } from '@/lib/auth/set-capture-email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email) {
        // Set capture_email if not already assigned (idempotent)
        try {
          await setCaptureEmail(user.id, user.email)
        } catch {
          // Non-fatal — user can still use the app, capture_email can be set later
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
