import { type NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/billing/stripe'
import type { Database, Json } from '@/lib/types/supabase'
import type Stripe from 'stripe'

/**
 * Stripe webhook receiver.
 *
 * Two responsibilities:
 *   1. Verify the signature so we know the event is really from Stripe.
 *   2. Idempotently store and process the event, so re-deliveries (which
 *      happen often) are no-ops.
 *
 * The events we care about today are subscription lifecycle:
 *   - checkout.session.completed     → first payment, customer created
 *   - customer.subscription.updated  → renewals, plan changes, status changes
 *   - customer.subscription.deleted  → cancellation
 *   - invoice.payment_failed         → status: past_due
 *
 * Anything else: stored in stripe_events, processed_at left null, ignored.
 * If we add handlers later, they'll naturally pick up unprocessed rows.
 */

export const dynamic = 'force-dynamic'

function db() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    console.warn('[stripe-webhook] missing stripe-signature header')
    return new NextResponse('missing signature', { status: 400 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set')
    return new NextResponse('server misconfigured', { status: 500 })
  }

  // Stripe needs the RAW body for signature verification. We can't
  // request.json() — that mutates body parsing in a way that breaks
  // signature checks. Use .text() to get raw.
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return new NextResponse('invalid signature', { status: 400 })
  }

  const supabase = db()

  // Idempotency check: have we already seen this event?
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id, processed_at')
    .eq('id', event.id)
    .maybeSingle()

  if (existing?.processed_at) {
    return new NextResponse('already processed', { status: 200 })
  }

  // Store/upsert the event so it's durable even if processing fails below.
  await supabase.from('stripe_events').upsert(
    {
      id: event.id,
      type: event.type,
      payload: event as unknown as Json,
    },
    { onConflict: 'id' }
  )

  // ── Process the event ──────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = typeof session.customer === 'string' ? session.customer : null
        if (userId && customerId) {
          await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        if (!customerId) break

        const item = sub.items.data[0]
        const priceId = item?.price.id
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null

        const plan = inferPlanFromPriceId(priceId)

        await supabase
          .from('users')
          .update({
            subscription_status: sub.status,
            subscription_plan: plan,
            subscription_current_period_end: periodEnd,
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (customerId) {
          await supabase
            .from('users')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      default:
        // Other event types we don't handle yet. Stored in stripe_events
        // for later inspection but processed_at stays null.
        return new NextResponse('ignored', { status: 200 })
    }

    await supabase
      .from('stripe_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', event.id)

    return new NextResponse('ok', { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[stripe-webhook] processing error', {
      event_id: event.id,
      event_type: event.type,
      error: errorMessage,
    })
    await supabase
      .from('stripe_events')
      .update({ error: errorMessage })
      .eq('id', event.id)
    return new NextResponse('processing error', { status: 500 })
  }
}

function inferPlanFromPriceId(priceId?: string): 'personal' | 'household_member' | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_ID_PERSONAL) return 'personal'
  if (priceId === process.env.STRIPE_PRICE_ID_HOUSEHOLD_MEMBER) return 'household_member'
  return null
}
