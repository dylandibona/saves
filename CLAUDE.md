# CLAUDE.md

Guidance for Claude Code when working in this repository. **Keep this file current** — update it whenever new patterns, decisions, or issues are discovered. The next session reads this first.

> **Status:** Working private build for Dylan + Keelin. Not yet "production, general-public ready." See [The gap to production-public](#the-gap-to-production-public) before scoping new work.

---

## 1. What this is

**Finds** is a personal recommendation library. The destination, not a bookmark. The save itself contains enough context (ingredients, sets, hours, summary, hero image) that the user never has to click through to the source again.

**Origin story:** Dylan and Keelin (a couple) share restaurants, recipes, workouts, TV shows, movies, and places via Instagram DMs. Those recommendations get buried and lost. Finds captures, enriches, and surfaces them in a calm, searchable library shared between them.

**Reference point:** [Recime](https://www.recime.app/), but for *every* category — not just recipes. Recime proves the "share-from-anywhere → AI-extracts-structure → beautiful library" format. Finds widens the thesis to all find types: recipes, restaurants, places, hotels, shows, articles, workouts, products, podcasts, music, books.

**Design principle:** a beautifully kept notebook, not a feed. No streaks, no engagement nudges, no gamification. The app should feel like a physical object — jewel-toned, dimensional, tactile. 80% mobile usage.

**Vision tension to navigate:**
- *Frictionless capture* (share from anywhere → in) vs *meaningful structure* (per-category extracted data)
- *Personal/household* (D + K) vs *production/public* (multi-tenant, polished onboarding) — see Section 8

---

## 2. Production environment

| Surface | Where | Notes |
|---|---|---|
| App | `https://saves.dylandibona.com` | Cloudflare DNS → Vercel |
| Repo | `https://github.com/dylandibona/saves` | dylandibona personal account; commits authored as `Dylan DiBona <dylan@dylandibona.com>` |
| Vercel project | Personal "dbone" account, project name `saves` | Hobby tier, "Dylan's projects" team |
| Supabase project | ref `lqmjglpzrfcpnpshbjwo` | Account: dylandibona (NOT Natrx) |
| Google OAuth | Cloud Console project (legacy name "Saves") | Authorized origins: `saves.dylandibona.com` (will need `finds.dylandibona.com` once domain swaps). Authorized redirect URI: `https://lqmjglpzrfcpnpshbjwo.supabase.co/auth/v1/callback` |
| Google Maps API | Cloud Console project (legacy name "Saves") | Maps JavaScript API enabled. Currently unrestricted — needs HTTP referrer restriction. |

---

## 3. Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15.5.15 App Router | Turbopack in dev, **webpack in prod** (Turbopack prod build is unstable on Vercel) |
| Language | TypeScript (strict) | `npx tsc --noEmit` must pass clean before pushing |
| Styling | Tailwind CSS v4 | `@import "tailwindcss"` syntax, NOT v3 plugin |
| Components | shadcn/ui (minimal) | Only Badge, Button, Input, Label, Separator added |
| Animation | Framer Motion | Page transitions via `app/template.tsx`; chip hover/tap (no spring, no glow — see design rules) |
| Database | Supabase Postgres + PostGIS | RLS on all tables |
| Auth | Supabase Auth | Magic link + Google OAuth. Apple SIWA was removed — too much config friction (domain verification file, JWT generation, Services ID maintenance). |
| Map | Google Maps JS API via `@react-google-maps/api` | Custom dark style. Needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| AI | Anthropic claude-opus-4-5 | Server-side only, lazy import; graceful fallback if no key |
| Hosting | Vercel | Production: `https://saves.dylandibona.com` |
| Image generation | sharp | DevDep only; `npm run icons` regenerates PWA icons from SVG |

### Why no middleware
We deleted `middleware.ts` because Vercel's Edge runtime kept crashing with `__dirname is not defined` (root cause: `next.config.ts` had `path.resolve(__dirname)`; ESM module loading didn't have it). After multiple attempted fixes including switching to Node.js runtime, the bulletproof solution was to remove middleware entirely and gate auth in pages via `lib/auth/require-user.ts`. Don't reintroduce middleware without testing on Vercel first.

### What was tried and abandoned
- **Leaflet + Carto Dark Matter tiles** — first map provider, replaced by Google Maps for richer interaction + familiar UX. `leaflet`, `react-leaflet`, `@types/leaflet` removed from deps; CSS overrides removed from globals.css.
- **`next build --turbopack`** — Turbopack production builds were causing silent failures on Vercel. Stable webpack build works fine.
- **iOS Shortcut WebView sheet** — opens a sheet over Instagram, but breaks on first-login because 2FA forces an app-switch and the sheet collapses. Replaced by background `/api/share-save` API.
- **iOS Shortcut "Open URLs"** — opens default browser (Chrome for the user), not a sheet. Acceptable only if PWA is installed — then iOS routes the URL to the standalone PWA app instead.

---

## 4. What's actually shipped + verified

End-to-end tested in production by Dylan unless noted otherwise:

| Feature | Status | Notes |
|---|---|---|
| **Sign in via Google OAuth** | ✅ Working | 2FA flow completes; user lands in feed |
| **Sign in via magic link** | ⚠️ Configured, not verified | Should work — same Supabase setup |
| **Feed at `/`** | ✅ Working | Live search, jewel-tone category chips (filtered to categories that have saves), staggered framer-motion animation, save cards with hero image + DD/KL initials pill + lock icon for private saves |
| **Add at `/add`** | ✅ Working | Smart URL enrichment fires on paste/blur with 300ms debounce. Hero image + subtitle preview surface. Hidden inputs forward title/subtitle/hero/coords/extracted to action. |
| **Add — Google Maps URLs** | ✅ Working well | Resolves shortened `maps.app.goo.gl/...` URLs via fetch+redirect. Extracts `@LAT,LNG` from path AND from `!3dLAT!4dLNG` data params. Place name from `/maps/place/...`. Claude classifies as restaurant/hotel/place/event with confidence. |
| **Add — Instagram URLs** | ⚠️ Partially working | Uses `facebookexternalhit/1.1` UA for richer OG. Title falls back to `username's Reel` or `Instagram Reel` if Instagram blocks scraping. Captions hit-or-miss. Image usually loads. |
| **Add — generic article/recipe URLs** | ✅ Working well | OG metadata + Claude classification; recipe sites with JSON-LD parse cleanly. |
| **Per-category extraction** | ✅ Shipped, not heavily tested | Claude pulls ingredients/instructions/time for recipes; exercises/sets/duration/equipment for workouts; address/hours/phone/website for places; author/summary/readTime for articles; year/runtime/director for movies; etc. Stored in `canonical_data.extracted`. |
| **Save detail page** | ✅ Working | Hero image, jewel category chip, Fraunces title, captures timeline with DD/KL initials pill OR external recommender dot, action row (Open URL / Open in Maps / View on Map / Delete), per-category extracted section. Lock icon when private. |
| **Map at `/map`** | ✅ Working | Custom dark sapphire Google Maps style. Jewel SVG markers per category. Tap marker → bottom-sheet card. "Near Me" geolocation button. Category filter strip. Empty state when no saves have coords. |
| **Save visibility toggle** | ✅ Working | Shared (default) vs Just me. RLS enforced at DB level — partner literally can't see private saves. Lock icon shown in feed and detail. |
| **Delete save** | ✅ Working | Confirmation modal (Framer Motion). Soft-delete via `status='archived'` so dedup logic doesn't resurrect on re-add. |
| **DD/KL identity pills** | ✅ Working | Initials chip in user color on feed + detail. Mapping in `lib/utils/identity.ts` — explicit `dylan→DD, keelin→KL` overrides; falls back to email local part. |
| **Animated wordmark** | ✅ Working | "Finds" letter-by-letter cycles between Pixelify Sans, VT323, Silkscreen on staggered timers. |
| **Settings page at `/settings`** | ✅ Working | Token generate/show/copy/regenerate. Step-by-step Shortcut config (instructions need work — see backlog). |
| **`POST /api/share-save`** | ✅ Working server-side | Token auth, runs enrichment, dedups by canonical_url, creates save + capture. Logs to Vercel runtime. Not yet integrated end-to-end with a working Shortcut. |
| **PWA manifest + share_target** | ⚠️ Manifest configured, not yet validated end-to-end | When installed via Safari "Add to Home Screen", iOS share sheet should route shares to the PWA app. Needs install + test. |
| **PWA icons** | ✅ Working | SVG (noun-s-block tetris-S on sapphire jewel base) + 192/512 maskable PNGs + 180px apple-touch-icon + 32px favicon, all generated from `public/icon.svg` via `npm run icons`. |
| **Sign out** | ✅ Working | Server action via Nav component. |

---

## 5. What's rough or unverified

| Area | What's rough | Why it matters |
|---|---|---|
| **iOS Shortcut config** | Apple's Shortcuts UI varies by iOS version; the manual setup walkthrough on `/settings` doesn't match what users actually see. User got stuck mid-config. | This was supposed to be the "stays in Instagram" path. Replacement: distribute a pre-built `.shortcut` via iCloud share link (one-tap install), or rely on PWA Share Target instead. |
| **PWA Share Target** | Code is in place (`public/manifest.json` + `app/share/route.ts`) but never validated end-to-end on a real device. | Primary path forward for "share from Instagram" UX — needs installation + test. |
| **Existing pre-extraction finds** | Finds created before the extraction feature have empty `canonical_data.extracted`. No backfill or re-process action exists. | First few finds Dylan made look threadbare on the detail page. Workaround: delete + re-share. |
| **Keelin onboarding** | She hasn't signed up yet. Needs to go through Google/magic-link flow. Her self-recommender will be created by the trigger but `display_name` won't be set; identity helper has hardcoded `keelin→KL` mapping that depends on her email containing "keelin". | Single-user app right now. |
| **Google Maps API key** | Currently unrestricted. Anyone can use it from any domain by reading the bundle. | Security/billing risk — should restrict to `saves.dylandibona.com/*` (and `localhost:3000/*` for dev). |
| **Hardcoded user mappings** | `lib/utils/identity.ts` has explicit `dylan→DD, keelin→KL` matched by email substring. | Fine for two known users; doesn't scale to public sign-ups. Need real user `display_name` field used + fallback initials computed from name parts. |
| **No edit save UI** | Once saved, can't edit title/category/note/visibility from the UI. Must delete + re-add. | Mid-priority polish gap. |
| **No Keelin invite flow** | Schema supports multi-member households (`household_members`, only owners can invite per RLS) but there's no UI for invitations. | Workaround: Keelin signs up, gets her own household; we'd manually move her into Dylan's household via SQL. |
| **No external recommender UI** | Can't add a non-self recommender (e.g., "saved because @julia.cooks recommended it"). Schema is there. | Sprint 2 — currently only "self" captures show up. |
| **Variations / merge proposals** | Schema exists, no UI. | Sprint 2+. |
| **No error tracking** | Vercel runtime logs only. No Sentry, no aggregated error visibility. | Production risk. |
| **No analytics** | Don't know what's being saved, by whom, how often. | Acceptable for personal use; not for public product. |

---

## 6. Hard stops / known broken things

| Issue | Notes |
|---|---|
| Existing saves missing extraction | No backfill. Re-share to enrich. |
| Map shows nothing for non-place saves | Expected — map only renders saves with `canonical_data.coords`. Empty state shown when zero. |
| Instagram captions often missing | Instagram blocks scrapers heavily. We get OG title/image/description sometimes; captions rarely. Real fix: Apify or headless browser. |

---

## 7. Backlog — open friction points

| Item | Effort | Notes |
|---|---|---|
| Distribute pre-built iOS Shortcut via iCloud link | Low (manual export from Dylan's phone) | Replaces the broken manual Shortcut walkthrough on `/settings`. One-tap install for users. |
| Validate PWA Share Target on iOS | Low (just install + test) | Most likely the primary share path going forward. |
| Reprocess action for existing saves | Low | Endpoint that re-runs `enrichUrl()` on a save and updates fields. Useful for backfill + manual "refresh" UX. |
| Edit save UI | Medium | Per-field editing on detail page — title, category, note, visibility. |
| Keelin sign-up + add to Dylan's household | One-time SQL | Keelin signs up, then run `UPDATE household_members SET household_id = '<dylans>' WHERE user_id = '<keelins>'` and delete her solo household. |
| Restrict Google Maps API key | Low (Cloud Console) | Add HTTP referrer restriction to `saves.dylandibona.com/*`. |
| Recipe-specific JSON-LD parser | Medium | Many recipe sites have schema.org Recipe markup. Already passing JSON-LD to Claude; could parse explicitly for higher reliability and zero AI cost. |
| Better Instagram extraction | High (Apify or Browserless) | Real captions, comments, full data. Costs money. Necessary for "the workout in the comments" use case. |
| External recommender attribution UI | Medium | Choose recommender at save time; show their name + color in feed. |
| Tags / lists / collections | Medium | Schema supports tags, no UI. |
| Map clustering | Low | When many places, markers overlap. |
| Inbound email pipeline (Postmark) | High | Send a link to your `capture_email` → save lands. Schema (`inbound_messages`) is there, no integration. |
| Inbound SMS (Twilio) | High | Same pattern. |

---

## 8. The gap to production-public

This is the question for the next planning session. Today the app works for two specific users. To open it to the general public, these need to exist:

### Must-have for public launch

| Area | Gap |
|---|---|
| **Sign-up flow** | New users today get a household + self-recommender via the `handle_new_user` trigger. The `capture_email` is set by the auth callback. **Untested with multiple non-D+K accounts.** |
| **Onboarding** | After sign-in there's no welcome state, no "save your first thing" walkthrough, no explanation of features. New users see an empty feed. |
| **Account settings** | Display name, email, password (for non-OAuth), profile picture. Currently no way to edit any of this. |
| **Account deletion** | GDPR/CCPA requirement. No flow exists. |
| **Data export** | "Download my saves" — JSON or CSV. Required by law in some jurisdictions. |
| **Privacy policy + Terms of Service** | Static pages. Need real ones (not Lorem ipsum). |
| **Cookie consent / GDPR banner** | Required if serving EU users. |
| **Email verification UX** | Supabase handles the flow; needs UX testing for "what happens if user closes the email link tab". |
| **Password reset** | Magic link covers it for that path; need to verify across all auth methods. |
| **Rate limiting on `/api/share-save`** | Anyone with a token can hammer it. Need per-token-per-minute limits. Vercel KV or upstash. |
| **Token revocation UI** | Settings only allows regenerate (which invalidates old). No "list of active tokens" or per-device naming. |
| **Multi-household model** | Each user starts in their own household. Inviting another user (partner, roommate) into a household needs UI: send invite → accept → merge. |
| **Solo-user UX** | Currently the household model assumes you're sharing. A solo user (no partner) sees DD pills next to all their saves — possibly weird. Consider hiding initials when household has 1 member. |
| **Error tracking** | Sentry or similar. |
| **Analytics** | Plausible (privacy-respecting) or Posthog. Need to know retention, what's being saved, where it falls down. |
| **Status page / uptime** | Cron pinging key endpoints; status.saves.app or similar. |
| **Marketing landing page** | The current `/` is the feed (auth-gated). A logged-out visitor sees the login page. There should be a marketing page at `/` for unauth users explaining the product. |
| **App Store / Google Play** | Long-term: native apps. PWA is fine for v1 of public release. |

### Should-have for early-public launch

| Area | Gap |
|---|---|
| **Better empty states** | "No saves yet" — instead of "Add your first save →", more thoughtful guidance per category. |
| **Better Instagram extraction** | The "kettlebell workout in the comment" use case fails because IG blocks comment scraping. Apify is the answer; ~$30/mo for hobby tier. |
| **Share a single save publicly** | "Send this restaurant to a friend" via a public-readable URL. Schema gate: would need a `public_share_id` on saves. |
| **iOS app or polished PWA** | Native PWA install on iOS works but feels like a webapp. A WrapperKit / Capacitor wrapper would smooth the edges. |
| **Push notifications** | "Keelin saved a place near you" or weekly digest. Requires service worker + push subscription. |
| **Search at scale** | Current search is `useMemo` on all loaded saves. Fine for hundreds; breaks at thousands. Need server-side full-text (`pg_trgm` already in extensions). |
| **Feed pagination / virtualization** | Today loads everything. Fine until 500 saves; degrades after. |

### Nice-to-have

- Tags / lists / collections
- "Trip mode" — save bundle for a specific trip (Italy 2026)
- "Workout fullscreen" — execute a saved workout with timer/rest periods
- Map sync — push saves to Google My Maps or similar
- Subscription / pricing if applicable (probably free tier + paid for inbound email/SMS or higher caps)

### Explicitly NOT in scope

- Streaks, achievements, badges, gamification of any kind
- Public feed of all users' saves
- Social graph (followers, following)
- Comments on saves
- Anything resembling Pinterest/Instagram social

---

## 9. Working directory

```
/Users/dylandibona/dylan@dylandibona.com/_Code Projects/saves
```

---

## 10. Development commands

```bash
# Next.js
npm run dev          # local dev (Turbopack, port 3000)
npm run build        # production build (webpack — DO NOT add --turbopack)
npm run lint         # ESLint
npx tsc --noEmit    # type-check — must pass before pushing
npm run icons        # regenerate PWA icons from public/icon.svg

# Supabase (CLI — optional now that we have MCP)
supabase login
supabase link --project-ref lqmjglpzrfcpnpshbjwo
supabase db push --dry-run
supabase db push
supabase gen types typescript --linked > lib/types/supabase.ts

# Migrations applied via Supabase MCP can be confirmed:
#   list_migrations -- shows what's actually in the live DB
#   apply_migration -- applies SQL directly (matches migrations folder)
```

**Type generation rule:** after every migration (file or MCP), regenerate `lib/types/supabase.ts` and commit.

---

## 11. File map

```
app/
  layout.tsx               — Fonts (Geist, Fraunces, Space Mono, VT323, Pixelify Sans, Silkscreen),
                             gradient orbs (5 animated jewel-tone), grain overlay, manifest, icons,
                             metadataBase=https://saves.dylandibona.com
  globals.css              — Tailwind v4 @import, :root oklch sapphire palette, orb keyframes,
                             .chip / .chip-off physical chip system
  template.tsx             — Framer Motion page transition (opacity + y, 0.22s easeOut)
  page.tsx                 — Feed: Server Component, fetches getFeedSaves(), passes to FeedClient
  add/
    page.tsx               — Add page; reads ?url= search param; calls requireUser
    add-form.tsx           — Smart URL form, hidden enrichment inputs, visibility toggle
    actions.ts             — addSave Server Action: dedup, capture creation, canonical_data composition
  api/
    share-save/route.ts    — POST endpoint for iOS Shortcut. Token auth via Authorization Bearer header.
                             Runs enrichUrl, creates save + capture, returns success JSON.
                             Logs to Vercel runtime as [share-save] ok/warn/crash.
  auth/callback/route.ts   — OAuth/magic-link callback. Exchanges code for session.
                             Sets capture_email if absent. Honors ?next= for share-target flow.
  login/
    page.tsx               — Login route
    login-form.tsx         — Magic link + Google buttons. Threads ?next= through emailRedirectTo
                             and OAuth redirectTo so post-login the user lands back where they came from.
  map/
    page.tsx               — Map route; calls requireUser (via getHouseholdId redirect)
    map-client.tsx         — Google Maps with dark sapphire style, jewel SVG markers,
                             category filter strip, Near Me button, save card popup
  saves/[id]/
    page.tsx               — Save detail; renders ExtractedSection + captures timeline
    delete-button.tsx      — Confirmation modal client component
    actions.ts             — deleteSave: soft-archive via status='archived'
  settings/
    page.tsx               — Token generation, copy, Shortcut instructions (instructions need work)
    token-section.tsx      — Token UI with copy + regenerate confirmation
    actions.ts             — generateShareToken: calls Supabase RPC generate_share_token()
  share/route.ts           — PWA share_target endpoint. Scans url/text/title params for an http(s)
                             URL, redirects to /add?url=... so the form flow takes over.

components/
  animated-wordmark.tsx    — Letter-by-letter font morph (Pixelify Sans / VT323 / Silkscreen)
  nav.tsx                  — Sticky glass nav: AnimatedWordmark + Add/Map/Settings/Sign Out
  feed/
    feed-client.tsx        — Live search, Near Me + filtered category chips (only with content),
                             Framer Motion staggered list, Chip with ease-in-out (no spring, no glow)
    save-card.tsx          — Feed row: jewel category label, Fraunces title, lock icon for private,
                             SaverPills (DD/KL initials), thumbnail
    animated-feed.tsx      — Probably unused scaffolding (verify + delete)
    feed-filters.tsx       — Probably unused scaffolding (verify + delete)
  saves/
    extracted-section.tsx  — Per-category structured display: recipes (ingredients/instructions),
                             workouts (exercise cards), places (hours/address/website),
                             articles (author/summary), movies (year/runtime/director), etc.
  ui/                      — shadcn/ui primitives (badge, button, input, label, separator)

lib/
  actions/
    enrich-url.ts          — Server Action. Detects URL type. Resolves shortened maps URLs.
                             Uses facebookexternalhit UA for Instagram. Sends OG + page text + JSON-LD
                             to Claude with category-specific extraction prompt. Returns EnrichedUrl
                             with title/subtitle/category/imageUrl/coords/extracted.
  auth/
    require-user.ts        — Server-side auth gate. Replaces middleware. redirect to /login?next=...
                             if no user.
    set-capture-email.ts   — {username}-{4hex}@{INBOUND_EMAIL_DOMAIN} setter for new users
  data/
    household.ts           — getHouseholdId(): reads household_members for current user
    saves.ts               — getFeedSaves(householdId), getSaveById(id) — both pull captures→users
                             for DD/KL identity rendering
    map-saves.ts           — getMapSaves(householdId): saves with canonical_data.coords
  supabase/
    client.ts              — Browser client (createBrowserClient)
    server.ts              — Server client (createServerClient with cookies)
  types/
    supabase.ts            — Auto-generated. Regenerate via `supabase gen types` OR Supabase MCP after every migration.
  utils/
    time.ts                — formatRelativeTime, CATEGORY_LABELS, CATEGORY_COLORS
    url-detect.ts          — detectUrlType, extractMapsCoords, extractMapsPlaceName, findCoordsInText
    identity.ts            — getUserInitials (dylan→DD, keelin→KL hardcoded), getUserColor
  utils.ts                 — shadcn cn()

public/
  icon.svg                 — Source for all icons (noun-s-block tetris-S on sapphire jewel base)
  icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png — generated by npm run icons
  manifest.json            — PWA manifest with share_target → /share
  noun-s-block-1114651.{svg,png} — Original asset Dylan dropped in (basis for icon.svg)

scripts/
  generate-icons.mjs       — sharp-based PNG generation from icon.svg

supabase/migrations/
  20260504000001_extensions.sql        — PostGIS, pg_trgm
  20260504000002_schema.sql            — All core tables, save_category enum
  20260504000003_pipeline.sql          — inbound_messages, merge_proposals, map_syncs
  20260504000004_indexes.sql           — GIN/GIST/FTS/partial indexes
  20260504000005_functions_triggers.sql — set_updated_at, update_save_capture_stats, handle_new_user
  20260504000006_rls.sql               — RLS enabled, all policies
  20260510000001_save_visibility.sql   — visibility enum + created_by; RLS updated
  20260510000002_share_token.sql       — share_token column + generate_share_token() function

— gitignored, on disk only —
huashu-design/             — HTML design skill (use for design-direction work; SKILL.md inside)
taste-skill/               — Anti-slop frontend skill (use for layout/typography/motion polish)
.env.local                 — secrets (NEVER commit)
```

---

## 12. Data model

```
auth.users
  └── public.users (1:1, shared id)        capture_email set by app after signup;
        │                                  share_token nullable, generated on demand
        └── household_members (many:many)
              └── households
                    ├── saves               canonical entry, one per real-world thing
                    │     │ • visibility    'household' | 'private' (default 'household')
                    │     │ • created_by    user.id of the saver (RLS uses this)
                    │     │ • canonical_data  JSONB { coords?: {lat,lng}, extracted?: ... }
                    │     ├── captures      every save event; trigger maintains capture_count
                    │     ├── variations    alternate versions (Sprint 2 UI)
                    │     └── save_tags
                    ├── recommenders        who put something on your radar (incl. self)
                    └── tags

sources                                     global; where content lives
inbound_messages                            (Sprint 2) email/SMS landing zone
merge_proposals                             (Sprint 2) near-duplicate review queue
```

### Categories

`save_category`: `recipe | tv | movie | restaurant | hotel | place | event | book | podcast | music | article | product | workout | noted`

### `canonical_data` JSONB shape

```ts
{
  coords?:    { lat: number; lng: number }   // populated for Google Maps URLs
  extracted?: ExtractedData                   // category-specific; see lib/actions/enrich-url.ts
}
```

### RLS pattern

All household-scoped tables: `is_household_member(hid)` — `SECURITY DEFINER STABLE` SQL function.

`saves` SELECT additionally checks visibility: must be household member AND (`visibility='household'` OR `created_by = auth.uid()`).

`captures`, `variations`, `save_tags` inherit visibility through `saves` — their SELECT policies join through and apply the same visibility check.

---

## 13. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server-only.** Used by `/api/share-save` (no session cookie from Shortcut). Never expose to client. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | yes for /map | Restrict to `saves.dylandibona.com/*` (currently unrestricted — backlog) |
| `ANTHROPIC_API_KEY` | recommended | Without it, enrichment falls back to OG heuristics. Lazy-imported server-side. claude-opus-4-5. |
| `INBOUND_EMAIL_DOMAIN` | yes | Currently `in.saves.app` placeholder. Sprint 2 will need real domain (Postmark inbound). |

All set in Vercel for Production+Preview. Verified via dashboard.

---

## 14. Design system

### Colors
Base `oklch(0.10 0.08 262)` — deep sapphire, never black. Five animated gradient orbs (teal, amber, ruby, violet, sapphire) drift + scale + opacity-pulse. Grain overlay for tactile depth.

### Typography
| Role | Font |
|---|---|
| Body / UI | Geist |
| Content titles | Fraunces (variable, optical-size 144) |
| Wordmark italic display | Fraunces italic |
| Labels / meta | Space Mono |
| Wordmark animation A | Pixelify Sans |
| Wordmark animation B | VT323 |
| Wordmark animation C | Silkscreen |

### Chips (`.chip` / `.chip-off`)
Physical, dimensional. **No spring physics, no color glow, ease-in-out only.**
- Inactive: neutral dark plastic, depth shadow + gloss highlight, hover scale 1.025
- Active: full saturated jewel color, dark text (`oklch(0.10 0.09 262)`), depth shadows, no glow
- Tap: scale 0.97

### Iconography
**No emojis.** Inline SVG or typographic Unicode (◈ ◎ ◉ ○).

### Animated wordmark
`components/animated-wordmark.tsx` — each letter independently fades between 3 pixel fonts on staggered timers (2.8–4.6s, 130ms cross-fade). Layout-stable.

---

## 15. Coding conventions

- **Server Components by default.** `'use client'` only for state, interactivity, browser APIs.
- **All Anthropic API calls** in server code. Never bundle the SDK to the client.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY`** to client bundles.
- **Async params:** `params` and `searchParams` in Next.js 15 are Promises — always `await` them.
- **Type check before pushing:** `npx tsc --noEmit`. ESLint enforces `prefer-const` etc. as build errors via `next build`.
- **Migrations:** never edit applied migrations. Always write new files. Apply via Supabase MCP `apply_migration` OR `supabase db push`. Regenerate types after.
- **Animations:** `{ duration: 0.16, ease: 'easeInOut' }` pattern. No `type: 'spring'` on chips. No y-axis bounce on hover.
- **CSS:** Tailwind v4 `@import "tailwindcss"`. No v3 plugin syntax.

---

## 16. Available local design skills (gitignored)

Use these whenever Dylan asks for design evolution, hi-fi prototyping, expert design review, or anti-slop UI improvements. Don't use them for routine implementation; they're for design-direction work.

- **`huashu-design/`** — HTML hi-fi prototyping, design philosophy advisor (Pentagram / Field.io / Kenya Hara / Sagmeister-style), expert 5-dimensional review, 24 prebuilt showcases, anti-AI-slop checklist, Playwright validation, animation export to MP4/GIF. Read `huashu-design/SKILL.md` first.
- **`taste-skill/`** — Anti-slop frontend skills for AI agents. Layout/typography/motion/spacing upgrades. Includes image-generation skills for reference boards. Read `taste-skill/README.md` first.

When to reach: "the design needs to evolve", "let's rethink X", "build a hi-fi prototype", "review this", "design exploration", "make it feel more considered". For "fix this CSS" or "build this component", just do the work directly.

---

## 17. Supabase notes

- Always use the **dylandibona** Supabase account, not Natrx. Confirm before `supabase login` or any DB action.
- Project ref: `lqmjglpzrfcpnpshbjwo`.
- Migrations applied directly via the Supabase MCP `apply_migration` tool (current Claude session has access). Source files mirrored in `supabase/migrations/`.

---

## 18. Open big questions for next planning session

1. **Public vs personal — when?** Today the app works for D + K. Going public requires the work in Section 8. Is the next sprint about polishing private use OR about building the public-readiness layer?
2. **Monetization model.** Free? Paid? Freemium with inbound email/SMS gated? "Per household" pricing? Affects feature priorities heavily.
3. **iOS app or polished PWA?** PWA is fast; native iOS adds App Store discoverability + push + better share-sheet integration. ~2-3 months of additional scope.
4. **Instagram extraction strategy.** Apify (~$30/mo, real captions/comments) vs scraping (fragile, free but breaks). The "kettlebell workout in the comment" use case is unsolved without one of these.
5. **Recommender system.** "Who recommended this" is a major pillar of the UX vision but only `self` recommenders exist today. Expanding this is a meaningful design + data + UI lift.
6. **Inbound channels timeline.** Email (Postmark) and SMS (Twilio) capture were Sprint 2 plans. Both involve external service costs and onboarding flows.

These are the conversations to have before the next coding session.
