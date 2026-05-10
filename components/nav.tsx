import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnimatedWordmark } from '@/components/animated-wordmark'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/[0.08]"
      style={{ background: 'oklch(0.10 0.08 262 / 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="leading-none">
          <AnimatedWordmark />
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/add"
            className="font-mono text-[11px] text-white/40 hover:text-white/85 transition-colors duration-200">
            + Add
          </Link>
          <Link href="/map"
            className="font-mono text-[11px] text-white/40 hover:text-white/85 transition-colors duration-200">
            Map
          </Link>
          <Link href="/settings"
            className="font-mono text-[11px] text-white/40 hover:text-white/85 transition-colors duration-200"
            aria-label="Settings"
            title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </Link>
          <form action={signOut}>
            <button type="submit"
              className="font-mono text-[11px] text-white/22 hover:text-white/50 transition-colors duration-200">
              Sign Out
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
