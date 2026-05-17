import { redirect } from 'next/navigation'
import { FeedClient } from '@/components/feed/feed-client'
import { LibrarySplash } from '@/components/feed/library-splash'
import { getHouseholdId } from '@/lib/data/household'
import { getFeedSaves } from '@/lib/data/saves'

/**
 * Library page — Stratum v2.
 *
 * The FeedClient owns its own header (sigil wordmark, count line, drag
 * scroll category strip). The global Dock (mounted in app/layout.tsx)
 * provides bottom navigation. No top nav.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const householdId = await getHouseholdId()
  if (!householdId) redirect('/login')

  const { category } = await searchParams
  const saves = await getFeedSaves(householdId)

  return (
    <>
      <LibrarySplash />
      <main
        className="mx-auto"
        style={{
          maxWidth: 640,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        }}
      >
        <FeedClient saves={saves} initialCategory={category} />
      </main>
    </>
  )
}
