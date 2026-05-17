import { headers } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/require-user'
import { Wordmark } from '@/components/wordmark'
import { TokenSection } from './token-section'
import { InvitesSection } from './invites-section'
import { TestersSection } from './testers-section'
import { HouseholdSection } from './household-section'
import { SubscriptionSection } from './subscription-section'
import { signOut } from './actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  await requireUser('/settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Read existing token (if any) so we can show it without forcing a regenerate.
  // Also pull subscription fields for the SubscriptionSection panel — single
  // round-trip beats two queries.
  const { data: profile } = await supabase
    .from('users')
    .select('share_token, subscription_status, subscription_plan, subscription_current_period_end')
    .eq('id', user!.id)
    .single()

  const { data: codes } = await supabase
    .from('invite_codes')
    .select('code, kind, uses_count, max_uses, expires_at, notes, created_at')
    .order('created_at', { ascending: false })

  // Tester accounts you've onboarded (app codes redeemed by someone).
  // Sorted by closest-to-expiry first. Powers the "Testers" panel where
  // you organize the conversion moment as paid plans approach.
  const { data: testers } = await supabase.rpc('list_acquired_users')

  // Current household + role + member count for the household section
  // header copy and rename-button gating.
  const { data: myMembership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user!.id)
    .single()
  const { data: household } = myMembership
    ? await supabase.from('households').select('name').eq('id', myMembership.household_id).single()
    : { data: null as { name: string } | null }
  const { count: memberCount } = myMembership
    ? await supabase
        .from('household_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('household_id', myMembership.household_id)
    : { count: 0 }

  // For the Subscription panel: count of active saves in this household, used
  // to render "{N} of 12 finds used" on the free plan. Same pattern as
  // memberCount above — head:true so we pay for the count alone.
  const { count: saveCount } = myMembership
    ? await supabase
        .from('saves')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', myMembership.household_id)
        .eq('status', 'active')
    : { count: 0 }

  // For the household_member case ("Through {ownerName}") we need the name of
  // whoever created the household. Only fire this when relevant — i.e. when
  // the current user is *not* an owner themselves.
  let ownerName: string | null = null
  if (myMembership && myMembership.role !== 'owner') {
    const { data: householdRow } = await supabase
      .from('households')
      .select('created_by')
      .eq('id', myMembership.household_id)
      .single()
    if (householdRow?.created_by) {
      const { data: ownerRow } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', householdRow.created_by)
        .single()
      ownerName = ownerRow?.display_name ?? ownerRow?.email?.split('@')[0] ?? null
    }
  }

  // Narrow the subscription status to the enum shape SubscriptionSection expects.
  type SubStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  const rawStatus = profile?.subscription_status ?? 'free'
  const subStatus: SubStatus =
    rawStatus === 'trialing' || rawStatus === 'active' || rawStatus === 'past_due'
      || rawStatus === 'canceled' || rawStatus === 'incomplete'
      ? rawStatus
      : 'free'
  const rawPlan = profile?.subscription_plan ?? null
  const subPlan: 'personal' | 'household_member' | null =
    rawPlan === 'personal' || rawPlan === 'household_member' ? rawPlan : null

  // Resolve absolute origin for share links. Vercel sets x-forwarded-host /
  // x-forwarded-proto; locally we fall back to NEXT_PUBLIC_SITE_URL or
  // finds.dylandibona.com to keep links shareable from any environment.
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host  = h.get('x-forwarded-host') ?? h.get('host')
  const origin = host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://finds.dylandibona.com')

  return (
    <main
      className="max-w-[640px] mx-auto space-y-10"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      }}
    >
      {/* Header — single-row top-right-title pattern. */}
      <div
        style={{
          padding: '14px 20px 8px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Link href="/" aria-label="Back to library" className="inline-flex">
          <Wordmark />
        </Link>
        <h1
          style={{
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: 22,
            lineHeight: 1.0,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: 'var(--color-paper)',
            textAlign: 'right',
            margin: 0,
          }}
        >
          <span style={{ fontWeight: 400 }}>Your </span>
          <span className="font-serif-display" style={{ fontSize: 22 }}>
            settings
          </span>
          <span style={{ color: 'var(--color-mute)' }}>.</span>
        </h1>
      </div>

      <div className="px-5 space-y-10">
        <SubscriptionSection
          status={subStatus}
          plan={subPlan}
          currentSaves={saveCount ?? 0}
          periodEnd={profile?.subscription_current_period_end ?? null}
          ownerName={ownerName}
        />

        {household?.name && (
          <HouseholdSection
            initialName={household.name}
            isOwner={myMembership?.role === 'owner'}
            memberCount={memberCount ?? 1}
          />
        )}

        <InvitesSection
          initialCodes={(codes ?? []).filter(
            (c): c is typeof c & { kind: 'app' | 'household' } =>
              c.kind === 'app' || c.kind === 'household'
          )}
          origin={origin}
        />

        <TestersSection rows={testers ?? []} />

        <TokenSection initialToken={profile?.share_token ?? null} />

        {/* iOS Shortcut setup instructions */}
        <section className="space-y-4">
          <header className="space-y-1.5">
            <p className="font-mono text-[10px] tracking-widest text-white/30">iOS Shortcut</p>
            <p className="text-[13px] text-white/55 leading-relaxed max-w-prose">
              Send a find from any app — Instagram, Safari, Mail — without leaving it.
              The Shortcut posts the URL to Finds in the background and shows
              a brief confirmation notification.
            </p>
          </header>

          <ol className="space-y-3 text-[13px] text-white/65 leading-relaxed">
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">1</span>
              <span>Open <strong className="text-white/85">Shortcuts</strong> app, tap <strong className="text-white/85">+</strong>, name it <em>Send to Finds</em>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">2</span>
              <span>Tap the <strong className="text-white/85">i</strong> icon → toggle <strong className="text-white/85">Use with Share Sheet</strong> on. Set Share Sheet Types to <strong className="text-white/85">URLs only</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">3</span>
              <span>Add action: <strong className="text-white/85">Get Contents of URL</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">4</span>
              <span>Configure that action:
                <ul className="mt-2 space-y-1 pl-4 list-disc list-outside marker:text-white/20">
                  <li>URL: <code className="font-mono text-[11px] text-white/80">https://finds.dylandibona.com/api/share-save</code></li>
                  <li>Method: <strong className="text-white/85">POST</strong></li>
                  <li>Headers: add one — Key: <code className="font-mono text-[11px] text-white/80">Authorization</code>, Value: <code className="font-mono text-[11px] text-white/80">Bearer YOUR_TOKEN</code> (paste the token from above where it says YOUR_TOKEN)</li>
                  <li>Request Body: <strong className="text-white/85">JSON</strong></li>
                  <li>Add field — Key: <code className="font-mono text-[11px] text-white/80">url</code>, type: <strong className="text-white/85">Text</strong>, value: <em>Shortcut Input</em> (magic variable)</li>
                </ul>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">5</span>
              <span>Add action: <strong className="text-white/85">Show Notification</strong>. Set the body to <em>Saved to Finds</em>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">6</span>
              <span>Done. Test from Safari → tap share → Send to Finds → notification fires, you stay in the app you came from.</span>
            </li>
          </ol>

          <div
            className="rounded-[4px] px-4 py-3 mt-2"
            style={{
              background: 'var(--color-surface)',
              border: '0.5px solid var(--color-hairline)',
            }}
          >
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--color-mute)' }}>
              <span style={{ color: 'var(--color-paper)' }}>Tip:</span>{' '}
              Anything saved this way uses auto-detected category and visibility = Shared.
              Open the save from your feed to change category, mark private, or edit the title.
            </p>
          </div>
        </section>

        {/* Sign out — moved from the old top nav. Plain Server Action form. */}
        <section className="pt-4">
          <form action={signOut}>
            <button
              type="submit"
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-mute)',
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
