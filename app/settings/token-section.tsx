'use client'

import { useState, useTransition } from 'react'
import { generateShareToken } from './actions'

export function TokenSection({ initialToken }: { initialToken: string | null }) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  function generate() {
    startTransition(async () => {
      const t = await generateShareToken()
      setToken(t)
      setShowRegenConfirm(false)
    })
  }

  function copy() {
    if (!token) return
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1.5">
        <p className="font-mono text-[10px] tracking-widest text-white/30">Share Token</p>
        <p className="text-[13px] text-white/55 leading-relaxed max-w-prose">
          A personal token your iOS Shortcut uses to save URLs in the background.
          Treat it like a password — anyone with it can save to your account.
        </p>
      </header>

      {!token ? (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="chip chip-off font-mono text-[11px] px-4 py-2 rounded-full hover:!text-white"
        >
          {pending ? 'Generating…' : 'Generate token'}
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className="font-mono text-[11px] px-4 py-3 rounded-xl break-all leading-relaxed"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {token}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={copy}
              className="chip chip-off font-mono text-[11px] px-4 py-2 rounded-full hover:!text-white inline-flex items-center gap-1.5"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              {copied ? 'Copied' : 'Copy'}
            </button>

            {showRegenConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowRegenConfirm(false)}
                  className="font-mono text-[11px] px-3 py-2 rounded-full text-white/55 hover:text-white/85 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={generate}
                  disabled={pending}
                  className="font-mono text-[11px] px-4 py-2 rounded-full transition-colors"
                  style={{
                    background: 'linear-gradient(180deg, rgba(244,63,94,0.95) 0%, rgba(190,18,60,0.92) 100%)',
                    border: '1px solid rgba(244,63,94,0.95)',
                    color: 'oklch(0.10 0.09 262)',
                    boxShadow: '0 2px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.32)',
                  }}
                >
                  {pending ? 'Regenerating…' : 'Yes, regenerate'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="font-mono text-[11px] px-3 py-2 rounded-full text-white/35 hover:text-rose-300/80 transition-colors"
              >
                Regenerate
              </button>
            )}
          </div>

          {showRegenConfirm && (
            <p className="font-mono text-[10px] text-rose-300/70">
              Regenerating will break any Shortcut still using the old token.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
