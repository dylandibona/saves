# Notes — running dev log

Session-by-session record. Short, honest, useful for the next session (mine or Dylan's).

**Convention:** newest entries at the top. Each session gets a date + summary. Inside: what shipped, what's stuck, what's next, open questions for Dylan.

---

## 2026-05-17 — Capture coverage, invite/household system, household naming, deploy punchlist

Branch `claude/bold-swanson-70e9ca`, two commits (`a4a00cb` + `9b76018`). Five migrations applied to production DB.

**What shipped:**

*Capture-pipeline coverage.* Six new media types route through dedicated enrichment branches in `lib/enrichment/enrich.ts` and `app/api/enrich-stream/route.ts`: YouTube (oEmbed + Claude with `'video'` hint — kills hardcoded `'noted'`), TikTok (oEmbed + Slackbot UA + `@handle` subtitle), Spotify (oEmbed + path-kind extraction → music vs podcast), Apple Music, Apple Podcasts, Letterboxd, Goodreads. `ClassifyHint` extended from `'place' | null` to `'place' | 'video' | 'music' | 'podcast' | 'movie' | 'book' | null`. New helpers: `fetchOEmbed`, `extractYouTubeId`, `extractSpotifyKind`, `extractTikTokUsername`.

*Invite + household system.* Three migrations: `20260517000001_invite_codes` (table + 4 RPCs), `20260517000002_acquired_via_code` (column + updated redeem function — stamps tester cohort), `20260517000003_list_acquired_users` (admin RPC with warning_level enum). Two invite kinds in one table: `app` (stranger gate, grants 90-day comp Personal trial) and `household` (joins inviter's household as member, link is sufficient credential). Full UI: `InvitesSection` (mint/copy/revoke) and `TestersSection` (color-coded urgency: ok / soon / urgent / expired) in `/settings`, `/join/[code]` landing page, `/login` accepts pasted code or URL-threaded `?invite=`, `/auth/callback` redeems on session exchange. `/billing` for members shows "Handled by {owner}." tile only.

*Trial warnings both directions.* `/billing` shows a countdown banner for `trialing` users — ruby ≤7 days, amber ≤21, teal otherwise. `/settings` TestersSection lists redeemed app codes joined with redeemer state, sorted closest-to-expiry, color-coded badges. Conversion-moment-approaching tile fires when any tester crosses into soon/urgent.

*Household naming.* Migration 4 — `handle_new_user` trigger now creates households named `"{Display}'s finds"` instead of the raw email; backfill renamed existing email-named households. Dylan's household renamed to "Family" via direct SQL. `HouseholdSection` rename UI in `/settings` is owner-only.

*Phase 2 polish.* Migration 5 — `saves.enrichment_errors jsonb` for post-hoc capture-failure triage. `share-save` (iOS Shortcut path) writes derived errors when fallback signals fire. 20s hard timeout on the Anthropic classify call. Phase 2.1 (incremental JSON streaming) deferred — complex parser, modest user-visible win, would land in a dedicated session.

*Account upgrades.* Dylan's user row: `subscription_plan='personal'`, `status='trialing'`, period_end 2027-05-17, `display_name='Dylan'`. Safe to flip `BILLING_ENFORCED=true` without locking him out.

**What's stuck / pending:**
- Branch needs `git push origin claude/bold-swanson-70e9ca` (or merge to main) to trigger Vercel deploy.
- `BILLING_ENFORCED=true` env flip in Vercel waiting until after deploy so users have access to invite UI before the gate activates.
- PWA Share Target on iOS still untested. ~30 min of Dylan's phone time.
- Apify Instagram — cost decision still pending.
- Stripe coupons mechanism for tester-conversion discounts — deferred until Stripe is configured for live payments.

**What's next:**
- Design redesign: Stratum v2 from Claude Design in `_design input/design_handoff_finds_stratum_v2/`. Full visual reset — replaces orbs+jewel-tone+Geist/Fraunces/Space Mono with radial sapphire wash + Instrument Sans/Instrument Serif Italic/Martian Mono + 4px-max border radius + new dock + new card layout. Three screens designed (Library, Capture, Detail); rest applied "in spirit." Implementation plan to follow.

**Decisions made this session:**
- Household-invite links bypass the beta app-code gate. The link IS the credential.
- App-code redemption stamps `users.acquired_via_code` for cohort tracking. 90-day Personal trial. No discount layer until Stripe is live; we'll re-issue the cohort fresh codes when paid plans activate.
- Members never see `/billing`. Just a "Handled by {owner}." tile. Cleanest mental model.
- 90-day trial chosen over lifetime-free for testers. Lets us learn who actually uses the product.
- Twitter/X enrichment branch skipped — low scraping success rate, would ship a hollow branch.
- Phase 2.1 (Anthropic streaming) deferred — high complexity, modest UX win.

**Open questions for Dylan:**
- Push the branch yourself, or do you want me to push it on your authorization?
- When you flip `BILLING_ENFORCED=true`, please do it for both Production AND Preview so previews behave the same.
- Naming check: are we calling it "My Family" or just "Family" in copy? Visibility tabs in the new design say "MY FAMILY"; current code says "Shared" → maps to `visibility: 'household'`. Lining the labels up needs a tiny copy decision.

**Architectural learnings:**
- Worktree gotcha: when operating in a worktree, `Write`/`Edit` calls using absolute paths to the main repo root will land in main, not the worktree. The session-init system message gives the worktree path explicitly — that's the destination for every Write/Edit. Mid-session a batch of writes landed in main and had to be moved. Recovery worked but cost a checkpoint.
- Supabase Data API GRANT policy reminder: new `public.*` tables created after Oct 30, 2026 need explicit `GRANT` statements. `invite_codes` includes the grants defensively even though we're pre-cutoff.

---

## 2026-05-11 (evening) — Live capture-build animation, first pass

**What shipped:**
- `/api/enrich-stream` route handler. Returns `text/event-stream`. Emits phased SSE events: `detected` → `fetching` → `og_parsed` → `classifying` → `classified` → `titled` → `subtitled` → `noted` → structured-field events one-at-a-time (`ingredient`, `instruction`, `exercise`, `place_detail`, `article_detail`, etc.) → `complete`. Pacing constants control rhythm.
- Refactor: extracted enrichment internals from `lib/actions/enrich-url.ts` Server Action into `lib/enrichment/enrich.ts`. The `fetchAndParse`, `classifyWithClaude`, and `enrichUrl` helpers are now exported and callable directly from route handlers. `lib/actions/enrich-url.ts` becomes a thin Server Action wrapper. `/api/share-save` updated to import from the new module path.
- `components/add/build-preview.tsx` — new client component. Materializes the save card as SSE events arrive. Framer Motion choreography: hero image fade-in + slight scale (0.48s), category chip bloom with custom cubic-bezier easing (0.42s), staggered list-item reveals for ingredients/instructions/exercises (0.22s each). Thinking-dot pulse during the Claude classifying phase. Layout-animates with `motion.div layout`.
- `app/add/add-form.tsx` — rewritten. Replaces the Server Action `enrichUrl` call with `fetch('/api/enrich-stream')` + ReadableStream reader + SSE event parser. Maintains `buildState` (drives BuildPreview) and `snapshot` (drives hidden form inputs). AbortController cancels in-flight enrichment when a new URL is typed. The existing form fields (title, category, note, visibility) continue to work the same way; the streaming preview shows above them.

**Done when (from PLAN.md #1 / sub-item 3a):**
- ✅ Streaming endpoint emits real progress for URL detection, OG fetch, Claude classification
- ✅ Client reads stream and dispatches state per event
- ✅ Visual: hero image fade-in, category chip color bloom, structured fields populate one-at-a-time
- ✅ Pacing constants tunable
- ✅ Total reveal time: ~3-8 seconds depending on Claude latency

**What's stuck / pending:**
- v2 improvement: Anthropic streaming API. Currently we make ONE Claude call and emit phases around it (real progress for fetch/classify, choreographed for the field reveals). With Anthropic streaming we'd see title resolve *while* Claude is still thinking — major leap in feel. Saved for a follow-up. ~1-2 days of work.
- Typewriter sound option (off by default) — Sprint 2.
- Cancel button if user wants to bail mid-stream — minor add later.
- Loading skeleton card while waiting for first event — could feel snappier.

**What's next (top of `PLAN.md`):**
- Capture flow sub-item 3b: PWA Share Target validation on real iOS device.
- Then 3c: Email-in via Postmark.
- Then 3d: Apify Instagram integration.
- Then 3e: Whisper audio transcription.

**Open questions for Dylan:**
- Try the new build animation on a real save. Tell me what feels off — pacing too fast, too slow? Animation easings? Sound? The structured-field reveal rhythm (currently 70ms between items)?
- For 3b (PWA Share Target), do you have a moment to test on your phone? Open `https://saves.dylandibona.com` in Safari → Add to Home Screen → share an Instagram post → see if Finds appears in the share sheet. Tell me what you observe.

**Decisions made this session:**
- One Claude call + choreographed reveals (Path 3 from architecture discussion) rather than multiple smaller calls or streaming JSON parsing. Faster to ship, ~80% as magical. v2 can stream Claude's response if signal warrants.
- Enrichment module structure: `lib/enrichment/enrich.ts` exports internals + main function (non-Server-Action). `lib/actions/enrich-url.ts` becomes a thin Server Action wrapper. Lets route handlers call helpers directly without going through the Server Action machinery.
- Build state shape: separate states for the live preview (BuildState) and the final form-submit payload (EnrichedSnapshot). Cleaner than one merged state.

**Subagent runs:** none this session.

**Things worth flagging:**
- SSE stream uses standard `data: ...\n\n` format. `Content-Type: text/event-stream`. Vercel handles this fine in route handlers.
- The route is marked `export const dynamic = 'force-dynamic'` — no caching.
- `X-Accel-Buffering: no` header set to prevent Vercel/nginx from buffering chunks.
- Client uses `fetch()` + `getReader()` rather than `EventSource` — gives us POST body + AbortController. EventSource is GET-only.
- AbortController cancels in-flight enrichment when URL changes. Prevents stale streams from racing.
- The streaming endpoint reuses `fetchAndParse` and `classifyWithClaude` from `lib/enrichment/enrich.ts` — identical results to the one-shot path, just phased.

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
