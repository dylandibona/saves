# Shareable with Keelin today — punchlist

Living document. Updated as I work. Crossed-off items are done; the bottom of the file is what's still in your hands.

---

## Branch state

- Branch: `claude/bold-swanson-70e9ca`
- Latest commit: `a4a00cb` "Capture coverage + invite/household system + trial warnings"
- Worktree path: `.claude/worktrees/bold-swanson-70e9ca`
- Production DB: migrations 1–4 applied
- Build: clean (`npm run build` passes from worktree)
- Type-check: clean

---

## Done in code

- [x] Capture pipeline: YouTube, TikTok, Spotify, Apple Music, Apple Podcasts, Letterboxd, Goodreads — proper categorization, no more `noted` fallback for YouTube
- [x] `invite_codes` table + RLS + 4 RPCs (preview / redeem / create / generate)
- [x] `users.acquired_via_code` column — stamps the code on app-redemption so tester cohort is queryable
- [x] `list_acquired_users` admin RPC with warning-level enum
- [x] `/settings` UI to mint, copy, revoke app codes + household links
- [x] `/settings` TestersSection — color-coded urgency per tester
- [x] `/join/[code]` landing page
- [x] `/login` accepts pasted code OR `?invite=` from URL; threads through to OAuth + magic-link callbacks
- [x] `/auth/callback` redeems invite after session exchange
- [x] `/billing` hidden for members ("Handled by {owner}." tile)
- [x] `/billing` trial countdown banner with ruby/amber/teal urgency
- [x] Dylan's account upgraded to comp Personal trialing through May 17, 2027
- [x] Dylan's `display_name` set to "Dylan"
- [x] Household naming: `handle_new_user` trigger now creates "{Name}'s finds" (not the email); existing email-named households backfilled
- [x] Dylan's household renamed to "Family"
- [x] HouseholdSection rename UI in `/settings` (owner-only)
- [x] Session notes: `docs/session-notes-2026-05-17.md`

## Still in your hands

- [ ] **Push branch to GitHub** (triggers Vercel build)
  ```
  git push -u origin claude/bold-swanson-70e9ca
  ```
  Or merge to main if you want it on production directly.

- [ ] **After Vercel finishes the deploy:** flip the billing gate
  ```
  vercel env add BILLING_ENFORCED production
  # enter: true
  vercel env add BILLING_ENFORCED preview
  # enter: true
  vercel --prod   # if you want to redeploy immediately
  ```
  Without this, the free 12-save cap never bites and the comp trial is meaningless.

- [ ] **Test invite flow on production**
  1. Open `https://finds.dylandibona.com/settings`
  2. Confirm Household section shows "Family" with a Rename button
  3. In Invites section, tap "New link" under "Share your household"
  4. Copy the link
  5. Open the link in a private window or different browser — should see "Dylan is sharing their library with you"
  6. Sign in with a different Google account (or use a magic-link)
  7. Should land at `/` inside the Family household
  8. Confirm DD pill works for you, KL/their initials pill works for them

- [ ] **Send Keelin the invite link.** From your /settings, mint a fresh household code and text her the URL.

---

## Phase 2 progress

- [x] **2.2 Hard timeout on Claude call** — 20s cap. Prevents indefinite hang if Anthropic is slow; falls back to OG-only.
- [x] **2.3 Persist enrichment errors on saves** — new `enrichment_errors jsonb` column. `share-save` (iOS Shortcut path) writes a derived errors array when title/category/source signals indicate a fallback. Query: `SELECT id, title, enrichment_errors FROM saves WHERE enrichment_errors IS NOT NULL`. `addSave` (interactive form path) intentionally skipped: user already sees the result in the BuildPreview, so silent failures are not the same problem.
- [ ] **2.1 Anthropic streaming for classify call** — deferred. The win is real (title would appear while Claude is still thinking) but requires incremental JSON parsing that's bug-prone. Defer to a dedicated session after we've shaken down the current changes with real testers.

---

## Notes for the conversion moment (Day 75–90 of testers' trials)

The `TestersSection` panel in `/settings` shows urgency badges. When a tester hits "soon" (≤21 days) or "urgent" (≤7 days):

1. Decide if you want to convert them or let them revert to free.
2. If converting: mint a new code (app or household, with a discount when Stripe coupons are configured) and send it to them with personal context.
3. If letting them revert: optionally reach out so they're not surprised when they hit the 12-save cap.

Long-term: a daily Vercel cron + email when any tester crosses into "urgent" is the right add. Skipped today; manual `/settings` visibility is enough for ≤10 testers.

---

## Things explicitly NOT done this session

- Apify Instagram integration (cost gate, your call)
- Stripe coupons for the convert-with-discount mechanic (deferred until Stripe production is configured)
- PWA Share Target validation (needs your phone, 30 min when you have time)
- Twitter/X capture branch (low scraping success rate)
- Design sweep on the six laggard surfaces (you have Claude Design working on a new system)
- Spatial canvas / ⌘K / cluster summaries for library (out of scope)
