import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ── PWA assets — short-circuit, no auth, no Supabase ─────────────────────
  if (
    path === '/manifest.json' ||
    path === '/manifest.webmanifest' ||
    path === '/icon.svg' ||
    path === '/apple-touch-icon.png' ||
    path === '/favicon-32.png' ||
    path.startsWith('/icon-')
  ) {
    return NextResponse.next()
  }

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth')

  // ── Diagnostic logging — every request, before any work ──────────────────
  console.log('[mw]', path, {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[mw] missing env', { path })
    if (isAuthRoute) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'config')
    return NextResponse.redirect(url)
  }

  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      // Not necessarily fatal — could just be no session. Log and treat as
      // unauthenticated, don't crash.
      console.warn('[mw] auth.getUser() error', { path, err: authError.message })
    }

    if (!user && !isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const next = request.nextUrl.pathname + request.nextUrl.search
      if (next !== '/' && next !== '/login') {
        url.searchParams.set('next', next)
      }
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (err) {
    // Last resort — log everything we can. Better a redirect than a 500.
    console.error('[mw] crash', {
      path,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    if (isAuthRoute) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'middleware')
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
