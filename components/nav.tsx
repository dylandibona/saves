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
