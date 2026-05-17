'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    message?: string
    next?: string
    invite?: string
  }>
}) {
  const params = use(searchParams)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  // Code paste field — supports app codes for stranger sign-up. If the URL
  // already carries an invite (from a household /join/<code> redirect), we
  // use that and don't show the field.
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const inviteFromUrl = params.invite?.trim().toUpperCase() || null
  const effectiveInvite = inviteFromUrl ?? (code.trim().toUpperCase() || null)

  // Build the auth callback URL with `next` + `invite` preserved.
  const callbackUrl = (() => {
    if (typeof window === 'undefined') return '/auth/callback'
    const u = new URL('/auth/callback', window.location.origin)
    if (params.next) u.searchParams.set('next', params.next)
    if (effectiveInvite) u.searchParams.set('invite', effectiveInvite)
    return u.toString()
  })()

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!emailValid || loading) return
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email: email.trim(),
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

  // Magic-link confirmation screen — replaces the form once the email
  // has gone out so the user has a single, clear next action.
  if (sent) {
    return (
      <div
        className="rounded-[4px] px-4 py-4"
        style={{
          background: 'var(--color-surface)',
          border: '0.5px solid var(--color-hairline)',
        }}
      >
        <p
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-mute)',
          }}
        >
          Sent
        </p>
        <p
          style={{
            marginTop: 6,
            fontSize: 15,
            color: 'var(--color-paper)',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
          }}
        >
          Check your email. We sent a sign-in link to{' '}
          <strong style={{ fontWeight: 500 }}>{email.trim()}</strong>.
        </p>
        <button
          onClick={() => setSent(false)}
          className="font-mono"
          style={{
            marginTop: 12,
            background: 'transparent',
            border: 0,
            padding: 0,
            color: 'var(--color-mute)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {params.error && (
        <div
          className="rounded-[4px] px-4 py-3"
          style={{
            background: 'rgba(244,63,94,0.08)',
            border: '0.5px solid rgba(244,63,94,0.32)',
          }}
        >
          <p style={{ fontSize: 13, color: '#fb7185', lineHeight: 1.5 }}>
            {params.error === 'invite_invalid'
              ? 'That invite is not valid or has been used. Sign in to continue with a fresh code.'
              : 'Sign-in didn’t take. Try again.'}
          </p>
        </div>
      )}

      {inviteFromUrl && (
        <div
          className="rounded-[4px] px-4 py-3"
          style={{
            background: 'color-mix(in oklab, var(--color-cat-place) 8%, transparent)',
            border: '0.5px solid color-mix(in oklab, var(--color-cat-place) 32%, transparent)',
          }}
        >
          <p
            className="font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--color-cat-place)',
              marginBottom: 4,
            }}
          >
            Invite ready
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-paper)', lineHeight: 1.5 }}>
            Sign in and we&rsquo;ll apply your invite.
          </p>
        </div>
      )}

      {/* Single email input — feeds both magic link (primary action below)
          and provides context for the Google fallback. Submit fires
          magic link; Google button is independent. */}
      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          id="email"
          type="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full h-12 px-4 transition-all duration-150"
          style={{
            borderRadius: 4,
            background: 'var(--color-surface)',
            border: '0.5px solid var(--color-hairline)',
            color: 'var(--color-paper)',
            fontSize: 15,
            letterSpacing: '-0.005em',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(244,243,239,0.30)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-hairline)'
          }}
        />

        {/* Two paths, side by side at desktop, stacked on mobile.
            Magic link is the primary action (cream button) since it's
            the universal path; Google is the convenience for people who
            have it. */}
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={!emailValid || loading}
            className="w-full h-12 transition-all duration-150 disabled:opacity-50"
            style={{
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 500,
              background:
                'linear-gradient(180deg, var(--color-bone) 0%, oklch(0.92 0.01 80) 100%)',
              color: 'var(--color-bg)',
              border: 0,
              letterSpacing: '-0.005em',
              cursor: emailValid && !loading ? 'pointer' : 'default',
            }}
          >
            {loading ? 'Sending…' : 'Email me a sign-in link'}
          </button>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full h-12 inline-flex items-center justify-center gap-2 transition-all duration-150"
            style={{
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 500,
              background: 'var(--color-surface)',
              border: '0.5px solid var(--color-hairline)',
              color: 'var(--color-paper)',
              letterSpacing: '-0.005em',
              cursor: 'pointer',
            }}
          >
            <GoogleGlyph />
            Continue with Google
          </button>
        </div>
      </form>

      {/* Beta code disclosure — collapsed by default so the primary auth
          flow is unobstructed. Only relevant for new users with a code. */}
      {!inviteFromUrl && (
        <div className="pt-2">
          {!showCode ? (
            <button
              type="button"
              onClick={() => setShowCode(true)}
              className="font-mono"
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                color: 'var(--color-mute)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Have a beta code?
            </button>
          ) : (
            <div className="space-y-2">
              <input
                id="invite-code"
                type="text"
                placeholder="ABCDEFGHJK"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                autoComplete="off"
                maxLength={20}
                autoFocus
                className="w-full h-11 px-4 transition-all duration-150"
                style={{
                  borderRadius: 4,
                  background: 'var(--color-surface)',
                  border: '0.5px solid var(--color-hairline)',
                  color: 'var(--color-paper)',
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                  fontSize: 14,
                  letterSpacing: '0.18em',
                  outline: 'none',
                }}
              />
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--color-faint)',
                  lineHeight: 1.5,
                  letterSpacing: '-0.005em',
                }}
              >
                We&rsquo;ll apply it after sign-in.
              </p>
            </div>
          )}
        </div>
      )}
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
