'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

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
      <div className="space-y-2">
        <p className="text-sm text-stone-700">
          Check your email — we sent a sign-in link to <strong>{email}</strong>.
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-xs text-stone-400 underline underline-offset-2"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {params.error && (
        <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
      )}

      <div className="space-y-2">
        <Button variant="outline" className="w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-stone-400">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-stone-700">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send sign-in link'}
        </Button>
      </form>
    </div>
  )
}
