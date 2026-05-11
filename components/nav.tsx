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
    <header
      className="sticky top-0 z-10 border-b border-white/[0.06]"
      style={{
        background: 'oklch(0.10 0.005 240 / 0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="leading-none">
          <AnimatedWordmark />
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/add" label="Add" />
          <NavLink href="/map" label="Map" />
          <NavLink href="/settings" label="Settings" />
          <form action={signOut}>
            <button
              type="submit"
              className="text-[13px] font-medium text-white/45 hover:text-white/80 transition-colors duration-150 px-3 py-2"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-150 px-3 py-2"
    >
      {label}
    </Link>
  )
}
