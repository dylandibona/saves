'use client'

import { useState, useTransition } from 'react'
import {
  createAppInviteCode,
  createHouseholdInviteCode,
  revokeInviteCode,
} from './actions'

type InviteRow = {
  code: string
  kind: 'app' | 'household'
  uses_count: number
  max_uses: number
  expires_at: string | null
  notes: string | null
  created_at: string
}

type Props = {
  initialCodes: InviteRow[]
  origin: string
}

export function InvitesSection({ initialCodes, origin }: Props) {
  const [codes, setCodes] = useState<InviteRow[]>(initialCodes)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(c => (c === key ? null : c)), 1400)
  }

  function mint(kind: 'app' | 'household') {
    setError(null)
    startTransition(async () => {
      try {
        const fn = kind === 'app' ? createAppInviteCode : createHouseholdInviteCode
        const row = await fn({ maxUses: 1, expiresInDays: 30 })
        // RPC returns the full row payload; trust the shape we built it from.
        setCodes(prev => [row as InviteRow, ...prev])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create code')
      }
    })
  }

  function revoke(code: string) {
    setError(null)
    startTransition(async () => {
      try {
        await revokeInviteCode(code)
        setCodes(prev => prev.filter(c => c.code !== code))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to revoke')
      }
    })
  }

  const appCodes = codes.filter(c => c.kind === 'app')
  const householdCodes = codes.filter(c => c.kind === 'household')

  return (
    <section className="space-y-6">
      <header className="space-y-1.5">
        <p className="font-mono text-[10px] tracking-widest text-white/30">Invites</p>
        <p className="text-[13px] text-white/55 leading-relaxed max-w-prose">
          Two kinds of invitations. A household link shares your library with
          a partner or family member, joining them to your household so you
          both see the same finds. An app code lets a friend create their own
          account during the private beta.
        </p>
      </header>

      {error && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'rgba(255,100,100,0.06)',
            border: '1px solid rgba(255,100,100,0.18)',
          }}
        >
          <p className="font-mono text-[11px] text-white/70">{error}</p>
        </div>
      )}

      {/* Household invite */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[18px] text-white/85">
            Share <span className="font-serif italic font-normal">your household</span>
          </h3>
          <button
            type="button"
            onClick={() => mint('household')}
            disabled={pending}
            className="font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            New link
          </button>
        </div>
        <p className="text-[13px] text-white/45 leading-relaxed">
          Send this to a partner or family member. They sign up via the link
          and land directly in your shared library. Single-use, expires in 30 days.
        </p>
        {householdCodes.length === 0 ? (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px dashed rgba(255,255,255,0.10)',
            }}
          >
            <p className="font-mono text-[11px] text-white/40">No active links.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {householdCodes.map(c => {
              const link = `${origin}/join/${c.code}`
              const used = c.uses_count >= c.max_uses
              return (
                <li
                  key={c.code}
                  className="rounded-xl px-3.5 py-3 space-y-2"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-[12px] text-white/85 break-all">
                      {link}
                    </code>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copy(link, `link-${c.code}`)}
                        className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{
                          background: 'rgba(0,229,160,0.08)',
                          border: '1px solid rgba(0,229,160,0.22)',
                          color: '#00e5a0',
                        }}
                      >
                        {copied === `link-${c.code}` ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(c.code)}
                        disabled={pending}
                        className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          color: 'rgba(255,255,255,0.55)',
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-white/35">
                    {used ? 'Used' : `${c.max_uses - c.uses_count} use${c.max_uses - c.uses_count === 1 ? '' : 's'} left`}
                    {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* App invite */}
      <div className="space-y-3 pt-4 border-t border-white/8">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[18px] text-white/85">
            Invite <span className="font-serif italic font-normal">a friend</span>
          </h3>
          <button
            type="button"
            onClick={() => mint('app')}
            disabled={pending}
            className="font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            New code
          </button>
        </div>
        <p className="text-[13px] text-white/45 leading-relaxed">
          A short code your friend pastes at sign-in to create their own
          Finds account during the private beta. Comes with 90 days free.
        </p>
        {appCodes.length === 0 ? (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px dashed rgba(255,255,255,0.10)',
            }}
          >
            <p className="font-mono text-[11px] text-white/40">No active codes.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {appCodes.map(c => {
              const used = c.uses_count >= c.max_uses
              return (
                <li
                  key={c.code}
                  className="rounded-xl px-3.5 py-3 space-y-2"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-[15px] text-white/90 tracking-[0.18em]">
                      {c.code}
                    </code>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copy(c.code, `code-${c.code}`)}
                        className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{
                          background: 'rgba(0,229,160,0.08)',
                          border: '1px solid rgba(0,229,160,0.22)',
                          color: '#00e5a0',
                        }}
                      >
                        {copied === `code-${c.code}` ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(c.code)}
                        disabled={pending}
                        className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          color: 'rgba(255,255,255,0.55)',
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-white/35">
                    {used ? 'Used' : `${c.max_uses - c.uses_count} use${c.max_uses - c.uses_count === 1 ? '' : 's'} left`}
                    {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
