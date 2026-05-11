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

  const gateOpen = process.env.BILLING_ENFORCED !== 'true'
  const status = profile?.subscription_status ?? 'free'
  const plan = profile?.subscription_plan as keyof typeof PLANS | null
  const periodEnd = profile?.subscription_current_period_end

  const isSuccess = params.status === 'success'
  const isCanceled = params.status === 'cancel'

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
            className="font-display mt-1"
            style={{
              fontSize: '36px',
              color: 'var(--color-bone)',
              lineHeight: 1.05,
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
