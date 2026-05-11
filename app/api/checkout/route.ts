import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getPriceIds } from '@/lib/billing/stripe'

/**
 * Initiate a Stripe Checkout session for the signed-in user.
 *
 * POST body: { plan: 'personal' | 'household_member' }
 *
 * Returns: { url } — caller redirects the user there.
 *
 * Plumbed but not yet linked from any UI. The /billing page will surface
 * Upgrade buttons when the gate is closed; for now this endpoint is for
 * verification that the Stripe integration is wired correctly.
 */

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let userId: string | null = null
  let plan: string | undefined

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('[checkout] unauthenticated')
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }
    userId = user.id

    const body = (await request.json().catch(() => ({}))) as {
      plan?: 'personal' | 'household_member'
    }
    plan = body.plan

    if (plan !== 'personal' && plan !== 'household_member') {
      console.warn('[checkout] invalid plan', { userId, plan })
      return NextResponse.json({ ok: false, error: 'invalid plan' }, { status: 400 })
    }

    const prices = getPriceIds()
    const priceId = plan === 'personal' ? prices.personal : prices.householdMember
    if (!priceId) {
      console.error('[checkout] price not configured', { plan })
      return NextResponse.json(
        { ok: false, error: 'price not configured for this plan' },
        { status: 500 }
      )
    }

    // Get or attach a Stripe customer
    const { data: userRow } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = userRow?.stripe_customer_id
    const stripe = getStripe()

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRow?.email ?? user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const origin = request.headers.get('origin')
      ?? process.env.NEXT_PUBLIC_SITE_URL
      ?? 'https://saves.dylandibona.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?status=cancel`,
      allow_promotion_codes: true,
    })

    console.log('[checkout] session created', {
      userId,
      plan,
      sessionId: session.id,
      ms: Date.now() - startedAt,
    })

    return NextResponse.json({ ok: true, url: session.url })
  } catch (err) {
    console.error('[checkout] crash', {
      userId,
      plan,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 600) : undefined,
      ms: Date.now() - startedAt,
    })
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    )
  }
}
