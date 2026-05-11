'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>
}) {
  const params = use(searchParams)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Build the auth callback URL with `next` preserved so the user lands
  // back where they came from (e.g. /share/... or /add?url=...).
  const callbackUrl = (() => {
    if (typeof window === 'undefined') return '/auth/callback'
    const u = new URL('/auth/callback', window.location.origin)
    if (params.next) u.searchParams.set('next', params.next)
    return u.toString()
  })()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    })
    setSent(true)
    setLoading(false)
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="text-[15px] text-white/85 leading-relaxed">
          Check your email. We sent a sign-in link to{' '}
          <strong className="text-white">{email}</strong>.
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-[13px] text-white/45 hover:text-white/75 transition-colors underline underline-offset-4 decoration-white/20"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {params.error && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.22)',
          }}
        >
          <p className="text-[13px] text-rose-300/90">Sign-in didn&rsquo;t take. Try again.</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full h-12 rounded-xl text-[14px] font-medium text-white/95 transition-all duration-150 inline-flex items-center justify-center gap-2 hover:bg-white/[0.04]"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <GoogleGlyph />
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-[11px] font-mono tracking-widest text-white/30 uppercase">or</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>

      <form onSubmit={handleMagicLink} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-[11px] font-mono tracking-widest text-white/40 uppercase block"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full h-12 rounded-xl px-4 text-[15px] text-white/95 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl text-[14px] font-semibold transition-all duration-150 disabled:opacity-60"
          style={{
            background: 'oklch(0.96 0.005 80)',
            color: 'oklch(0.10 0.005 240)',
          }}
        >
          {loading ? 'Sending…' : 'Send sign-in link'}
        </button>
      </form>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M5.27 9.76A7.08 7.08 0 0 1 12 4.74c1.94 0 3.7.69 5.07 1.83l3.27-3.27A11.93 11.93 0 0 0 12 0 11.99 11.99 0 0 0 1.32 6.62l3.95 3.14z"
      />
      <path
        fill="#34A853"
        d="M16.04 18.01A7.34 7.34 0 0 1 12 19.26a7.08 7.08 0 0 1-6.66-4.83l-3.96 3.07A11.99 11.99 0 0 0 12 24c2.93 0 5.74-1.04 7.85-2.99l-3.81-2.96z"
      />
      <path
        fill="#4A90E2"
        d="M19.85 21.01c2.19-2.04 3.61-5.07 3.61-9.01 0-.71-.11-1.47-.27-2.18H12v4.55h6.43c-.31 1.55-1.18 2.74-2.39 3.68l3.81 2.96z"
      />
      <path
        fill="#FBBC05"
        d="M5.34 14.43a7.07 7.07 0 0 1-.38-2.26c0-.79.15-1.55.41-2.26L1.42 6.78A11.97 11.97 0 0 0 0 12.18c0 1.94.46 3.77 1.28 5.39l4.06-3.14z"
      />
    </svg>
  )
}
