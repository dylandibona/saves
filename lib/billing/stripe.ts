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
export function getPriceIds() {
  return {
    personal: process.env.STRIPE_PRICE_ID_PERSONAL,
    householdMember: process.env.STRIPE_PRICE_ID_HOUSEHOLD_MEMBER,
  }
}

// Per-plan limits and labels. Surfaced in /billing UI and used by can-save.
export const PLANS = {
  free: {
    label: 'Free',
    saveLimit: 12,
    price: 0,
  },
  personal: {
    label: 'Personal',
    saveLimit: Infinity,
    price: 4,
  },
  household_member: {
    label: 'Household member',
    saveLimit: Infinity,
    price: 2,
  },
} as const

export type Plan = keyof typeof PLANS
