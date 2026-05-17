'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Stratum v2 Dock — closed by default, opens to reveal three nav icons
 * (Library / Map / Settings) and a "+ Keep" pill that navigates to /add.
 *
 * Anatomy:
 *   • Bottom-right glass capsule, content-width (not full bleed).
 *   • Closed: single 40×40 cream "+" button.
 *   • Open: 3 nav icons slide in to the left via max-width transition,
 *     then the "+" grows to show its "Keep" label.
 *   • Scroll-down past 60px fades to 55% opacity; scroll-up restores.
 *   • Tap outside (transparent backdrop) collapses.
 *
 * Hidden on:
 *   • /login + /auth/* + /join/* — no chrome on auth surfaces
 *   • /add               — Capture's Keep button owns this spot
 *   • /saves/[id]        — Detail's Open original / Options bar owns it
 *
 * Visible on /map — the Stratum v2 map design includes the dock as the
 * primary nav affordance; the map card floats above it.
 */

const HIDDEN_ON: Array<(p: string) => boolean> = [
  (p) => p.startsWith('/login'),
  (p) => p.startsWith('/auth'),
  (p) => p.startsWith('/join'),
  (p) => p.startsWith('/add'),
  (p) => p.startsWith('/saves/'),
]

export function Dock() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [faded, setFaded] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastScrollY.current
      if (Math.abs(dy) > 4) {
        setFaded(dy > 0 && y > 60)
        lastScrollY.current = y
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reset open state when route changes — fresh page, dock starts closed.
  useEffect(() => { setOpen(false) }, [pathname])

  if (HIDDEN_ON.some(p => p(pathname))) return null

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30"
          style={{ background: 'transparent' }}
          aria-hidden
        />
      )}
      <div
        className="fixed z-40"
        style={{
          right: 14,
          bottom: `calc(env(safe-area-inset-bottom, 0px) + 16px)`,
          opacity: faded && !open ? 0.55 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        <div
          className="inline-flex items-stretch"
          style={{
            gap: 2,
            background: 'var(--color-surface-2)',
            backdropFilter: 'blur(28px) saturate(170%)',
            WebkitBackdropFilter: 'blur(28px) saturate(170%)',
            border: '0.5px solid rgba(244,243,239,0.16)',
            borderRadius: 4,
            padding: 4,
            boxShadow: '0 16px 36px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
            transition: 'all 0.32s var(--ease-strat)',
          }}
        >
          {/* Nav icons — slide in/out via max-width. */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              overflow: 'hidden',
              maxWidth: open ? 180 : 0,
              opacity: open ? 1 : 0,
              transition: 'max-width 0.32s var(--ease-strat), opacity 0.22s ease',
            }}
          >
            <NavIcon kind="library" href="/" onNav={() => setOpen(false)} />
            <NavIcon kind="map"     href="/map" onNav={() => setOpen(false)} />
            <NavIcon kind="settings" href="/settings" onNav={() => setOpen(false)} />
          </div>

          <button
            type="button"
            onClick={() => {
              if (!open) { setOpen(true); return }
              router.push('/add')
            }}
            aria-label={open ? 'Keep a find' : 'Open dock'}
            style={{
              marginLeft: open ? 4 : 0,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: open ? '0 16px 0 12px' : 0,
              width: open ? 'auto' : 40,
              height: 40,
              borderRadius: 4,
              background:
                'linear-gradient(180deg, var(--color-bone) 0%, oklch(0.92 0.01 80) 100%)',
              color: 'var(--color-bg)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 13.5,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              boxShadow:
                '0 4px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.2)',
              transition: 'all 0.32s var(--ease-strat)',
              justifyContent: 'center',
              border: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 2.5v9M2.5 7h9" stroke="var(--color-bg)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {open && (
              <span
                style={{
                  animation: 'dock-label-in 0.22s ease-out both',
                  whiteSpace: 'nowrap',
                }}
              >
                Keep
              </span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dock-label-in {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

function NavIcon({
  kind,
  href,
  onNav,
}: {
  kind: 'library' | 'map' | 'settings'
  href: string
  onNav: () => void
}) {
  const c = 'rgba(244,243,239,0.82)'
  const icon =
    kind === 'library' ? (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3" y="4"    width="14" height="2.5" rx="0.5" stroke={c} strokeWidth="1.2" />
        <rect x="3" y="8.75" width="14" height="2.5" rx="0.5" stroke={c} strokeWidth="1.2" />
        <rect x="3" y="13.5" width="14" height="2.5" rx="0.5" stroke={c} strokeWidth="1.2" />
      </svg>
    ) : kind === 'map' ? (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 17.5c-3.5-4-5.5-6.6-5.5-9.2A5.5 5.5 0 0110 2.8a5.5 5.5 0 015.5 5.5c0 2.6-2 5.2-5.5 9.2z" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="10" cy="8.3" r="1.6" stroke={c} strokeWidth="1.2" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="2.4" stroke={c} strokeWidth="1.2" />
        <path
          d="M10 3v2.4M10 14.6V17M3 10h2.4M14.6 10H17M5.05 5.05l1.7 1.7M13.25 13.25l1.7 1.7M5.05 14.95l1.7-1.7M13.25 6.75l1.7-1.7"
          stroke={c}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    )
  return (
    <Link
      href={href}
      onClick={onNav}
      aria-label={kind}
      style={{
        width: 40,
        height: 40,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background var(--dur-hover) ease',
        textDecoration: 'none',
      }}
      className="hover:bg-[var(--color-surface)]"
    >
      {icon}
    </Link>
  )
}
