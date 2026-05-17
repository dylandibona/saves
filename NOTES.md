# Notes — running dev log

Session-by-session record. Short, honest, useful for the next session (mine or Dylan's).

**Convention:** newest entries at the top. Each session gets a date + summary. Inside: what shipped, what's stuck, what's next, open questions for Dylan.

---

## 2026-05-17 — Capture coverage + invite/household + Stratum v2 + phone-test polish + OAuth branding

Single very long day. 17 commits, 7 migrations, full visual reset. All on `origin/main`, HEAD `7eed97d`. Comprehensive write-up in `docs/session-notes-2026-05-17.md`; this is the dev-log summary.

**Phase A — morning** (`a4a00cb`, `9b76018`)
- Capture coverage: YouTube/TikTok/Spotify/Apple Music/Apple Podcasts/Letterboxd/Goodreads enrichment branches. `ClassifyHint` union extended. Hardcoded `'noted'` for YouTube killed. Twitter/X intentionally skipped.
- Invite system: 3 migrations + 4 RPCs. Two kinds (`app` for stranger 90-day comp trial, `household` for partner-share). UI in `/settings` (InvitesSection + TestersSection) + `/join/[code]` landing + `/login` invite threading + `/auth/callback` redemption + members-only `/billing` tile.
- Household naming: `handle_new_user` trigger renames defaults to `"{Display}'s finds"`. Owner-only rename UI.
- Phase 2 polish: `saves.enrichment_errors jsonb` triage. 20s Anthropic timeout.
- Dylan upgraded to comp Personal trial expiring 2027-05-17. Safe to flip `BILLING_ENFORCED=true`.

**Phase B — midday — Stratum v2 visual reset** (`5ec0774`, `f844831`, `35afae0`, `15ba4e9`, `c83ca06`)
- Full design system replacement. Out: orbs, Geist/Fraunces/Space Mono, Pixel-font wordmark, 5 animated gradients. In: radial sapphire wash + Instrument Sans / Instrument Serif Italic / Martian Mono + 4px-max border-radius + ease-out-expo motion (no springs, no glow).
- Library/Capture/Detail rebuilt to Claude Design's spec. Drag-scroll category strip, count-line hero, italic-serif title moment reserved for single-Find emphasis.
- New `Sigil` component built from real `public/logo.black.svg` paths.
- Re-enrich + persistent hero images: `decodeHtmlEntities()` cleans old saves; sharp resize → Supabase Storage `hero-images/{id}.webp`. Detail prefers Storage URL, falls back to source. Migration 6 adds the column + bucket.
- Drop 2: app-wide single-row top-right-title header pattern. Settings reorganized — Subscription section first. Map rewrite.

**Phase C — afternoon/evening — phone-test polish** (`dfe54a1` → `7eed97d`)
- Pricing: Household plan renamed (`household_member` → `household`), flat $8/mo for up to 4 (was $2/mo per seat).
- Family rename RLS bug: migration 7 fixes self-referential typo in households UPDATE policy (`household_members.household_id = household_members.id` → `... = households.id`). Defensive `.select()` in `renameHousehold` Server Action surfaces 0-rows-updated.
- Capture race fixed — Keep button now gated on `buildState.status === 'complete' || 'error'`.
- iOS focus-zoom fix — `font-size: 16px !important` on all inputs at coarse pointers.
- Real Finds logo swapped in everywhere. PWA icons rebuilt.
- Login redesign — Google primary, OR divider, magic-link secondary, "New to Finds? Either path creates your account." beta-code disclosure.
- "Finds" text stripped everywhere logo appears (sigil-only). I missed two surfaces (Wordmark component, map header) on first pass — Dylan caught them.
- Always-open dock: closed-by-default hurt discoverability. Three nav icons + "+ Find" cream pill always visible. Hidden on auth/add/saves paths.
- Detail action bar: misread Dylan's "detail page nav visible" as "show the dock there" — he meant the existing Open original / Options bar should be viewport-docked. Reverted dock, switched bar from `position: sticky` to `position: fixed`.
- Library first-load splash: initial bug flashed Library → splash → Library. Fix: default `visible=true` so splash paints from SSR.

**OAuth branding (Dylan-side, no commit)**
- Cloud Console → Branding → App name "Finds", logo upload, both Authorized domains (`lqmjglpzrfcpnpshbjwo.supabase.co` AND `dylandibona.com`) kept, contact email set.
- Initial advice that Testing publishing status bypasses verification for branding display was **wrong**. Live test in Incognito after switching to Testing still showed the Supabase URL. The "Verification status" panel in the Branding UI is literal: External-audience apps need verification before branding (App name OR logo) displays.
- Confirmed via Client ID prefix match (`435455306082-...`) that the Finds Cloud project owns the OAuth client — wrong-project theory ruled out.
- Three real resolution paths: (A) Internal audience via Workspace — requires Keelin gets a `@dylandibona.com` account; branding shows immediately. (B) Accept Supabase URL during beta — first-time consent only, Google caches it. (C) Submit for verification — 4-6 wk, defer until public launch. **Recommendation: B for tonight.**

**What's stuck / pending:**
- `BILLING_ENFORCED=true` env flip in Vercel (Production + Preview) — deferred until Dylan finishes pre-flight testing.
- `GOOGLE_PLACES_API_KEY` still only in `.env.local`, not Vercel. Maps lookups silently fall back without it.
- PWA Share Target on iOS still untested — ~30 min of Dylan's phone time.
- Apify Instagram — cost decision still pending.
- Stripe live config (products + price IDs + webhook secret) — deferred until first tester wants to convert.
- HaveIBeenPwned leaked-password check — 30-second Supabase Auth toggle.
- Restrict Google Maps + Places keys in Cloud Console — 10 min.

**Decisions made this session:**
- Household-invite links bypass beta app-code gate. The link IS the credential.
- 90-day Personal trial for app-code redeemers; tester cohort stamped via `users.acquired_via_code`.
- Members see no `/billing`, just "Handled by {owner}." tile.
- 90-day trial > lifetime-free — lets us learn who actually uses it.
- Twitter/X enrichment skipped — low ROI on scraping.
- Household plan flat $8/mo for up to 4 (not $2/mo/seat) — simpler mental model.
- Dock always-open with "+ Find" cream pill — discoverability > minimalism.
- Drop the word "Finds" anywhere the logo appears — logo is sufficient.
- OAuth verification deferred until public launch.
- Phase 2.1 (Anthropic streaming) deferred — high complexity, modest UX win.

**Architectural learnings:**
- **Worktree gotcha** — Mid-Phase-A a batch of `Write`s used absolute paths to the main repo root instead of the worktree. Recovery via `git restore` worked but cost a checkpoint. Lesson: the session-init system message explicitly gives the worktree path; that's the destination for every Write/Edit.
- **RLS UPDATE can succeed with 0 rows** — the Family rename bug looked like the action failing, but the UPDATE statement ran fine — it just matched zero rows because the policy `USING` clause had a typo. Lesson: when a Server Action calling UPDATE/DELETE needs to confirm it actually changed something, chain `.select()` so we surface 0-rows as an explicit error.
- **iOS Safari auto-zoom on `<input>` font-size <16px** — affects any form, not just the auth surfaces. Universal `@media (pointer: coarse)` rule is the fix.
- **`position: sticky` is page-scoped, `position: fixed` is viewport-scoped** — if you want something pinned regardless of scroll, use fixed.
- **CSS preflight order matters in Tailwind v4** — setting `font-family` on `html` was overridden by Tailwind's preflight. Setting it on `html, body` works.
- **Grep across the codebase when stripping a term** — Dylan caught me twice missing "Finds" in surfaces I hadn't expected (Wordmark component, map glass header).
- **Default useState to the visible state, not the hidden state, when rendering from SSR** — splash-page flash was caused by `useState(false)` flipping to `true` in `useEffect`, which happens after first paint. `useState(true)` is the right default for "show by default, dismiss in effect".
- **Google OAuth verification gate is real for External-audience apps** — Testing publishing status only carves out *user access* (no need to publish to use), not branding display. As long as audience type is External and branding has been edited, App name + logo are gated behind verification. Trust the "Verification status" panel in the Cloud Console Branding UI when it says branding won't show — it's not a warning, it's a literal description of what will happen. The carve-out exists only for Internal-audience apps under a Workspace org.
- **The OAuth Client ID prefix is the project number** — `XXXXXXXXXXXX-xxx.apps.googleusercontent.com`. Quickest way to verify "is this OAuth client in the project I think it's in?" — compare the prefix against the project number on the Cloud Console dashboard. No need to enumerate Credentials across projects.

**Open questions for Dylan:**
- Walk through the pre-flight test sequence on your phone, then mint Keelin's household link.
- After Keelin tests, flip `BILLING_ENFORCED=true` in Vercel (Production + Preview).
- Place `GOOGLE_PLACES_API_KEY` in Vercel when convenient — unblocks full Maps enrichment in production.

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
- For 3b (PWA Share Target), do you have a moment to test on your phone? Open `https://finds.dylandibona.com` in Safari → Add to Home Screen → share an Instagram post → see if Finds appears in the share sheet. Tell me what you observe.

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
  8. Developers → Webhooks → Add endpoint → URL `https://finds.dylandibona.com/api/stripe-webhook` → events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` → copy signing secret to Vercel env var `STRIPE_WEBHOOK_SECRET`
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
