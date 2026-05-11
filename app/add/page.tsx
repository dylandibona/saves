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
      <main className="max-w-lg mx-auto px-5 py-10">
        <div className="mb-8">
          <h1 className="font-display text-white text-[36px]">
            A new <span className="font-serif italic font-normal">find</span>.
          </h1>
        </div>
        <AddForm initialUrl={initialUrl} />
      </main>
    </>
  )
}
