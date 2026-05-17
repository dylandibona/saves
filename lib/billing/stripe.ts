import Stripe from 'stripe'

/**
 * Stripe client — SERVER-ONLY. Never import this from a 'use client' file.
 * The secret key must never reach the browser bundle.
 *
 * We lazy-init on first use so the module loads cleanly even when the key
 * isn't set (e.g. local dev without billing configured). Calls fail loud
 * if the key is missing.
 */

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      '[stripe] STRIPE_SECRET_KEY is not set. Add it to .env.local for dev, or to Vercel env vars for production.'
    )
  }

  _stripe = new Stripe(key, {
    // Pin the API version so Stripe SDK changes don't surprise us.
    // Bump deliberately when we want to opt in to new features.
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })

  return _stripe
}

// Price IDs for the two paid plans. These get set in Stripe Dashboard and
// then dropped into env vars. Read at call sites, not at module load, so
// missing IDs fail loud at the moment of use.
//
// NOTE 2026-05-17 — pricing model shifted from per-seat household add-ons
// to a flat-rate household plan (up to 4 people). The `household` value
// replaces the previous `household_member` env var; both are read for the
// transition window so an old Stripe Price ID won't 500 the checkout.
export function getPriceIds() {
  return {
    personal: process.env.STRIPE_PRICE_ID_PERSONAL,
    household: process.env.STRIPE_PRICE_ID_HOUSEHOLD ?? process.env.STRIPE_PRICE_ID_HOUSEHOLD_MEMBER,
  }
}

/**
 * Plan catalog — labels, save limits, monthly price (USD).
 *
 * 2026-05-17 pricing change:
 *   Personal: $4/mo — single user, unlimited.
 *   Household: $8/mo — up to 4 people sharing one library, unlimited.
 *     (Was: $4 owner + $2/seat. The flat $8 covers a household up to 4
 *     people, simpler to reason about and to bill.)
 *
 * TODO before paid launch: validate $8 against actual per-household
 * inference + Storage + bandwidth costs and a target margin. The current
 * numbers are intent, not a P&L. Apify (if/when we add Instagram comment
 * scraping) and Whisper transcription will both push the per-household
 * marginal cost up.
 *
 * Schema note: `subscription_plan` on users is `'personal' | 'household_member' | null`
 * today. The new flat model is conceptually a household-level plan, but
 * we keep the per-user column for now and treat `household_member` as
 * "covered by a household sub" for read purposes. Migration to a true
 * household-scoped subscription column is queued for the paid launch.
 */
export const PLANS = {
  free: {
    label: 'Free',
    saveLimit: 12,
    price: 0,
    blurb: '12 finds, all features.',
  },
  personal: {
    label: 'Personal',
    saveLimit: Infinity,
    price: 4,
    blurb: 'Unlimited finds. One person.',
  },
  household_member: {
    label: 'Household',
    saveLimit: Infinity,
    price: 8,
    blurb: 'Up to 4 people sharing one library.',
  },
} as const

export type Plan = keyof typeof PLANS
