'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Stratum Dock — bottom-right floating capsule, always open.
 *
 * Anatomy:
 *   • Three nav icons (Library / Map / Settings) left
 *   • "+ Find" cream pill right — taps go straight to /add
 *   • Glass capsule body, 4px radius
 *
 * History: this used to be a closed-by-default FAB that opened the nav
 * icons on first tap and committed to /add on the second. The two-tap
 * pattern was clever but hurt discoverability — most users tapped the
 * + expecting "add now" and were surprised by the in-place expand.
 * Always-open is one fewer interaction and clearer at a glance.
 *
 * The action is labeled "+ Find" rather than "+ Keep" because the unit
 * of save IS a Find ("add a Find" reads true to the brand).
 *
 * Visible on every page except:
 *   • /login + /auth/* + /join/* — no chrome on auth surfaces
 *   • /add — Capture's Keep button owns the bottom action slot
 *
 * Visible on /saves/[id] — Detail's Open original / Options bar makes
 * room on its right edge for the dock. See app/saves/[id]/options-popup.tsx.
 */

const HIDDEN_ON: Array<(p: string) => boolean> = [
  (p) => p.startsWith('/login'),
  (p) => p.startsWith('/auth'),
  (p) => p.startsWith('/join'),
  (p) => p.startsWith('/add'),
]

export function Dock() {
  const pathname = usePathname()
  const router = useRouter()

  // We render server-side and on first client tick, but the path can
  // briefly be stale. Recomputing on each render keeps it accurate.
  const [, setRerenderTick] = useState(0)
  useEffect(() => { setRerenderTick(t => t + 1) }, [pathname])

  if (HIDDEN_ON.some(p => p(pathname))) return null

  return (
    <div
      className="fixed z-40"
      style={{
        right: 14,
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 16px)`,
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
        }}
      >
        <NavIcon kind="library"  href="/" />
        <NavIcon kind="map"      href="/map" />
        <NavIcon kind="settings" href="/settings" />

        {/* The primary action — "+ Find" cream pill. Single tap routes
            straight to /add; no preliminary expand step. */}
        <button
          type="button"
          onClick={() => router.push('/add')}
          aria-label="Add a Find"
          style={{
            marginLeft: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '0 14px 0 11px',
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
            border: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 2.5v9M2.5 7h9" stroke="var(--color-bg)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Find
        </button>
      </div>
    </div>
  )
}

function NavIcon({
  kind,
  href,
}: {
  kind: 'library' | 'map' | 'settings'
  href: string
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
      // Proper gear — eight teeth around a center circle.
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke={c}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.4" />
      </svg>
    )
  return (
    <Link
      href={href}
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
