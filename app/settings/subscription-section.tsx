'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { PLANS } from '@/lib/billing/stripe'

type Status = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
type Plan = 'personal' | 'household_member' | null

type Props = {
  status: Status
  plan: Plan
  currentSaves: number
  periodEnd: string | null
  /** Display name (or email local part) of the household owner — only used in the
   *  household_member case to render "Through {ownerName}". */
  ownerName: string | null
}

/**
 * Subscription panel — the first section on /settings.
 *
 * Three states we render:
 *   1. Free                            → upgrade pill, "{N} of 12 finds used"
 *   2. Personal (trialing/active)      → manage pill, "Renews {date}"
 *   3. Household member                → no pill, "Through {ownerName}"
 *
 * Renders as a client component because the UPGRADE pill needs to POST to
 * /api/checkout and follow the returned Stripe Checkout URL. MANAGE is wired
 * up to fire a TODO no-op since /api/billing-portal doesn't exist yet.
 */
export function SubscriptionSection({
  status,
  plan,
  currentSaves,
  periodEnd,
  ownerName,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isPaid = status === 'active' || status === 'trialing'
  const isHouseholdMember = isPaid && plan === 'household_member'
  const isPersonal = isPaid && plan === 'personal'
  const isFree = !isPaid

  // Help-text copy varies by state.
  const help = isHouseholdMember
    ? `You're part of ${ownerName ?? 'a household'}'s shared library. Billing handled by them.`
    : isPersonal
      ? "You're on Personal. Unlimited finds, all features."
      : "You're on the free plan — 12 finds, all features. Personal is $4/mo. Household is $8/mo for up to 4 people sharing one library."

  // Plan card — left side label + status line.
  const planLabel = isHouseholdMember
    ? 'Household member'
    : isPersonal
      ? 'Personal'
      : PLANS.free.label

  const statusLine = isHouseholdMember
    ? `Through ${ownerName ?? 'household owner'}`
    : isPersonal
      ? `Renews ${formatRenewal(periodEnd)}`
      : `${currentSaves} of ${PLANS.free.saveLimit} finds used`

  function handleUpgrade() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'personal' }),
        })
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Could not start checkout')
        }
        window.location.href = data.url
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start checkout')
      }
    })
  }

  // TODO: implement /api/billing-portal (Stripe Customer Portal). Until then,
  // MANAGE is a no-op for paid users and Billing history is disabled.
  function handleManage() {
    setError('Manage portal not yet available. Coming soon.')
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1.5">
        <p
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-mute)',
          }}
        >
          Subscription
        </p>
        <p
          style={{
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'rgba(244,243,239,0.65)',
            maxWidth: '60ch',
          }}
        >
          {help}
        </p>
      </header>

      {error && (
        <div
          className="rounded-[4px] px-3 py-2"
          style={{
            background: 'rgba(255,100,100,0.06)',
            border: '0.5px solid rgba(255,100,100,0.18)',
          }}
        >
          <p className="font-mono text-[10.5px]" style={{ color: 'rgba(244,243,239,0.75)' }}>
            {error}
          </p>
        </div>
      )}

      {/* Plan card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 4,
          background: 'rgba(255,255,255,0.025)',
          border: '0.5px solid rgba(244,243,239,0.08)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--color-paper)',
            }}
          >
            {planLabel}
          </div>
          <div
            className="font-mono"
            style={{
              marginTop: 3,
              fontSize: 9.5,
              letterSpacing: '0.04em',
              color: 'var(--color-mute)',
            }}
          >
            {statusLine}
          </div>
        </div>

        {isFree && (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={pending}
            className="font-mono"
            style={{
              background: 'transparent',
              padding: '6px 12px',
              borderRadius: 999,
              border: '0.5px solid rgba(244,243,239,0.2)',
              color: 'var(--color-paper)',
              fontSize: 9.5,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: pending ? 'wait' : 'pointer',
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? 'Loading' : 'Upgrade'}
          </button>
        )}

        {isPersonal && (
          <button
            type="button"
            onClick={handleManage}
            className="font-mono"
            style={{
              background: 'transparent',
              padding: '6px 12px',
              borderRadius: 999,
              border: '0.5px solid rgba(244,243,239,0.2)',
              color: 'var(--color-paper)',
              fontSize: 9.5,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Manage
          </button>
        )}

        {/* Household member: no pill — they can't change billing. */}
      </div>

      {/* Below the card: See plans + Billing history (outline row) */}
      <div style={{ display: 'flex', gap: 6 }}>
        <Link
          href="/billing"
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 4,
            background: 'transparent',
            border: '0.5px solid rgba(244,243,239,0.12)',
            color: 'rgba(244,243,239,0.85)',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: 12,
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          See plans
        </Link>

        {isFree ? (
          <button
            type="button"
            disabled
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 4,
              background: 'transparent',
              border: '0.5px solid rgba(244,243,239,0.12)',
              color: 'rgba(244,243,239,0.85)',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 12,
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            Billing history
          </button>
        ) : (
          <button
            type="button"
            onClick={handleManage}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 4,
              background: 'transparent',
              border: '0.5px solid rgba(244,243,239,0.12)',
              color: 'rgba(244,243,239,0.85)',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Billing history
          </button>
        )}
      </div>
    </section>
  )
}

function formatRenewal(iso: string | null): string {
  if (!iso) return 'soon'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'soon'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
