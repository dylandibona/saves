'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatedWordmark } from './animated-wordmark'

/**
 * Bottom tab bar + raised FAB — VIBEMOVE lineage.
 *
 * Anatomy: top-left wordmark anchor (kept small and quiet) plus a floating
 * bottom bar with 4 tabs and a centered FAB for /add.
 *
 * Per component-specs §10: floating, glass-blur, hairline border, raised
 * FAB at 56px in brand ink. Active tab gets a 3px × 2px bar under the icon
 * (typographic marker, not pill background).
 */

const TABS = [
  { href: '/',         label: 'Library',  icon: LibraryIcon },
  { href: '/map',      label: 'Map',      icon: MapIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
] as const

export function BottomNav({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const pathname = usePathname()
  const onAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')

  if (onAuthRoute) return null

  return (
    <>
      {/* Top-left wordmark anchor — quiet, no nav links */}
      <header
        className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-4 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, var(--color-bg) 0%, oklch(0.14 0.005 95 / 0.92) 70%, transparent 100%)',
        }}
      >
        <Link
          href="/"
          className="pointer-events-auto leading-none"
          style={{ fontSize: '20px' }}
        >
          <AnimatedWordmark />
        </Link>

        <form action={signOutAction} className="pointer-events-auto">
          <button
            type="submit"
            className="text-[12px] text-[var(--color-mute)] hover:text-[var(--color-paper)] transition-colors duration-150"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Floating bottom bar */}
      <nav
        className="fixed inset-x-4 z-40 flex items-center justify-around rounded-[24px] backdrop-blur-xl transform-gpu"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          height: '64px',
          background: 'oklch(0.18 0.006 95 / 0.85)',
          border: '1px solid oklch(0.30 0.008 95 / 0.5)',
          boxShadow: '0 12px 32px -8px rgba(0,0,0,0.5)',
        }}
      >
        {TABS.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <TabLink key={href} href={href} label={label} active={isActive(pathname, href)} Icon={Icon} />
        ))}

        {/* Centered FAB */}
        <Link
          href="/add"
          aria-label="Add a find"
          className="relative flex items-center justify-center transition-transform active:scale-[0.94]"
          style={{
            width: '56px',
            height: '56px',
            marginTop: '-24px',
            borderRadius: '999px',
            background: 'var(--color-bone)',
            color: 'var(--color-bg)',
            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.45), 0 0 0 4px var(--color-bg)',
          }}
        >
          <PlusGlyph />
        </Link>

        {TABS.slice(2).map(({ href, label, icon: Icon }) => (
          <TabLink key={href} href={href} label={label} active={isActive(pathname, href)} Icon={Icon} />
        ))}
      </nav>
    </>
  )
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function TabLink({
  href,
  label,
  active,
  Icon,
}: {
  href: string
  label: string
  active: boolean
  Icon: (props: { active: boolean }) => React.JSX.Element
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex flex-col items-center justify-center transition-transform active:scale-[0.94]"
      style={{
        width: '52px',
        height: '52px',
        color: active ? 'var(--color-bone)' : 'var(--color-mute)',
      }}
    >
      <Icon active={active} />
      {/* Typographic active marker: 12px × 2px bar below the icon */}
      {active && (
        <span
          aria-hidden
          className="absolute"
          style={{
            bottom: '8px',
            width: '12px',
            height: '2px',
            borderRadius: '2px',
            background: 'var(--color-bone)',
          }}
        />
      )}
    </Link>
  )
}

function PlusGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M11 4V18M4 11H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 6v16l7-3 8 3 7-3V3l-7 3-8-3-7 3z"/>
      <path d="M8 3v15"/>
      <path d="M16 6v15"/>
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
