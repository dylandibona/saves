import { AddForm } from './add-form'
import { requireUser } from '@/lib/auth/require-user'
import { getHouseholdId } from '@/lib/data/household'
import { createClient } from '@/lib/supabase/server'
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

  // Solo-user detection — if the user is the only member of their household,
  // hide the MY FAMILY / JUST ME tabs entirely (default visibility=household).
  const householdId = await getHouseholdId()
  let memberCount = 1
  if (householdId) {
    const supabase = await createClient()
    const { count } = await supabase
      .from('household_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('household_id', householdId)
    memberCount = count ?? 1
  }

  return (
    <main
      className="mx-auto"
      style={{
        maxWidth: '420px',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AddForm initialUrl={initialUrl} memberCount={memberCount} />
    </main>
  )
}
