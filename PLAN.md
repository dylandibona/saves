# Plan — what we work on next

Prioritized list of the next worthwhile things to build. No dates, no quarters. Top of the list is what we should be working on **now**. Items move up and down based on signal; new items go at the priority they deserve.

**Conventions:**
- **Status:** `now` (active) / `next` (queued) / `someday` (worthwhile but not yet)
- **Effort:** **S** (under a day) / **M** (a few days) / **L** (~a week) / **XL** (multi-week)
- **Done when:** the verifiable test that this item is shipped, not "good progress made"

Deep backlog of nice-to-haves lives in `CLAUDE.md` §7. Items only enter `PLAN.md` when they're worth thinking about as the next thing.

---

## 0. Ship to Keelin — `now` — S

**Why:** Everything needed to share Dylan's library with Keelin tonight is built, deployed, and type-checked. What's left is a pre-flight checklist Dylan can run on his phone, then minting the household link.

**Scope:**

1. **Decide OAuth consent path.** Branding is already configured (App name "Finds", logo, support email) in Cloud Console project `saves-495818` / number `435455306082`. But External-audience apps require Google verification before branding displays — Testing publishing status does NOT bypass this (verified 2026-05-17). Three options: (A) provision Keelin a `@dylandibona.com` Workspace account, flip OAuth audience to Internal — branding shows immediately, only Workspace members can sign in. (B) Ship as-is; Keelin sees Supabase URL on first consent, Google caches it, never sees it again. (C) Submit for verification — 4-6 wk review, defer until public launch. **Recommended: B for tonight, revisit A if Keelin wants the polished UX.**
2. **Add `GOOGLE_PLACES_API_KEY` to Vercel** (Production + Preview). Currently `.env.local` only; Maps lookups silently fall back without it.
3. **Pre-flight test on Dylan's phone:**
   - Sign in fresh (Incognito if needed) — accept that consent screen still shows Supabase URL unless path A or C chosen
   - Capture an Instagram reel, a YouTube video, a Google Maps place, a recipe article — confirm hero images persist and categories are correct
   - Refresh a broken/old save via the new Options → Refresh action
   - Rename Family household in Settings — confirm it persists (RLS bug fix verified)
   - Mint a household invite link in Settings → InvitesSection
4. **Flip `BILLING_ENFORCED=true`** in Vercel env (Production + Preview).
5. **Send Keelin the household link.** She clicks → sees "Dylan is sharing their library with you." → signs in with Google → lands in Family.

**Done when:** Keelin can see and add to the shared library on her own phone.

---

## 1. Capture flow at full quality — `next` — XL  *(coverage push done; signature animation done)*

**Why:** This is the signature moment of the product. Per STRATEGY §"The five signature flows" — capture is the gateway and the first impression. Current capture works but doesn't have the live-build animation or the share-from-anywhere experience.

**Scope (in sub-priority order):**

### 3a. Live capture-build animation — L — **DONE (first pass)** ✓
- ✅ Streaming endpoint `/api/enrich-stream` emits phased SSE events (detected → fetching → og_parsed → classifying → classified → titled → subtitled → noted → structured-fields-one-at-a-time → complete).
- ✅ AddForm subscribes to the stream, dispatches state transitions via BuildState.
- ✅ New `BuildPreview` component renders the live-building save card with Framer Motion: hero image fade-in + scale, category chip bloom (custom cubic-bezier), staggered list-item reveals for ingredients/instructions/exercises.
- ✅ Pacing constants in route file (90ms between phases, 70ms between structured items, 200ms final beat).
- Refactor: enrichment internals (fetchAndParse, classifyWithClaude) extracted from `lib/actions/enrich-url.ts` Server Action into `lib/enrichment/enrich.ts` so the streaming route can call them in phases. Server Action remains as a thin wrapper.
- **Next pass:** typewriter sound option (off by default). Anthropic streaming API for in-flight Claude response parsing (title resolves *while* Claude is thinking).

### 3b. PWA Share Target validation — S
- Manifest already exists. Install Finds as PWA on real iOS device, test share-from-Instagram flow end-to-end. Document gotchas.

### 3.1 Media-type coverage — **DONE** ✓
- YouTube (oEmbed + Claude with `'video'` hint — no more hardcoded `'noted'`), TikTok (oEmbed + Slackbot UA + `@handle` subtitle), Spotify (oEmbed + path-kind extraction → music vs podcast), Apple Music, Apple Podcasts, Letterboxd, Goodreads. `ClassifyHint` union extended; new helpers in `lib/utils/url-detect.ts`. Twitter/X intentionally skipped — low scrape success.

### 3c. Email-in capture — M
- Postmark inbound webhook → parses email body for URLs → creates save via `/api/share-save` flow.
- Each user has `capture_email` (already in schema). Setting it on signup is done.
- Need: confirmation-reply system. After receiving an email, send back a "Saved." reply with card preview.

### 3d. Apify Instagram integration — M
- Subscribe to Apify's Instagram Reel Scraper actor.
- New enrichment branch for Instagram URLs that calls Apify → real caption + comments + transcript → richer Claude extraction.
- Cost monitoring: log per-save inference + Apify costs.

### 3e. Audio transcription for video reels — M
- For Instagram Reels and TikToks specifically: pull the video, transcribe via Whisper API, pass transcript to Claude alongside caption.
- ~$0.006/min — cheap enough to enable for all saves of video URLs.

**Done when:**
- Sharing an Instagram recipe reel → save lands with real ingredients extracted from caption + comments + audio.
- Sharing a Google Maps place → save lands with address, hours, phone, website, hero image.
- Sharing any URL → user watches the save build itself in the form, no static "Loading..." state.
- Email-in works: forward an email → save lands → confirmation reply received.

**Risks:** SSE on Vercel has quirks; may need a small `/api/enrich-stream` route on a separate config. Apify scrapers rotate breakage every 2-4 weeks — plan for occasional outages.

---

## 2. Library at full quality — `next` — XL

**Why:** Second of the five signature flows. The destination for everything captured.

**Scope:**
- Mymind-style spatial canvas layout (currently a chronological feed).
- Attention-decay: recently viewed saves have full opacity; untouched ones fade subtly.
- ⌘K command bar — search, jump to category, paste URL to add — single entry point.
- Cluster-aware search: results form as you type, with a top-of-list summary ("12 places, 8 in Brooklyn").
- "Just Dylan / Just Keelin / Both saved" filter toggle.
- Map mode promoted to a peer of the spatial view, not a separate page.

**Done when:**
- The library doesn't feel like a "list of items"; it feels like a *place*.
- ⌘K from any keyboard works.
- Search shows a cluster summary above results.

---

## 3. Deploy hygiene — `next` — S

**Why:** Currently anyone can push to main and trigger a Vercel deploy regardless of TypeScript errors or build failure. Cheap to add a guardrail.

**Scope:**
- Pre-commit hook: `npx tsc --noEmit` + `npm run lint` must pass. Husky or simple-git-hooks.
- GitHub Actions workflow that runs the same on PR (if/when we ever take PRs).
- README badge for build status.

**Done when:**
- A commit with a type error fails locally before pushing.
- Vercel never sees a broken build because we don't ship broken builds.

---

## 4. Edit save UI — `next` — M

**Why:** Once saved, you can't edit title/category/note/visibility from the UI. Must delete + re-add. Real friction.

**Scope:**
- "Edit" button on the detail page next to Delete.
- Inline-edit per field — tap the title to edit it, tap the category chip to change it, tap the lock to toggle visibility, etc.
- Server action `updateSave(saveId, patch)` with RLS-enforced household scope.

**Done when:**
- Every field on a save card can be changed without deleting and re-adding.

---

## 5. Reprocess / refresh save — `someday` — S

(Was originally #2 in this list. Demoted because all existing saves are test data — wiping them and starting fresh is simpler than backfilling. The `reprocessSave` action remains a useful future "Refresh this save's data" feature, but isn't urgent.)

---

## 6. Tonight — `someday` — XL

**Why:** Per STRATEGY, the daily-ritual signature feature. The friend handing you the right thing at the right time.

**Scope:**
- Daily cron computes ~5 candidate saves per household based on:
  - Time of day → category appropriateness.
  - Geography (last-known location) → proximity-weighted.
  - Season → relevant clusters.
  - Decay → unseen-for-90+-days bonus.
- New home view (replaces or supplements the feed): the day's offering. One to three things, then the rest of the library a tap away.
- Push notification (when native iOS exists): "Your Tonight is ready."

**Why deferred:** depends on having enough saves per household for surfacing to be meaningful. Build after we have 100+ saves per household to test against. Also depends on geolocation collection plumbed in (currently we have user `home_location` but no per-session location).

---

## 7. Trip — `someday` — XL

Per STRATEGY. Build after Tonight ships. Trip mode requires geographic clustering of saves, which depends on the Trip-detection logic and decent place-extraction (we have the basics; will improve as Capture gets richer).

---

## 8. Cellar — `someday` — M

Per STRATEGY. Build after Library is at full quality. Cellar is a derived view on top of the spatial canvas — most of the heavy lift is the underlying library, not Cellar itself.

---

## Backlog (deep cuts)

See `CLAUDE.md` §7 for the full list of nice-to-haves that aren't priority enough to belong in PLAN.md yet. Items there include:
- Pre-built iOS Shortcut via iCloud share link
- Native iOS app
- Semantic search via pgvector
- External recommender attribution UI
- Tags / lists / collections
- Map clustering
- SMS inbound (Twilio)
- Android app
- Recipe-specific JSON-LD parser (currently passed to Claude as raw text)
- Voice capture
- Public single-save share URL
- Anniversary-style resurfacing on Tonight

---

## Done

Items that shipped. Newest first.

- **2026-05-17 (late — phone-testing polish + OAuth branding)** — Pricing model: Household plan flat $8/mo for up to 4 (was `household_member` $2/seat). Family rename RLS bug fix (migration 7 — self-referential typo in households UPDATE policy). Defensive `.select()` in renameHousehold Server Action. Capture Keep button gated on `buildState.status === 'complete'`. iOS focus-zoom fix (universal `font-size: 16px` on coarse pointers). Real Finds logo swapped in everywhere (PWA icons rebuilt). Login redesign: Google primary, OR divider, magic-link secondary, beta-code disclosure. "Finds" text stripped everywhere the logo appears (sigil-only). Dock always-open with three nav + "+ Find" cream pill. Detail action bar switched from sticky to fixed (viewport-docked). Library splash defaults to visible=true (no flash). Google OAuth consent screen branding walkthrough delivered (Dylan-side).
- **2026-05-17 (mid — Stratum v2 visual reset)** — Full design system replacement. Out: orbs, Geist/Fraunces/Space Mono, pixel-font wordmark, animated gradients. In: radial sapphire wash + Instrument Sans/Instrument Serif Italic/Martian Mono + 4px-max border-radius + ease-out-expo (no springs, no glow). New `Sigil` component from real `public/logo.black.svg` paths. Library/Capture/Detail rebuilt to Claude Design spec — drag-scroll category strip, count-line hero, italic-serif title moments. Re-enrich action + persistent hero images via Supabase Storage `hero-images/{id}.webp` (sharp resize); HTML entity decoder cleans old saves. Migration 6 adds the column + bucket. App-wide single-row top-right-title header pattern applied to Map/Add/Settings/Billing/Detail. New SubscriptionSection in `/settings`. Map rewrite.
- **2026-05-17 (early — capture coverage + invites + household + Phase 2 polish)** — YouTube/TikTok/Spotify/Apple/Letterboxd/Goodreads media-type branches in enrichment. `invite_codes` table with two kinds (`app` for strangers grants 90-day Personal trial + stamps `users.acquired_via_code` cohort; `household` joins inviter's household — link is sufficient credential). `/settings` InvitesSection + TestersSection (color-coded urgency). `/join/[code]` landing. `/billing` hidden for members + trial countdown banner. `handle_new_user` trigger renames household defaults to `"{Name}'s finds"`; Dylan's renamed to "Family". `HouseholdSection` rename UI (owner-only). `saves.enrichment_errors` jsonb for triage. 20s Anthropic timeout. Migrations: 20260517000001..05. See `docs/session-notes-2026-05-17.md`.
- **Live capture-build animation (first pass)** — `/api/enrich-stream` SSE endpoint with phased events. `BuildPreview` component materializes the save card live as enrichment streams in. Hero image fade + scale, category chip bloom, staggered list-item reveals for structured fields. Pacing tunable. Enrichment internals extracted from Server Action into `lib/enrichment/enrich.ts` so the route can call them in phases.
- **Stripe gate architecture (open lock)** — Migration `20260511000001_stripe_billing`. `users.stripe_customer_id` + `subscription_status` + `subscription_plan` + `subscription_current_period_end` columns. `stripe_events` table with event-id PK for idempotent webhooks. `lib/billing/stripe.ts` client (server-only), `lib/billing/can-save.ts` helper that returns `{ok:true}` while `BILLING_ENFORCED !== 'true'`. `/api/stripe-webhook` with signature verification + idempotent processing of `checkout.session.completed` / `customer.subscription.{created,updated,deleted}` / `invoice.payment_failed`. `/api/checkout` initiates Checkout sessions with auto-customer-creation. `/billing` page (URL-only, no nav link) surfaces current plan + tier comparison + gate-open notice. `userCanSave` is the single gate hook called from `addSave` and `/api/share-save`.
- **Save visibility (Shared / Just me)** — Migration `20260510000001_save_visibility`. Per-save visibility with RLS-enforced privacy. Schema, UI toggle, lock icon, detail page treatment all live.
- **Share token + `/api/share-save`** — Background save endpoint for iOS Shortcut. Token auth, full enrichment, dedup, capture creation. (Shortcut distribution still in backlog.)
- **Per-category structured extraction** — Claude extracts ingredients/exercises/hours/author/runtime/etc per category. ExtractedSection renders rich content on detail page.
- **DD/KL identity pills** — `lib/utils/identity.ts` derives initials and color. SaverPills on feed cards, identity badges on captures timeline.
- **Delete with confirmation modal** — Framer Motion modal, soft-delete via `status='archived'`.
- **Filtered category chips** — Feed only shows categories that have saves.
- **Saves → Finds rename** — Brand commit. Icon, wordmark, microcopy, docs all swept.
- **Google Maps integration** — Custom dark sapphire style, jewel SVG markers, Near Me button.
- **Apple SIWA removed** — Too much config friction. Magic link + Google OAuth remain.
- **PWA manifest with share_target** — Plumbed, not yet validated end-to-end on a real device.
- **PWA icons** — F-block on sapphire jewel base, all sizes generated by `npm run icons`.
- **Animated wordmark** — Letter-by-letter font morph (Pixelify Sans / VT323 / Silkscreen).
- **Save detail page redesign** — Dark jewel theme, hero, captures timeline, action row, extracted section.
- **No middleware** — `lib/auth/require-user.ts` replaces the crashing Edge middleware approach.
- **Migration to production** — `saves.dylandibona.com` deployed on Vercel.
- **Initial schema** — Six migrations covering tables, indexes, triggers, RLS.

---

## How this list evolves

- I (Claude) update this file after each session: add new items, move items between `now`/`next`/`someday`, move shipped items to `Done`.
- Dylan reads it when he wants to know "what's next" — should always be the top of the `now` section.
- When `now` is empty, we promote from `next`.
- When `next` is thin, we promote from `someday` or pull from backlog.
- The file gets a major reshuffling at every phase boundary or product surprise.
