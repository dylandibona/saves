import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // PWA assets must be readable without auth so browsers can register
  // the manifest and the OS share sheet can find the icons.
  const isPwaAsset =
    path === '/manifest.json' ||
    path === '/manifest.webmanifest' ||
    path.startsWith('/icon-') ||
    path === '/icon.svg' ||
    path === '/apple-touch-icon.png' ||
    path === '/favicon-32.png'

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth')

  // Short-circuit PWA assets before touching Supabase — keeps them fast and
  // makes them work even if Supabase config is broken.
  if (isPwaAsset) {
    return NextResponse.next({ request })
  }

  // Hard-fail loudly if env vars are missing — much better than a generic
  // MIDDLEWARE_INVOCATION_FAILED with no stack trace.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[middleware] Missing Supabase env vars', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      path,
    })
    // For auth routes, let them through so the login page can at least render
    // an error. For everything else, bounce to /login.
    if (isAuthRoute) return NextResponse.next({ request })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'config')
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
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

    // Refresh session — must call getUser() not getSession() per Supabase SSR docs
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && !isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      // Preserve where they came from so post-login we send them back.
      // Critical for /share — Instagram → share → Saves while logged out
      // would otherwise drop the URL.
      const next = request.nextUrl.pathname + request.nextUrl.search
      if (next !== '/' && next !== '/login') {
        url.searchParams.set('next', next)
      }
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (err) {
    // Surface the real error in Vercel runtime logs instead of a generic
    // MIDDLEWARE_INVOCATION_FAILED.
    console.error('[middleware] Supabase auth error', { path, err: String(err) })
    if (isAuthRoute) return NextResponse.next({ request })
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
