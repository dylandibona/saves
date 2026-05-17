# Session notes — 2026-05-17

Branch: `claude/bold-swanson-70e9ca`. Migrations applied to production DB. Code is built clean, ready to deploy.

This session's goal: make Finds invite-ready so Dylan + Keelin can share a library tonight, and so strangers can be onboarded as beta testers with a path to convert later. Capture pipeline gets a coverage push along the way.

---

## What shipped

### 1. Capture-pipeline coverage push

Six new media types now route through their own enrichment branches in `lib/enrichment/enrich.ts` and `app/api/enrich-stream/route.ts`:

| URL type | Detection | Strategy | Wins |
|---|---|---|---|
| **YouTube** | `youtube.com` / `youtu.be` / `m.youtube.com` / `music.youtube.com` | oEmbed (no key) + Claude classifier with `'video'` hint | Replaces hardcoded `'noted'`. Title + channel + maxres thumbnail. Claude now picks `workout` / `music` / `podcast` / `movie` / etc. correctly. |
| **TikTok** | `tiktok.com` / `vm.tiktok.com` / `vt.tiktok.com` | oEmbed + Slackbot UA fallback + canonical-URL handle extraction | Title + `@handle` subtitle. Was previously silent fall-through to generic. |
| **Spotify** | `open.spotify.com` / `spotify.link` | oEmbed + path-kind extraction (track / album / playlist / episode / show / artist) | Auto-categorizes track/album/playlist as `music`, episode/show as `podcast`. Claude pulls artist/album. |
| **Apple Music** | `music.apple.com` | Slackbot UA + `'music'` Claude hint | Categorizes as `music`. |
| **Apple Podcasts** | `podcasts.apple.com` | Slackbot UA + `'podcast'` Claude hint | Categorizes as `podcast`. Extracts `showName` / `episodeNumber`. |
| **Letterboxd / Goodreads** | Direct hostname match | Slackbot UA + `'movie'` / `'book'` Claude hint | Forces commitment to the right category. |

Architectural changes:
- `ClassifyHint` extended from `'place' | null` to a union of `'place' | 'video' | 'music' | 'podcast' | 'movie' | 'book' | null`. Each kind gets its own prompt fragment inside `classifyWithClaude`.
- New `fetchOEmbed(provider, url)` helper in `enrich.ts` with parallel-fetch support in the SSE route.
- `extractYouTubeId` / `extractSpotifyKind` / `extractTikTokUsername` exported from `lib/utils/url-detect.ts`.

Twitter/X intentionally **skipped** this session per Dylan's call — low success rate on scraping, not worth shipping a hollow branch.

### 2. Invite + household system end-to-end

This is the spine of "Keelin sees Dylan's library" and "stranger gets a beta account."

**Schema (3 migrations):**

- `20260517000001_invite_codes` — table + RLS + 4 RPCs (`generate_invite_code`, `preview_invite_code`, `redeem_invite_code`, `create_invite_code`). All SECURITY DEFINER with `search_path=''` pinning and proper `REVOKE/GRANT` per the security-hardening pattern from 2026-05-13.
- `20260517000002_acquired_via_code` — `users.acquired_via_code text` column. Updated `redeem_invite_code` to stamp the code on the user at app-code redemption. Index `idx_users_acquired_via_code` for tester-cohort queries.
- `20260517000003_list_acquired_users` — admin RPC returning the inviter's tester roster with a `warning_level` enum: `ok` / `soon` (≤21 days) / `urgent` (≤7 days) / `expired` / `inactive` / `unknown`.

**Two invite kinds, one table:**

| Kind | Purpose | Effect on redemption |
|---|---|---|
| `app` | Stranger beta gate | Caller keeps their auto-created solo household; granted `subscription_plan='personal'`, `status='trialing'`, period_end = +90 days; `acquired_via_code` stamped with the code |
| `household` | Share your library with partner/family | Caller's solo household is deleted (only if they have 0 saves); they're inserted into the inviter's household as `role='member'`; a `self` recommender is created with their display name |

A household invite link is **sufficient credential by itself** — the recipient does not also need an app code. The link bypasses the beta gate.

**UI:**
- `/settings` → `InvitesSection` (client) — mint, copy, revoke both kinds. Household codes render as full `/join/<code>` URLs; app codes render as bare 10-character codes.
- `/settings` → `TestersSection` (server) — list of redeemed app codes joined with the redeeming user's expiry and a color-coded urgency badge.
- `/join/[code]` (server) — landing page that previews the inviter ("Dylan is sharing their library with you") and routes to `/login?invite=<code>` for sign-in, or auto-redeems if user is already signed in.
- `/login` form — accepts `?invite=<code>` from URL (household link path) OR pasted code (app code path). Threads through to OAuth + magic-link callbacks.
- `/auth/callback` — after `exchangeCodeForSession`, calls `redeem_invite_code` if an `invite` param is present. On RPC failure, redirects to `/login?error=invite_invalid` so the user can paste a different code.
- `/billing` for `member` role — replaces the full UI with a "Handled by {owner}." tile. Members never see plan upgrades or billing controls.
- `/billing` for `trialing` users — shows a trial countdown banner with urgency colors (ruby ≤7 days, amber ≤21 days, teal otherwise) and clear messaging about what happens at expiry.

### 3. Dylan's account upgraded to comp Personal

One-time SQL: `UPDATE users SET subscription_plan='personal', subscription_status='trialing', subscription_current_period_end=now()+INTERVAL '365 days', display_name='Dylan' WHERE email='dylan@dylandibona.com'`. Expires 2027-05-17.

This means flipping `BILLING_ENFORCED=true` in Vercel **will not lock Dylan out** of saving (he's at 19 saves, over the free 12-save cap).

---

## Account model — the canonical version

Three roles, three plans:

| Role (`household_members.role`) | Sees `/billing`? | Pays? | What they see in app |
|---|---|---|---|
| `owner` | Full UI: plan upgrade, trial countdown, Stripe portal | Yes, on their card | Same as today, plus the InvitesSection + TestersSection in `/settings` |
| `member` | "Handled by {owner}." tile only | No (owner covers their seat via household_member add-on) | Identical library experience — no billing surface at all |
| Solo | Same as `owner` | Yes | Same as today |

| Plan | Price (when Stripe goes live) | Used by |
|---|---|---|
| `null` + `status='free'` | $0 (12-save cap) | Default new signups |
| `'personal'` | $4/mo or $36/yr | Owners on paid plans, or comp testers during trial |
| `'household_member'` | $2/mo (50% off) | Each additional seat in an owner's household, billed to the owner |

Tester cohort path:
1. Today: Dylan mints app code → friend redeems → user record stamped `acquired_via_code = 'X8K2QR…'`
2. 90 days later: friend's trial expires → status reverts to `'free'` → they hit the 12-save cap
3. When paid plans go live: query `SELECT * FROM users WHERE acquired_via_code IS NOT NULL` to find the tester cohort, mint each a fresh "founder" code with a discount TBD, send them a heads-up email before the trial-end date.

The `TestersSection` panel in `/settings` makes it visible at a glance who's approaching expiry, sorted closest-first. Manual outreach for now; a daily cron + email is a future addition.

---

## Decisions made this session

| Decision | Rationale |
|---|---|
| Household link bypasses the beta app-code gate | Cleaner UX — invitee doesn't need two credentials. The link itself IS the credential. |
| App codes grant 90-day comp Personal trial (not lifetime free) | Lets us learn who actually uses the product. Lifetime-free was an option Dylan declined. |
| Discount on conversion is deferred until Stripe is configured for production | The mechanic is well-defined (cohort identified via `acquired_via_code`) but plumbing Stripe coupons is a separate session. |
| Members see no billing UI at all | Dylan's call. Cleanest mental model: "Keelin sees the library, not the credit card." |
| Twitter/X enrichment branch skipped | Low ROI today; OG often empty, scraping fragile. Revisit if it becomes a regular share source. |
| Apify Instagram still deferred | Cost decision pending. Status quo: hit-or-miss captions, no comments. |
| `BILLING_ENFORCED=true` NOT flipped this session | Requires deploy first so users have access to invite UI before the gate activates. Dylan flips it after deploy. |

---

## The worktree/main split incident

Mid-session, file Writes used absolute paths to the main repo root (`/Users/.../saves/...`) instead of the worktree (`/Users/.../saves/.claude/worktrees/bold-swanson-70e9ca/...`). All non-types edits landed on `main` rather than the worktree branch.

**Recovery:** copied the changed files into the worktree, `git restore`d the tracked files in main, and removed the untracked new files from main. Result: main is back to baseline; all work is isolated on `claude/bold-swanson-70e9ca`.

**Lesson:** when operating in a worktree, prefer relative paths in the bash cwd, or always include the full worktree prefix in absolute paths. The session-init system message specifies the worktree path — that's the destination for every Write/Edit.

DB migrations are unaffected by this — they were applied via the Supabase MCP to the production project ref, which is shared regardless of git branch.

---

## What's left for tonight to actually share with Keelin

1. **Commit + push** branch `claude/bold-swanson-70e9ca` → triggers Vercel deploy
2. **Flip `BILLING_ENFORCED=true`** in Vercel env (Production + Preview): `vercel env add BILLING_ENFORCED production` value `true`
3. **Open `/settings` on production** → "Share your household" → "New link" → copy URL → send to Keelin
4. **Keelin clicks** → "Dylan is sharing their library with you" → Sign in with Google → lands in shared library

---

## Deferred but ready

| Item | Why deferred | What's ready |
|---|---|---|
| **PWA Share Target validation** | Needs Dylan's phone + 30 min | Code is in place; install via Safari → test sharing from Safari/Instagram/Mail |
| **Anthropic streaming for classify call (Phase 2.1)** | Optimization on already-working flow | Architecture spot identified at `classifyWithClaude` in `lib/enrichment/enrich.ts`; switch from `messages.create` to `messages.stream` and emit phased events as the JSON resolves |
| **Parallelize fetches + hard timeouts (Phase 2.2)** | Polish | Identified spots: OG fetch ↔ Places lookup, OG fetch ↔ oEmbed (already done for new media types). Universal 8s timeout cap is already in `fetchAndParse`. |
| **Persist enrichment errors on saves (Phase 2.3)** | Future debuggability | Would add `enrichment_errors jsonb` to saves + write on fallback paths. Useful once we have multiple testers and need to triage failures. |
| **Email cron warning Dylan about trials approaching expiry** | Manual visibility is sufficient for ≤10 testers | UI in `TestersSection` provides at-a-glance status. Add a daily Vercel cron + Resend/Postmark email when tester volume warrants. |
| **Stripe products configured for production** | No live testers paying yet | Pricing + comp + discount mechanic all designed. Activate when first tester wants to convert. |
| **Apify Instagram integration** | $30/mo + Dylan's call | Status quo on Instagram remains hit-or-miss. The "kettlebell-workout-in-the-comments" case still fails. |

---

## File map of this session's changes

```
New files (worktree only):
  app/join/[code]/page.tsx                    — invite landing
  app/join/[code]/actions.ts                  — redeem Server Action
  app/settings/invites-section.tsx            — invite mint/copy/revoke (client)
  app/settings/testers-section.tsx            — tester roster + warning (server)
  supabase/migrations/20260517000001_invite_codes.sql
  supabase/migrations/20260517000002_acquired_via_code.sql
  supabase/migrations/20260517000003_list_acquired_users.sql

Modified:
  app/api/enrich-stream/route.ts              — oEmbed parallel fetch, hint mapping, fallback categories
  app/auth/callback/route.ts                  — redeem invite after session exchange
  app/billing/page.tsx                        — member tile, trial countdown banner
  app/login/login-form.tsx                    — invite from URL or pasted code, callback threading
  app/login/page.tsx                          — searchParams type widened
  app/settings/actions.ts                     — createAppInviteCode, createHouseholdInviteCode, revokeInviteCode
  app/settings/page.tsx                       — wires InvitesSection + TestersSection + origin
  lib/enrichment/enrich.ts                    — YouTube/TikTok/Spotify/Apple/Letterboxd/Goodreads branches, ClassifyHint union, fetchOEmbed
  lib/types/supabase.ts                       — regenerated 3×
  lib/utils/url-detect.ts                     — UrlType union expanded; extractYouTubeId / extractSpotifyKind / extractTikTokUsername
```

---

## Commit history (after this session's commit lands)

```
HEAD  Capture + invites + household sharing (this session)
064b510 Status doc — 2026-05-17
b3d711d Supabase Security Advisor triage + hardening migration
026b981 Session notes — 2026-05-12
c124345 Saturated active pill + flat page tone + responsive hero count
573c2bb Slackbot UA for articles + featured active-verb moment
```
