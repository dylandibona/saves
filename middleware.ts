import { NextResponse, type NextRequest } from 'next/server'

/**
 * DIAGNOSTIC MIDDLEWARE — temporarily Supabase-free.
 *
 * If the previous middleware was failing because @supabase/ssr was crashing
 * during Edge worker initialization, this version will succeed and prove it.
 *
 * Behavior: every page renders unauthenticated; the layout/page code can
 * still call Supabase server-side with no problem. Auth-required pages will
 * see no user. We re-add the auth-redirect logic ASAP once we know the
 * import is the culprit.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  console.log('[mw-noop]', path)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
