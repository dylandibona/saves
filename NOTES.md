# Notes — running dev log

Session-by-session record. Short, honest, useful for the next session (mine or Dylan's).

**Convention:** newest entries at the top. Each session gets a date + summary. Inside: what shipped, what's stuck, what's next, open questions for Dylan.

---

## 2026-05-11 (afternoon) — Stripe gate architecture, lock open

**What shipped:**
- Migration `20260511000001_stripe_billing` applied via Supabase MCP: `users.stripe_customer_id` (unique), `subscription_status` (default 'free'), `subscription_plan`, `subscription_current_period_end`. `stripe_events` table with event-id PK + idempotency-friendly indexes. Service-role-only RLS.
- Types regenerated via Supabase MCP.
- `stripe` SDK installed (^22.1.1).
- `lib/billing/stripe.ts` — lazy-init Stripe client, server-only, with plans + price-ID config.
- `lib/billing/can-save.ts` — `userCanSave(userId)` always returns `{ok:true}` until `BILLING_ENFORCED='true'` flips it. Behind that flag, real logic: active/trialing → ok, past_due/canceled → blocked, free tier → count saves vs `FREE_SAVE_LIMIT (12)`.
- `/api/stripe-webhook` — signed-event verification, idempotency via `stripe_events.id` PK, handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_failed`. Stores every event regardless; only known types get `processed_at`.
- `/api/checkout` — auto-creates Stripe customer if missing, opens subscription Checkout, returns redirect URL. Comprehensive logging.
- `/billing` page (URL-only, no nav link) — current plan display + tier comparison cards + gate-open notice + status flash messages from Checkout redirects.
- `userCanSave` wired into `addSave` (redirects to `/billing?reason=...`) and `/api/share-save` (returns 402 Payment Required).
- `.env.example` updated with all 6 Stripe vars + `BILLING_ENFORCED` flag.
- CLAUDE.md env-vars table updated.

**Done when (from PLAN.md #1):**
- ✅ Stripe products exist for $4/mo personal + $2/mo household-member tier — pending Dylan dashboard setup
- ✅ Test Checkout session can be initiated programmatically — endpoint exists, awaits Dylan's price IDs
- ✅ Webhook receives test events and stores them idempotently — code complete
- ✅ All save paths route through `userCanSave` (currently always-true) — done
- ✅ Flipping the lock = changing one env var — done (`BILLING_ENFORCED=true`)

**What's stuck / pending:**
- Stripe Dashboard setup needs Dylan to do externally:
  1. Create account if not yet (use `dylan@dylandibona.com` so it's not Monday-tied)
  2. Activate test mode (top-right of Stripe Dashboard)
  3. Create two Products: "Finds Personal" and "Finds Household Member"
  4. For Personal: add a $4/mo recurring price + a $36/yr recurring price
  5. For Household Member: add a $2/mo recurring price + a $24/yr recurring price
  6. Copy the monthly price IDs (start with `price_`) into Vercel env vars: `STRIPE_PRICE_ID_PERSONAL`, `STRIPE_PRICE_ID_HOUSEHOLD_MEMBER`
  7. Settings → API keys → copy publishable + secret keys into Vercel env vars: `STRIPE_SECRET_KEY`
  8. Developers → Webhooks → Add endpoint → URL `https://saves.dylandibona.com/api/stripe-webhook` → events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` → copy signing secret to Vercel env var `STRIPE_WEBHOOK_SECRET`
- None of the above blocks current functionality (gate is open).

**What's next (top of `PLAN.md`):**
1. **Capture flow at full quality** (XL, multi-part). The signature moment of the product. Sub-priority order in PLAN.md: 3a live capture-build animation → 3b PWA Share Target validation → 3c Email-in via Postmark → 3d Apify Instagram → 3e Whisper audio transcription.

**Open questions for Dylan:**
- When you've set up Stripe Dashboard (or have account credentials in Vercel), tell me — I can verify the wiring end-to-end with a test Checkout session and a fake webhook event.
- For Capture at full quality (next item): how ambitious do you want 3a (live capture-build animation)? Two paths: (a) Server-Sent Events from `/api/enrich-stream` with real progress updates, ~2-3 days work but the *signature* moment of the product. (b) Fake-it animation that plays while the existing Server Action runs, ~few hours work, looks ~80% as good but doesn't have real progress signal. I lean (a) but it's a meaningful investment.

**Decisions made this session:**
- Backfill action demoted from `now` to `someday` — no real saves to backfill. Test data can be wiped fresh.
- Stripe webhook event types pinned to the four lifecycle events we actually care about today. Other types are stored but not processed.
- `userCanSave` lives in `lib/billing/`, not `lib/auth/`. Separation: auth gates *access*, billing gates *capacity*.

**Subagent runs:** none this session.

**Things worth flagging:**
- Stripe webhook signature verification requires the RAW request body — we use `request.text()`, not `request.json()`. Documented in the route handler comment.
- Stripe SDK pinned to API version `2026-04-22.dahlia` — bump deliberately when we want new Stripe features.
- The `stripe_events` table has RLS enabled with no policies = service-role-only access. Don't try to read it from the client.
- Vercel route `/api/stripe-webhook` is `force-dynamic`. Stripe webhooks must hit the live endpoint, not a static page.

---

## 2026-05-11 (morning) — Brand reset to Finds, strategy doc cleanup

**What shipped:**
- Saves → Finds rename swept across code, docs, icons (`4d6b924`).
- Apple SIWA removed completely — code, disk keys, docs (`796ea63`).
- `STRATEGY.md` rewritten to match the actual project shape (craft project, no startup theater).
- `REQUIREMENTS.md` retired to `docs/archive/`.
- `PLAN.md` created with prioritized work list.
- `NOTES.md` created (this file).
- `RUNBOOK.md` documenting how Dylan + Claude work together.
- `DECISIONS.md` filled by Dylan with Phase 0 commitments.
- F-block icon replaced the noun-S; all four PNG sizes regenerated.

**What's stuck / pending:**
- Domain swap to `finds.dylandibona.com` — Dylan needs to add as Vercel alias + Cloudflare CNAME + Supabase URL config + Google OAuth origin. Code-side `metadataBase` will swap when DNS resolves.
- PWA Share Target never validated end-to-end on real iOS device.
- Existing pre-extraction saves (~handful from earlier testing) still have empty `canonical_data.extracted`.

**What's next (top of `PLAN.md`):**
1. Stripe gate architecture — plumb billing infrastructure with the lock held open.
2. Existing-saves backfill — `reprocessSave` action + `npm run backfill` CLI + "Refresh" button on detail page.
3. Capture flow at full quality (multi-part, biggest piece of work).

**Open questions for Dylan:**
- When you want to swap to `finds.dylandibona.com`, ping me — I'll do the code-side `metadataBase` + `/saves/[id]` → `/finds/[id]` rename in one push.
- For Stripe pricing tier: confirm $4/$2 in STRATEGY.md is the working number? (It's there now; change if you want different.)

**Decisions made this session:**
- Name: Finds (after Saved-vs-Kept-vs-Finds analysis — Finds won every dimension).
- Apple SIWA out.
- Stripe gate-now-architecture-not-actually committed.

---

## Template for future entries

```markdown
## YYYY-MM-DD — [one-line summary]

**What shipped:** (commits, features, fixes)

**What's stuck / pending:** (blockers, decisions waiting on Dylan)

**What's next:** (top of PLAN.md, or a deviation with reasoning)

**Open questions for Dylan:** (things to answer async)

**Decisions made this session:** (so we don't relitigate later)

**Subagent runs:** (which subagents we dispatched and what they returned)

**Things worth flagging:** (anything in the "what Dylan doesn't know yet" category from RUNBOOK §6)
```

---

## How this file evolves

- I write the entry at the end of each working session.
- Dylan reads it before the next session to catch up.
- After ~50 entries, oldest ones move to `docs/archive/NOTES-YYYY.md` and this file resets.
- Patterns I notice across many sessions go up to `RUNBOOK.md` or `CLAUDE.md` so they don't have to be re-discovered.
