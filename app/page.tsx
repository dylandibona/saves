import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { FeedClient } from '@/components/feed/feed-client'
import { getHouseholdId } from '@/lib/data/household'
import { getFeedSaves } from '@/lib/data/saves'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const householdId = await getHouseholdId()
  if (!householdId) redirect('/login')

  const { category, q } = await searchParams
  const saves = await getFeedSaves(householdId)

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <FeedClient
          saves={saves}
          initialCategory={category}
          initialQuery={q}
        />
      </main>
    </>
  )
}
