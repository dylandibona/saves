-- Stripe billing — schema for future subscription gating.
-- Intentional design: the gate is OPEN today. All users behave as paid
-- users. The lib/billing/can-save.ts helper returns true always until
-- a single env-var flip activates gating. This migration only puts
-- the rails in place.

-- ── Subscription state on users ────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN stripe_customer_id text UNIQUE,
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'free',
  -- 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  ADD COLUMN subscription_plan text,
  -- 'personal' | 'household_member' | null
  ADD COLUMN subscription_current_period_end timestamptz;

CREATE INDEX idx_users_stripe_customer ON public.users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── Idempotent Stripe webhook event log ───────────────────────────────
-- Every webhook hit stores the event by Stripe's event_id (primary key).
-- Re-deliveries are no-ops. processed_at marks completion of side effects.
CREATE TABLE public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE INDEX idx_stripe_events_type ON public.stripe_events (type);
CREATE INDEX idx_stripe_events_unprocessed ON public.stripe_events (received_at)
  WHERE processed_at IS NULL;

-- Service-role-only access. RLS enabled with no policies = locked down.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
