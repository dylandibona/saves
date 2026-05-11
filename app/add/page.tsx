import { Nav } from '@/components/nav'
import { AddForm } from './add-form'
import { requireUser } from '@/lib/auth/require-user'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add' }

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>
}) {
  const params = await searchParams
  const initialUrl = params.url ?? ''
  await requireUser(initialUrl ? `/add?url=${encodeURIComponent(initialUrl)}` : '/add')

  return (
    <>
      <Nav />
      <main
        className="max-w-[640px] mx-auto px-5"
        style={{
          paddingTop: '72px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)',
        }}
      >
        <header className="mb-8 mt-4">
          <p
            className="font-mono uppercase"
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              color: 'var(--color-mute)',
            }}
          >
            New
          </p>
          <h1
            className="font-display mt-1"
            style={{
              fontSize: '36px',
              color: 'var(--color-bone)',
              lineHeight: 1.05,
            }}
          >
            A new <span className="font-serif italic font-normal">find</span>.
          </h1>
        </header>
        <AddForm initialUrl={initialUrl} />
      </main>
    </>
  )
}
