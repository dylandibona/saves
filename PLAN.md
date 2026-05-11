# Plan — what we work on next

Prioritized list of the next worthwhile things to build. No dates, no quarters. Top of the list is what we should be working on **now**. Items move up and down based on signal; new items go at the priority they deserve.

**Conventions:**
- **Status:** `now` (active) / `next` (queued) / `someday` (worthwhile but not yet)
- **Effort:** **S** (under a day) / **M** (a few days) / **L** (~a week) / **XL** (multi-week)
- **Done when:** the verifiable test that this item is shipped, not "good progress made"

Deep backlog of nice-to-haves lives in `CLAUDE.md` §7. Items only enter `PLAN.md` when they're worth thinking about as the next thing.

---

## 1. Stripe gate architecture (open lock) — `now` — M

**Why:** RUNBOOK §3 and DECISIONS §G3 commit to plumbing billing infrastructure now, even with the lock open. Avoids a painful retrofit later. The actual decision to charge is decoupled from the architecture.

**Scope:**
- Stripe account + products + prices created (Free, Paid, Household-member tiers from STRATEGY pricing section).
- `users.subscription_status` column + RLS read access.
- Stripe Checkout integration plumbed into a `/billing` route — but the entry to it is hidden in UI for now.
- Webhook handler at `/api/stripe-webhook` with proper idempotency (event-id as primary key on a `stripe_events` table).
- A `userCanSave(userId)` helper in `lib/auth/` that today always returns `true` but is the right hook for "paid? free-limit-reached? trialing?" later.
- Save action and `/api/share-save` both call through `userCanSave`.

**Done when:**
- Stripe test products exist for $4/mo personal + $2/mo household-member tier.
- A test Checkout session can be initiated programmatically.
- Webhook receives test events and stores them idempotently.
- All save paths route through `userCanSave` (currently always-true).
- Flipping the lock = changing one env var or one boolean.

**Risks:** Stripe webhook signature verification is fiddly. Allow ~half a day.

---

## 2. Existing-saves backfill action — `now` — S

**Why:** Saves created before per-category extraction (everything pre-`5174712`) have empty `canonical_data.extracted` and look threadbare on detail pages. Need a way to reprocess. Also useful for "Refresh this save's data" UX later.

**Scope:**
- New server action `reprocessSave(saveId)` that re-runs `enrichUrl()` against `canonical_url` and updates the save row's title/subtitle/category/hero/canonical_data fields if they were empty (don't clobber user edits).
- One-off CLI: `npm run backfill` that finds all saves with empty `canonical_data.extracted` and reprocesses them, with rate limiting (1 per second) to stay polite.
- UI button: "Refresh" on the save detail page, ⟳ icon, runs `reprocessSave`.

**Done when:**
- Any pre-extraction save can be refreshed with one tap on its detail page.
- `npm run backfill` populates the existing ~handful of threadbare saves.

---

## 3. Capture flow at full quality — `next` — XL

**Why:** This is the signature moment of the product. Per STRATEGY §"The five signature flows" — capture is the gateway and the first impression. Current capture works but doesn't have the live-build animation or the share-from-anywhere experience.

**Scope (in sub-priority order):**

### 3a. Live capture-build animation — L
- Convert `enrichUrl` Server Action to a streaming endpoint (Server-Sent Events from `/api/enrich-stream`).
- AddForm subscribes to the stream, renders state transitions: scaffolding → image fading in → title resolving → category chip animating to its jewel color → ingredients/exercises/hours populating one at a time.
- Motion: ~3-second total reveal. Each step has its own timing and easing.
- Sound option (off by default): subtle typewriter tap on text reveal.

### 3b. PWA Share Target validation — S
- Manifest already exists. Install Finds as PWA on real iOS device, test share-from-Instagram flow end-to-end. Document gotchas.

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

## 4. Library at full quality — `next` — XL

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

## 5. Deploy hygiene — `next` — S

**Why:** Currently anyone can push to main and trigger a Vercel deploy regardless of TypeScript errors or build failure. Cheap to add a guardrail.

**Scope:**
- Pre-commit hook: `npx tsc --noEmit` + `npm run lint` must pass. Husky or simple-git-hooks.
- GitHub Actions workflow that runs the same on PR (if/when we ever take PRs).
- README badge for build status.

**Done when:**
- A commit with a type error fails locally before pushing.
- Vercel never sees a broken build because we don't ship broken builds.

---

## 6. Edit save UI — `next` — M

**Why:** Once saved, you can't edit title/category/note/visibility from the UI. Must delete + re-add. Real friction.

**Scope:**
- "Edit" button on the detail page next to Delete.
- Inline-edit per field — tap the title to edit it, tap the category chip to change it, tap the lock to toggle visibility, etc.
- Server action `updateSave(saveId, patch)` with RLS-enforced household scope.

**Done when:**
- Every field on a save card can be changed without deleting and re-adding.

---

## 7. Tonight — `someday` — XL

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

## 8. Trip — `someday` — XL

Per STRATEGY. Build after Tonight ships. Trip mode requires geographic clustering of saves, which depends on the Trip-detection logic and decent place-extraction (we have the basics; will improve as Capture gets richer).

---

## 9. Cellar — `someday` — M

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
