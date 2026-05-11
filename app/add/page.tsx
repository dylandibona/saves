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
  // Build redirect path that preserves the shared URL through login
  await requireUser(initialUrl ? `/add?url=${encodeURIComponent(initialUrl)}` : '/add')

  return (
    <>
      <Nav />
      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif-display text-3xl text-white/90 leading-tight">
            A new find.
          </h1>
        </div>
        <AddForm initialUrl={initialUrl} />
      </main>
    </>
  )
}
