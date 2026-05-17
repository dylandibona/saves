import { Nav } from '@/components/nav'
import { requireUser } from '@/lib/auth/require-user'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/billing/stripe'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing' }

/**
 * Billing surface — accessible by URL, not yet linked from the nav.
 *
 * Today: shows current plan + tier comparison + the gate-open status.
 * When the gate is closed: also surfaces Upgrade buttons that POST to
 * /api/checkout and redirect to Stripe Checkout.
 *
 * Hidden from the nav until we're actually ready to charge — but the
 * route exists so users with the URL can land here and the architecture
 * is exercised end-to-end during dev.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string }>
}) {
  await requireUser('/billing')
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, subscription_plan, subscription_current_period_end')
    .eq('id', user!.id)
    .single()

  // Household members never see billing controls. If this user is a
  // 'member' of their household (not the owner), render an explanatory
  // tile pointing at the owner who handles billing.
  const { data: membership } = await supabase
    .from('household_members')
    .select('role, household_id')
    .eq('user_id', user!.id)
    .single()

  if (membership?.role === 'member') {
    const { data: owner } = await supabase
      .from('household_members')
      .select('users:users!household_members_user_id_fkey(display_name, email)')
      .eq('household_id', membership.household_id)
      .eq('role', 'owner')
      .maybeSingle()
    const ownerProfile = owner?.users as { display_name: string | null; email: string } | null
    const ownerName =
      (ownerProfile?.display_name?.trim() || ownerProfile?.email?.split('@')[0]) ?? 'the household owner'

    return (
      <>
        <Nav />
        <main
          className="max-w-[640px] mx-auto px-5 space-y-10"
          style={{
            paddingTop: '72px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)',
          }}
        >
          <header className="space-y-1 mt-4">
            <p
              className="font-mono uppercase"
              style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                color: 'var(--color-mute)',
              }}
            >
              Billing
            </p>
            <h1
              className="font-display mt-2"
              style={{ fontSize: '40px', color: 'var(--color-bone)' }}
            >
              Handled by <span className="font-serif italic font-normal">{ownerName}</span>.
            </h1>
          </header>

          <section
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p className="text-[14px] text-white/75 leading-relaxed">
              You&rsquo;re a member of {ownerName}&rsquo;s household. Subscription
              and payment are managed on their account.
            </p>
          </section>
        </main>
      </>
    )
  }

  const gateOpen = process.env.BILLING_ENFORCED !== 'true'
  const status = profile?.subscription_status ?? 'free'
  const plan = profile?.subscription_plan as keyof typeof PLANS | null
  const periodEnd = profile?.subscription_current_period_end

  const isSuccess = params.status === 'success'
  const isCanceled = params.status === 'cancel'

  // Trial countdown — for tester accounts on comp Personal trial. After
  // expiry they revert to free (12-save cap) unless we issue a discount
  // code and they redeem it. Warning level escalates as the date approaches.
  const trialDaysLeft =
    status === 'trialing' && periodEnd
      ? Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86_400_000))
      : null
  const trialUrgency: 'urgent' | 'soon' | 'ok' | null =
    trialDaysLeft === null ? null
    : trialDaysLeft <= 7  ? 'urgent'
    : trialDaysLeft <= 21 ? 'soon'
    : 'ok'
  const trialEndDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <>
      <Nav />
      <main
        className="max-w-[640px] mx-auto px-5 space-y-10"
        style={{
          paddingTop: '72px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)',
        }}
      >

        <header className="space-y-1 mt-4">
          <p
            className="font-mono uppercase"
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              color: 'var(--color-mute)',
            }}
          >
            Billing
          </p>
          <h1
            className="font-display mt-2"
            style={{
              fontSize: '48px',
              color: 'var(--color-bone)',
            }}
          >
            Your <span className="font-serif italic font-normal">plan</span>.
          </h1>
        </header>

        {/* Status flash messages from Stripe Checkout redirect */}
        {isSuccess && (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'rgba(0,229,160,0.06)',
              border: '1px solid rgba(0,229,160,0.22)',
            }}
          >
            <p className="font-mono text-[11px] text-[#00e5a0]">Payment confirmed.</p>
            <p className="text-[13px] text-white/70 mt-1">
              Subscription is being activated. May take a moment for the dashboard to update.
            </p>
          </div>
        )}

        {isCanceled && (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <p className="font-mono text-[11px] text-white/45">Checkout canceled.</p>
            <p className="text-[13px] text-white/70 mt-1">
              No changes to your plan. Come back when you&apos;re ready.
            </p>
          </div>
        )}

        {/* Trial countdown — visible to comp testers on a 90-day Personal trial.
            Urgency escalates: green at >21 days, amber 7-21, ruby ≤7. */}
        {trialDaysLeft !== null && trialEndDate && (
          <div
            className="rounded-xl px-4 py-3.5 space-y-1.5"
            style={{
              background:
                trialUrgency === 'urgent' ? 'rgba(244,63,94,0.10)' :
                trialUrgency === 'soon'   ? 'rgba(245,158,11,0.08)' :
                                            'rgba(0,229,160,0.06)',
              border:
                trialUrgency === 'urgent' ? '1px solid rgba(244,63,94,0.32)' :
                trialUrgency === 'soon'   ? '1px solid rgba(245,158,11,0.28)' :
                                            '1px solid rgba(0,229,160,0.22)',
            }}
          >
            <p
              className="font-mono text-[10px] tracking-widest uppercase"
              style={{
                color:
                  trialUrgency === 'urgent' ? '#fb7185' :
                  trialUrgency === 'soon'   ? '#fbbf24' :
                                              '#00e5a0',
              }}
            >
              Beta tester trial · {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left
            </p>
            <p className="text-[14px] text-white/80 leading-relaxed">
              Your Personal trial ends <strong className="text-white/95">{trialEndDate}</strong>.
              {trialUrgency === 'urgent'
                ? ' After that, your library stays but new saves stop at 12. We will reach out before the date to offer a tester discount on the paid plan.'
                : trialUrgency === 'soon'
                ? ' After that, your library stays but new saves cap at 12 unless you upgrade. We will be in touch about a tester discount before the trial ends.'
                : ' Plenty of time. Unlimited saves, full features. We will reach out before the end with details about a tester discount on the paid plan.'}
            </p>
          </div>
        )}

        {/* Gate-open notice */}
        {gateOpen && (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p className="font-mono text-[10px] tracking-widest text-white/35">
              Gate open
            </p>
            <p className="text-[13px] text-white/65 mt-1 leading-relaxed">
              All features are available for free while we get this right.
              Paid tiers are wired but not active.
            </p>
          </div>
        )}

        {/* Current state */}
        <section className="space-y-3">
          <p className="font-mono text-[10px] tracking-widest text-white/30">Current</p>
          <div className="space-y-2">
            <p className="text-sm text-white/70">
              Status: <span className="font-mono text-white/90">{status}</span>
            </p>
            {plan && (
              <p className="text-sm text-white/70">
                Plan: <span className="font-mono text-white/90">{PLANS[plan]?.label ?? plan}</span>
              </p>
            )}
            {periodEnd && (
              <p className="text-sm text-white/70">
                Renews:{' '}
                <span className="font-mono text-white/90">
                  {new Date(periodEnd).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
        </section>

        {/* Plans */}
        <section className="space-y-4">
          <p className="font-mono text-[10px] tracking-widest text-white/30">Plans</p>

          <div className="space-y-3">
            <PlanCard
              name={PLANS.free.label}
              price="Free"
              tagline={`Up to ${PLANS.free.saveLimit} finds. All features.`}
              current={status === 'free' && !plan}
            />
            <PlanCard
              name={PLANS.personal.label}
              price="$4 / mo"
              tagline="Unlimited finds. Share extension. Email-in."
              current={plan === 'personal'}
            />
            <PlanCard
              name={PLANS.household_member.label}
              price="$2 / mo"
              tagline="When invited by a Personal subscriber."
              current={plan === 'household_member'}
            />
          </div>
        </section>

      </main>
    </>
  )
}

function PlanCard({
  name,
  price,
  tagline,
  current,
}: {
  name: string
  price: string
  tagline: string
  current: boolean
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 space-y-1.5"
      style={{
        background: current ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
        border: current ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-base text-white/88">{name}</p>
        <p className="font-mono text-[11px] text-white/55 tabular-nums">{price}</p>
      </div>
      <p className="text-[13px] text-white/50 leading-relaxed">{tagline}</p>
      {current && (
        <p className="font-mono text-[9px] tracking-widest text-white/40 pt-1">CURRENT</p>
      )}
    </div>
  )
}
