# Session notes — 2026-05-17

> Single very long working day. 17 commits, 7 migrations, full visual reset, two rounds of phone-testing polish, and an OAuth-branding sweep. All commits are on `origin/main` (fast-forwarded from `claude/bold-swanson-70e9ca`). HEAD is `7eed97d`.

This session had three distinct phases. They're documented in order below.

---

## Phase A — Capture coverage + invite/household system (morning)

Original goal: make Finds invite-ready so Dylan + Keelin can share a library tonight, and so strangers can be onboarded as beta testers with a path to convert later.

### A.1 Capture-pipeline coverage push

Six new media types route through dedicated branches in `lib/enrichment/enrich.ts` and `app/api/enrich-stream/route.ts`:

| URL type | Detection | Strategy | Wins |
|---|---|---|---|
| **YouTube** | `youtube.com` / `youtu.be` / `m.youtube.com` / `music.youtube.com` | oEmbed (no key) + Claude classifier with `'video'` hint | Kills the hardcoded `'noted'`. Title + channel + maxres thumbnail. Claude now picks `workout` / `music` / `podcast` / `movie` / etc. correctly. |
| **TikTok** | `tiktok.com` / `vm.tiktok.com` / `vt.tiktok.com` | oEmbed + Slackbot UA fallback + canonical-URL handle extraction | Title + `@handle` subtitle. Was previously silent fall-through to generic. |
| **Spotify** | `open.spotify.com` / `spotify.link` | oEmbed + path-kind extraction (track / album / playlist / episode / show / artist) | Auto-categorizes track/album/playlist as `music`, episode/show as `podcast`. |
| **Apple Music** | `music.apple.com` | Slackbot UA + `'music'` Claude hint | Categorizes as `music`. |
| **Apple Podcasts** | `podcasts.apple.com` | Slackbot UA + `'podcast'` Claude hint | Extracts `showName` / `episodeNumber`. |
| **Letterboxd / Goodreads** | Direct hostname match | Slackbot UA + `'movie'` / `'book'` Claude hint | Forces the right category. |

Architectural changes:
- `ClassifyHint` extended from `'place' | null` to `'place' | 'video' | 'music' | 'podcast' | 'movie' | 'book' | null`. Each kind gets its own prompt fragment inside `classifyWithClaude`.
- New `fetchOEmbed(provider, url)` helper in `enrich.ts` with parallel-fetch support in the SSE route.
- `extractYouTubeId` / `extractSpotifyKind` / `extractTikTokUsername` exported from `lib/utils/url-detect.ts`.

Twitter/X intentionally **skipped** — low success rate on scraping, not worth shipping a hollow branch.

### A.2 Invite + household system end-to-end

**Schema (3 migrations):**

- `20260517000001_invite_codes` — table + RLS + 4 RPCs (`generate_invite_code`, `preview_invite_code`, `redeem_invite_code`, `create_invite_code`). All SECURITY DEFINER with `search_path=''` pinning per the security-hardening pattern from 2026-05-13.
- `20260517000002_acquired_via_code` — `users.acquired_via_code text` column. Updated `redeem_invite_code` to stamp the code on the user at app-code redemption. Index for tester-cohort queries.
- `20260517000003_list_acquired_users` — admin RPC returning the inviter's tester roster with a `warning_level` enum: `ok` / `soon` (≤21 days) / `urgent` (≤7 days) / `expired` / `inactive` / `unknown`.

**Two invite kinds, one table:**

| Kind | Purpose | Effect on redemption |
|---|---|---|
| `app` | Stranger beta gate | Caller keeps their auto-created solo household; granted `subscription_plan='personal'`, `status='trialing'`, period_end = +90 days; `acquired_via_code` stamped |
| `household` | Share your library with partner/family | Caller's solo household is deleted (only if they have 0 saves); they're inserted into the inviter's household as `role='member'`; a `self` recommender is created |

A household invite link is **sufficient credential by itself** — the recipient does not also need an app code.

**UI surfaces:**
- `/settings` → `InvitesSection` (client) — mint, copy, revoke both kinds.
- `/settings` → `TestersSection` (server) — color-coded urgency.
- `/join/[code]` (server) — landing page that previews the inviter ("Dylan is sharing their library with you") and routes through `/login?invite=<code>`, or auto-redeems if signed in.
- `/login` form — accepts `?invite=<code>` from URL OR pasted code. Threads through OAuth + magic-link callbacks.
- `/auth/callback` — after `exchangeCodeForSession`, calls `redeem_invite_code` if an `invite` param is present.
- `/billing` for `member` role — replaces UI with "Handled by {owner}." tile.
- `/billing` for `trialing` users — countdown banner (ruby ≤7 days, amber ≤21, teal otherwise).

### A.3 Household naming + enrichment-errors triage

- Migration 4 — `handle_new_user` trigger now creates households named `"{Display}'s finds"` instead of raw email; backfilled existing email-named households. Dylan's renamed to "Family" via direct SQL. `HouseholdSection` rename UI is owner-only.
- Migration 5 — `saves.enrichment_errors jsonb` for post-hoc capture-failure triage. `share-save` (iOS Shortcut path) writes derived errors when fallback signals fire.
- 20s hard timeout on the Anthropic classify call.

### A.4 Worktree/main split incident

Mid-Phase A, file `Write`s used absolute paths to the main repo root instead of the worktree, so edits landed on `main` rather than the worktree branch.

**Recovery:** copied the changed files into the worktree, `git restore`d the tracked files in main, removed the untracked new files from main. Result: main back to baseline; all work isolated on `claude/bold-swanson-70e9ca`.

**Lesson:** when operating in a worktree, the session-init system message gives the worktree path explicitly — that's the destination for every Write/Edit. Always include the full worktree prefix in absolute paths.

DB migrations are unaffected — they apply via Supabase MCP to a project ref shared regardless of git branch.

### A.5 Account upgrades

One-time SQL: Dylan upgraded to comp Personal trial (`subscription_plan='personal'`, `status='trialing'`, period_end 2027-05-17, `display_name='Dylan'`). Flipping `BILLING_ENFORCED=true` will not lock him out at his current 19-saves-over-free-cap state.

---

## Phase B — Stratum v2 visual reset (midday)

Claude Design delivered a full visual reset for Library, Capture, Detail. The old orb-based jewel-tone aesthetic was retired; new system:

- **Tokens**: `--color-bg #08080b`, sapphire radial wash, paper `#f4f3ef`, mute `rgba(244,243,239,0.55)`, category tones at oklch L≈0.7 C≈0.14.
- **Fonts**: Instrument Sans (UI), Instrument Serif Italic (single-Find title moments only — Capture once resolved, Detail), Martian Mono (labels at uppercase ≥ 0.12em).
- **Radius**: 4px max universally, except 999px glyph dots.
- **Motion**: ease-out-expo `cubic-bezier(0.2, 0.8, 0.2, 1)`. No spring, no chip glow.

### B.1 Drop 1 — Foundation + Library + Capture + Detail

Commits `5ec0774`, `f844831`, `35afae0`, `15ba4e9`.

- `app/layout.tsx` — Google fonts swap. Drop Pixelify Sans / VT323 / Silkscreen triplet. Drop AnimatedWordmark. Static radial sapphire wash replaces 5 animated orbs.
- `app/globals.css` — new tokens, 4px-radius rule, category color CSS vars on raw `:root` (Tailwind v4 tree-shaking workaround documented from 2026-05-12 still applies).
- `components/wordmark.tsx` — new `Sigil` component built from real Finds logomark paths (extracted from `public/logo.black.svg`).
- `components/feed/feed-client.tsx` — count-line header, drag-scroll category strip, tighter cards.
- `components/feed/save-card.tsx` — single-row meta line (category·time·initials), no saver pills.
- `components/dock.tsx` — new floating dock (originally closed-by-default + scroll-fade; later changed to always-open — see Phase C).
- `components/add/build-preview.tsx` + `app/add/add-form.tsx` — centered mono phase verb → italic serif title swap on resolve → ENRICHED callout → category-tinted Keep button.
- `app/saves/[id]/page.tsx` — full-bleed hero, italic-serif title, Options popup with Delete moved inside, KEPT timestamp chip.
- Re-enrich + persistent hero images: HTML-entity decoder (`decodeHtmlEntities()`) cleans up `&#39;` artifacts in older saves. Migration `20260517000006_hero_image_persistence` adds `saves.hero_image_storage_path` + a `hero-images` Storage bucket. `lib/enrichment/image-persist.ts` resizes via sharp to 800px webp and uploads via service-role. Inline call from `addSave` + `share-save`. Detail page prefers Storage URL, falls back to source URL until backfill. New "Refresh from source" Server Action on save detail.

### B.2 Drop 2 — App-wide header + Subscription + Map

Commit `c83ca06`.

- Single-row top-right-title header pattern applied to all secondary surfaces (Map / Add / Settings / Billing / Saves detail) — sigil left, italic-serif page title right.
- Settings reorganized: Subscription section first, then Household, Invites, Testers, Token, Shortcut, Sign out.
- New `app/settings/subscription-section.tsx` — three states (Free / Personal / Household member) with UPGRADE / MANAGE pills.
- Map rewrite (`app/map/map-client.tsx`) — new chrome, sigil + italic "map" title, pin-tap behavior reworked.

---

## Phase C — Phone-testing polish + login + dock + bar + OAuth (afternoon → evening)

After Dylan started testing on his phone, a long iteration cycle through small UX issues. Commits `dfe54a1` through `7eed97d`.

### C.1 Polish pass (`dfe54a1`)

- Copy fixes throughout.
- Pricing model change: Personal $4/mo (unchanged), Household renamed from `household_member` to plain `household` and repriced to **$8/mo flat for up to 4 people** (was $2/mo per seat). `lib/billing/stripe.ts` PLANS map updated. `getPriceIds()` reads `STRIPE_PRICE_ID_HOUSEHOLD` with `_HOUSEHOLD_MEMBER` fallback for any legacy env values.
- Family rename RLS bug — Dylan reported rename not persisting. Root cause: migration `20260510000001` had a self-referential typo in the households UPDATE policy (`household_members.household_id = household_members.id` instead of `household_members.household_id = households.id`). Migration `20260517000007_fix_households_update_rls` corrects it. Added defensive `.select()` in `renameHousehold` Server Action to surface zero-rows-updated as an explicit error.
- Refresh UX: center-screen REFRESHING… overlay with animating ellipsis, closable error dialog, confirmation modal.
- iOS Shortcut copy clarified.

### C.2 Capture race-condition fix (`2fed4fd`)

Tapping Keep before the SSE stream completed was saving a partial Find. Gated the button on `buildState.status === 'complete' || 'error'`.

### C.3 iOS focus-zoom (`a7036d8`)

iOS Safari auto-zooms when an input is focused and its font-size is < 16px. Universal fix in `app/globals.css`:

```css
@media (pointer: coarse) {
  input, textarea, select { font-size: 16px !important; }
}
```

All forms across the app now stable on phone.

### C.4 Logo swap (`3e4dbfa`)

Dylan dropped new brand assets in `/public` (`logo.black.svg`, `logo.fullcolor.png`, etc.). `Sigil` component now renders the two real logo paths with `currentColor` fill. PWA icons rebuilt as 512×512 rounded square in `#08080b` with logo centered in cream.

### C.5 Login redesign (`d1e1148`)

Per Dylan: "google auth should be first, no? then email me a sign-in link but what if you haven't signed up?"

- Google primary cream button at top.
- OR divider.
- Email input + outline magic-link button below.
- Microcopy: "New to Finds? Either path creates your account."
- Beta code disclosure.
- All inputs `fontSize: 16` for iOS.

### C.6 Drop "Finds" text everywhere (`aba6d32` + `2e22567`)

Per Dylan: "with the new logo at the top, we can lose the word 'Finds'."

- `components/wordmark.tsx` — `Wordmark` now renders sigil-only (no text). Optional `onReset` wraps in a button.
- `app/login/page.tsx` — sigil-only centered (64px), italic-serif tagline below: "The things you *find*, kept."
- `app/map/map-client.tsx` — glass header stripped of "Finds" text (only Sigil + italic-serif "map" remains). Initial pass missed this; Dylan caught it on the second look. Lesson: when doing a rename/strip, grep for the term across the codebase before claiming done.

### C.7 Always-open dock (`aba6d32`)

Per Dylan: "dock open at all times."

- `components/dock.tsx` — removed open/close state. Three nav icons (Library / Map / Settings) + "+ Find" cream pill always visible.
- Replaced placeholder settings icon with a proper 8-tooth gear SVG.
- HIDDEN_ON: `/login`, `/auth/*`, `/join/*`, `/add`, `/saves/*` (Detail has its own action bar).

### C.8 Detail action-bar — the misunderstanding (`2e22567` + `d0a2c99`)

Per Dylan: "detail page nav visible."

Initial misread: I added the dock to the Detail page. Dylan corrected: "you misunderstood me. that should just show the detail BAR persistently NOT the dock. that's too much on that page. double check your work." Reverted dock-on-Detail.

Then a follow-up: "on a detail page there's a 'open original | + options' bar at the bottom of the page. That should be docked to the bottom of the viewport above the content rather than needing to be scrolled to."

Fix in `app/saves/[id]/options-popup.tsx`: switched the container from `position: sticky` (which scrolls inside the page) to `position: fixed` so the bar is docked to the viewport bottom regardless of scroll position. `paddingBottom` on the page main bumped to 116px to clear the floating bar.

### C.9 Library first-load splash (`392189d` → fixed in `7eed97d`)

Per Dylan: "library page flashes, then the loading screen, then back to the library."

- `components/feed/library-splash.tsx` — first-paint splash with sapphire wash + sigil + italic-serif "Here come your *Finds*." Plays once per browser tab session (sessionStorage flag).
- **Initial bug**: defaulted to `visible=false` and flipped to `true` in `useEffect`, causing the flash Dylan saw (Library renders → splash appears → 1.4s → Library returns).
- **Fix**: default `visible=true` so splash renders from SSR onward; `useEffect` either dismisses instantly for returning users or schedules the 1.4s fade-out for new ones. No more flash.

### C.10 Google OAuth consent branding (no commit — Dylan-side)

Per Dylan: "the app name in the google auth is the supabase URL we need to brand the login auth flow as well."

Walkthrough delivered:
- Cloud Console → OAuth consent screen / Branding → App name: `Finds`
- Upload logo (`public/logo.fullcolor.png`)
- App home page: `https://finds.dylandibona.com`
- Authorized domains: keep BOTH `lqmjglpzrfcpnpshbjwo.supabase.co` (OAuth callback host) AND `dylandibona.com` (app domain parent). Both required, neither redundant.

**Initial advice I gave was wrong.** I said Testing publishing status bypasses verification for branding display — it doesn't. Dylan switched to Testing in Incognito and still saw the Supabase URL on the consent screen. The "Verification status" panel in the Branding UI was telling us the truth from the start: *"Your branding needs to be verified before it can be shown to users."*

The corrected understanding (verified live 2026-05-17):
- **External-audience apps require Google verification before any branding (App name OR logo) displays to users.**
- The Testing publishing-status carve-out (no verification required) applies to *access* — Google won't block sign-in for users on the test list — but it does NOT affect branding display.
- Until verification completes, Google shows the OAuth client's redirect URI host (the Supabase URL) as the destination on the consent screen, regardless of what's configured in Branding.

### C.10.1 Wrong-project theory ruled out

To eliminate the possibility that Branding edits were happening in a different Cloud project than the one Supabase's OAuth client lives in:
- Dylan pulled the Client ID from Supabase Dashboard → Authentication → Providers → Google: `435455306082-l0ahu0e4l5ri2mq6egg9tdra74smg617.apps.googleusercontent.com`
- The prefix `435455306082` is the project number of whichever Cloud project owns this Client ID.
- Dylan confirmed the Finds project's project number is also `435455306082` (Project ID: `saves-495818`, listed under the `dylandibona.com` Workspace organization).
- **Same project.** The wrong-project theory is dead. Branding is configured correctly; the gate is verification.

### C.10.2 The three resolution paths

| Path | Effect | Requirements | Recommended for |
|---|---|---|---|
| **A. Internal audience via Workspace** | Branding displays immediately, verification never required | Switch OAuth audience type from External → Internal. Only `@dylandibona.com` Workspace users can sign in. Requires provisioning Keelin a `@dylandibona.com` Workspace account. | If Keelin is willing to use a Workspace email |
| **B. Accept the Supabase URL during beta** | First-time consent shows `lqmjglpzrfcpnpshbjwo.supabase.co` as destination. User clicks their account, signs in, Google caches the consent so subsequent sign-ins skip the screen. | None — works as-is | Beta with ≤100 users, recommended for tonight |
| **C. Submit for verification** | Branding displays for all External users | 4-6 wk review. Real Privacy Policy URL + Terms of Service URL + screen-recording demo of OAuth flow + justification for each scope (currently just `email` + `profile` + `openid`). | Before public launch |

**Path B is the recommendation for tonight.** Keelin sees the Supabase URL once on first sign-in, clicks her Google account, is in. It's a 5-second moment, not a recurring friction.

---

## Account model — the canonical version

Three roles, three plans:

| Role | Sees `/billing`? | Pays? | What they see in app |
|---|---|---|---|
| `owner` | Full UI: plan upgrade, trial countdown, Stripe portal | Yes | Library + InvitesSection + TestersSection in `/settings` |
| `member` | "Handled by {owner}." tile only | No (owner covers seat via household plan) | Identical library experience — no billing surface |
| Solo | Same as `owner` | Yes | Same as today |

| Plan | Price (when Stripe goes live) | Used by |
|---|---|---|
| `null` + `status='free'` | $0 (12-save cap) | Default new signups |
| `'personal'` | $4/mo or $36/yr | Owners on paid plans, or comp testers during trial |
| `'household'` | $8/mo flat (up to 4) | Owners hosting a shared library |

Tester cohort path: today Dylan mints app code → friend redeems → user record stamped `acquired_via_code = 'X8K2QR…'`. 90 days later: trial expires → reverts to `'free'` → hits 12-save cap. When paid plans go live: query `SELECT * FROM users WHERE acquired_via_code IS NOT NULL`, mint each a fresh "founder" code with a TBD discount, send heads-up email before trial-end.

---

## Decisions made this session

| Decision | Rationale |
|---|---|
| Household link bypasses the beta app-code gate | Cleaner UX — invitee doesn't need two credentials |
| App codes grant 90-day Personal trial (not lifetime-free) | Lets us learn who actually uses it |
| Members see no billing UI | "Keelin sees the library, not the credit card" |
| Twitter/X enrichment branch skipped | Low scraping ROI; would ship hollow |
| Household plan renamed + flat $8/mo for up to 4 | Simpler mental model than $2/mo/seat |
| Dock always-open, "+ Find" cream pill | One tap to add; closed-by-default hurt discoverability |
| Drop the word "Finds" everywhere the logo appears | Logo is sufficient; redundant text is noise |
| OAuth verification deferred until public launch | Beta users tolerate the "unverified" once-per-account warning |
| Phase 2.1 (Anthropic streaming) deferred | High complexity, modest UX win |
| Apify Instagram still deferred | Cost decision pending Dylan's call |

---

## Blockers and resolutions log

| Issue | Symptom | Resolution |
|---|---|---|
| Worktree path confusion | Edits landed in main repo, not worktree | Copy files into worktree, `git restore` main. Lesson: always use the full worktree prefix |
| Family rename silently failed | RLS allowed UPDATE to succeed with 0 rows affected | Migration 7 fixes the self-referential typo. Defensive `.select()` in Server Action surfaces 0-rows-updated |
| TS error after pricing rename | `prices.householdMember` → `prices.household` | Updated reference in `app/api/checkout/route.ts` |
| `Record<string, unknown>` not assignable to Supabase Update | reEnrichSave canonical_data field | Explicit `Json` typing on the field |
| `html` font-family overridden by Tailwind preflight | Stratum v2 fonts not applying | Changed selector to `html, body` |
| Capture race: Keep saved partial | Tap-before-stream-complete | Gate button on `buildState.status === 'complete' \|\| 'error'` |
| iOS focus-zoom on inputs | Page zooms when field tapped | Universal `font-size: 16px !important` on touch devices |
| Library flash | Page renders → splash → page | Default splash `visible=true` so it paints from SSR |
| Detail action bar scrolling with content | Bar visible only at page bottom | Switch container from `position: sticky` to `position: fixed` |
| Re-enrich crashed on HTML entities | `&#39;` in old saves' titles | `decodeHtmlEntities()` named + numeric + Latin diacritics |
| `.next` cache corruption | ENOENT after dev build collision | Stop dev, `rm -rf .next`, restart |
| "Finds" not fully stripped | Dylan caught text in 2 surfaces I missed | Grep across codebase before claiming a rename done |

---

## What's left for tonight to actually share with Keelin

1. ✅ Branch deployed — `origin/main` HEAD is `7eed97d`
2. **Flip `BILLING_ENFORCED=true`** in Vercel env (Production + Preview)
3. Dylan completes Google OAuth consent branding (App name, logo, contact email)
4. Pre-flight Dylan's own test on phone: sign in, capture multiple URL types, refresh a broken save, household rename, mint invite link
5. Open `/settings` → "Share your household" → "New link" → copy URL → send to Keelin
6. Keelin clicks → sign in with Google → lands in shared library

---

## Deferred but ready

| Item | Why deferred | What's ready |
|---|---|---|
| **PWA Share Target validation** | Needs Dylan's phone + 30 min | Code in place; install via Safari → test sharing from Safari/Instagram/Mail |
| **Anthropic streaming for classify** | Optimization on working flow | Architecture spot at `classifyWithClaude`; switch to `messages.stream` |
| **Apify Instagram** | $30/mo + Dylan's call | Status quo: hit-or-miss captions, no comments |
| **Email-in capture (Postmark)** | Multi-hour scope | `users.capture_email` already set; `inbound_messages` schema in place |
| **Audio transcription (Whisper)** | Builds on Apify | ~$0.006/min unit economics |
| **Stripe live config** | No paying testers yet | Pricing finalized; products + price IDs need creation in Stripe Dashboard |
| **OAuth verification submission** | 4-6 week review | Needs real Privacy Policy + ToS + demo video |
| **Daily cron for trial-expiry emails** | Manual visibility sufficient for ≤10 testers | UI surfaces urgency at-a-glance in TestersSection |
| **Restrict Google Maps + Places keys** | Cloud Console toggle, 10 min | Defensive; not urgent at our usage |
| **HaveIBeenPwned leaked-password check** | 30-second Supabase dashboard toggle | Last open user-facing security advisor lint |
| **`GOOGLE_PLACES_API_KEY` in Vercel** | In `.env.local` only | Maps lookups silently fall back without it |

---

## Migrations applied this session (production DB)

```
20260517000001_invite_codes
20260517000002_acquired_via_code
20260517000003_list_acquired_users
20260517000004_household_naming
20260517000005_enrichment_errors
20260517000006_hero_image_persistence
20260517000007_fix_households_update_rls
```

All applied via Supabase MCP `apply_migration` to project ref `lqmjglpzrfcpnpshbjwo`. Source files mirrored in `supabase/migrations/`.

---

## Commit history (this session, oldest first)

```
a4a00cb  Capture coverage + invite/household system + trial warnings
9b76018  Household naming, error persistence, Claude timeout, deploy punchlist
5ec0774  Stratum v2 foundation — tokens, fonts, sigil, target screenshots
f844831  Stratum v2 — Library rebuild + floating dock
35afae0  Stratum v2 — Capture + Detail + in-spirit pass + cleanup
15ba4e9  Re-enrich + persistent hero images + HTML entity decoder
c83ca06  Stratum v2 — CHANGELOG drop 2: header pattern, Subscription, Map rebuild
dfe54a1  Polish pass: copy, icons, pricing, refresh UX, rename RLS bug
392189d  Login redesign, library splash, Shortcut copy
2fed4fd  Capture: gate Keep button until SSE complete
a7036d8  iOS Safari: prevent input focus-zoom
3e4dbfa  Logos: swap in the real Finds mark
d1e1148  Login: Google primary, email secondary, new-user microcopy
aba6d32  Login mark-only + always-open dock + dock on Detail
2e22567  Drop Finds text everywhere; revert Detail dock visibility
d0a2c99  Detail action bar: dock to viewport, not page container
7eed97d  Library splash: render from first paint, no flash
```

All on `origin/main`.
