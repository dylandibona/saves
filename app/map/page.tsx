import { Nav } from '@/components/nav'
import { MapClient } from './map-client'
import { getMapSaves } from '@/lib/data/map-saves'
import { getHouseholdId } from '@/lib/data/household'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Map' }

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const householdId = await getHouseholdId()
  if (!householdId) redirect('/login')

  const saves = await getMapSaves(householdId)

  return (
    <>
      <Nav />
      {/* Full-viewport canvas; bottom-nav floats above it. The top header
          is a transparent overlay so map fills behind. */}
      <main className="fixed inset-0" style={{ zIndex: 0 }}>
        <MapClient saves={saves} />
      </main>
    </>
  )
}
