# CLAUDE.md

Guidance for Claude Code when working in this repository. Keep this file current — update it whenever new patterns, decisions, or issues are discovered.

---

## What this is

**Saves** is a personal recommendation library for Dylan and Keelin (a couple). They share restaurants, recipes, workouts, TV shows, movies, and places via Instagram DMs — those recommendations get buried and lost. Saves captures, classifies, and surfaces them in a calm, searchable library.

**Reference point:** [Recime](https://www.recime.app/), but for *every* category — not just recipes. Recime proves the "share-from-anywhere → AI-extracts-structure → beautiful library" format works for one domain (recipes); Saves widens the thesis to all of them. Same care, any save type. Implications:
- Per-category richness via the `canonical_data` JSONB column (recipes → ingredients/steps; places → hours/photos; movies → runtime/director). Schema is already shaped for this.
- The whole product is **frictionless capture** + **calm library**. The background `/api/share-save` endpoint and iOS Shortcut are the equivalent of Recime's "share from Instagram, structured" magic.
- Visual richness — hero images, jewel-tone category, real metadata. Not a list of bare links.

**Design principle:** a beautifully kept notebook, not a feed. No streaks, no engagement nudges, no gamification. The app should feel like a physical object — jewel-toned, dimensional, tactile. 80% mobile usage.

**Users:** Dylan (`dylan@dylandibona.com`) + Keelin. They share a single household in the data model. Every save belongs to the household, not an individual user.

---

## Stack (current, as-built)

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 App Router | Turbopack in dev; webpack in prod build |
| Language | TypeScript (strict) | `npx tsc --noEmit` must pass clean |
| Styling | Tailwind CSS v4 | `@import "tailwindcss"` syntax, NOT v3 plugin |
| Components | shadcn/ui (minimal use) | Only Badge, Button, Input, Label, Separator added |
| Animation | Framer Motion | Page transitions via `app/template.tsx`; chip hover/tap |
| Database | Supabase Postgres + PostGIS | RLS on all tables |
| Auth | Supabase Auth | Magic link + Apple SIWA + Google OAuth |
| Map | Google Maps JS API via `@react-google-maps/api` | Custom dark style; needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| AI | Anthropic claude-opus-4-5 | Server-side only, lazy import; graceful fallback if no key |
| Hosting | Vercel | Production: `https://saves.dylandibona.com` (Cloudflare DNS) |

**Key packages:**
- `@supabase/ssr` — SSR-safe Supabase client
- `@react-google-maps/api` — Google Maps React wrapper
- `@anthropic-ai/sdk` — lazy-imported server-side only
- `framer-motion` — animations
- `leaflet` + `react-leaflet` — installed but superseded by Google Maps; can be removed

---

## Working directory

```
/Users/dylandibona/dylan@dylandibona.com/_Code Projects/saves
```

---

## Development commands

```bash
npm run dev          # local dev (Turbopack, port 3000)
npm run build        # production build (webpack)
npm run lint         # ESLint
npx tsc --noEmit    # type-check — run this before declaring anything done

# Supabase
supabase login       # authenticate as dylandibona account — NOT Natrx
supabase link --project-ref <ref>
supabase db push --dry-run
supabase db push
supabase gen types typescript --linked 2>/dev/null > lib/types/supabase.ts
```

**After every migration:** regenerate `lib/types/supabase.ts` and commit it.

---

## File map

```
app/
  layout.tsx               — fonts (Geist, Fraunces, Space Mono, VT323, Pixelify Sans, Silkscreen),
                             gradient orbs (5 animated jewel-tone orbs), grain overlay, Leaflet CSS import
  globals.css              — Tailwind v4 @import, :root colors (oklch sapphire palette), orb keyframes,
                             .chip / .chip-off physical chip system, Leaflet overrides
  template.tsx             — Framer Motion page transition (opacity + y, 0.22s easeOut)
  middleware.ts            — Supabase session refresh + auth guard; redirects unauthenticated → /login
  page.tsx                 — Feed: Server Component, fetches getFeedSaves(), passes to FeedClient
  add/
    page.tsx               — Add save page
    add-form.tsx           — Smart URL form: debounced enrichment on paste/change/blur, controlled
                             title/note/category, touch-aware prefill, suggested note ghost text
    actions.ts             — addSave Server Action: deduplication by canonical_url, creates save +
                             capture, stores coords in canonical_data.coords
  auth/callback/route.ts   — OAuth callback: exchanges code for session, calls setUserCaptureEmail
  login/
    page.tsx               — Login page
    login-form.tsx         — Magic link + Apple SIWA + Google OAuth buttons
  map/
    page.tsx               — Map page: Server Component, fetches getMapSaves(), passes to MapClient
    map-client.tsx         — Google Maps: dark sapphire style, jewel SVG markers, category filter
                             strip, Near Me geolocation button, save card popup
  saves/[id]/
    page.tsx               — Save detail page (basic, needs expansion)

components/
  animated-wordmark.tsx    — "Saves" wordmark: 5 letters independently cycle through 3 pixel fonts
                             (Pixelify Sans, VT323, Silkscreen) on staggered timers with opacity fade
  nav.tsx                  — Sticky glass nav: AnimatedWordmark + Add/Map/Sign Out links
  feed/
    feed-client.tsx        — Client: live search (useMemo filter), Near Me + category chips,
                             Framer Motion staggered list, Chip component with ease-in-out (no spring)
    save-card.tsx          — Feed row: jewel category label, Fraunces title, thumbnail, recommender dots
    animated-feed.tsx      — (scaffolding, may be unused)
    feed-filters.tsx       — (scaffolding, may be unused)
  ui/                      — shadcn/ui primitives (badge, button, input, label, separator)

lib/
  actions/
    enrich-url.ts          — Server Action: enriches URLs via OG fetch + optional Claude classification.
                             Paths: google_maps → coord extraction + OG; instagram/youtube/generic → OG + Claude
  auth/
    set-capture-email.ts   — Sets users.capture_email after signup: {username}-{4hex}@{INBOUND_EMAIL_DOMAIN}
  data/
    household.ts           — getHouseholdId(): reads household_members for current user
    saves.ts               — getFeedSaves(householdId), getSaveById(id)
    map-saves.ts           — getMapSaves(householdId): selects saves with canonical_data.coords
  supabase/
    client.ts              — Browser Supabase client (createBrowserClient)
    server.ts              — Server Supabase client (createServerClient with cookies)
  types/
    supabase.ts            — Auto-generated from live schema — never edit manually
  utils/
    time.ts                — formatRelativeTime, CATEGORY_LABELS (display names), CATEGORY_COLORS (jewel hex)
    url-detect.ts          — detectUrlType(), extractMapsCoords(), extractMapsPlaceName()
  utils.ts                 — shadcn cn() helper

supabase/migrations/
  20260504000001_extensions.sql   — PostGIS, pg_trgm
  20260504000002_schema.sql       — all core tables + save_category enum
  20260504000003_pipeline.sql     — inbound_messages, merge_proposals, map_syncs
  20260504000004_indexes.sql      — GIN/GIST/FTS/partial indexes
  20260504000005_functions_triggers.sql — set_updated_at, update_save_capture_stats, handle_new_user,
                                          expire_merge_proposals
  20260504000006_rls.sql          — RLS enabled + all policies
```

---

## Data model

```
auth.users
  └── public.users (1:1, shared id)        capture_email set by app after signup, NULL from trigger
        └── household_members (many:many)
              └── households
                    ├── saves               canonical entry, one per real-world thing
                    │     ├── captures      every save event; trigger maintains capture_count
                    │     ├── variations    alternate versions (e.g. different cuts of a recipe)
                    │     └── save_tags
                    ├── recommenders        who put something on your radar (person, show, 'self')
                    └── tags

sources                                     global; where content lives (instagram.com, nytcooking.com)
```

### Key fields on `saves`

| Field | Notes |
|---|---|
| `category` | Postgres enum — see list below |
| `canonical_url` | Deduplicated on; unique per household |
| `canonical_data` | Free-form JSONB; coords stored as `{ coords: { lat, lng } }` from /add form |
| `location` | PostGIS geography(point,4326) — not yet written to by the app; reserved for future |
| `location_address` | Human-readable address string |
| `capture_count` | Maintained by `on_capture_insert` trigger — never update manually |
| `last_captured_at` | Maintained by same trigger |
| `hero_image_url` | OG image from enrichment |

### Categories (`save_category` enum)

```
recipe | tv | movie | restaurant | hotel | place | event |
book | podcast | music | article | product | workout | noted
```

Each has a display label in `CATEGORY_LABELS` and a jewel hex color in `CATEGORY_COLORS` (both in `lib/utils/time.ts`).

### RLS pattern

All household-scoped tables: `is_household_member(hid)` — a `SECURITY DEFINER STABLE` function.
`captures`, `variations`, `save_tags` don't carry `household_id` — their RLS joins through `saves`.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | From Supabase dashboard → Project Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server-only. Never reference in client code or expose via API routes.** |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | yes for /map | Enable Maps JavaScript API in Google Cloud Console (same project as OAuth). Restrict key to domain + Maps JS API. |
| `ANTHROPIC_API_KEY` | no | If absent, enrichment falls back to OG heuristics. Model: claude-opus-4-5. Server-side only. |
| `INBOUND_EMAIL_DOMAIN` | yes | Domain for capture emails. Placeholder: `in.saves.app`. |

---

## Design system

### Colors

Base background: `oklch(0.10 0.08 262)` — deep sapphire, never black, always jewel-toned.

```css
:root {
  --background: oklch(0.10 0.08 262);   /* deep sapphire */
  --foreground: oklch(0.93 0.008 80);
  --muted:      oklch(0.18 0.06 262);
  --border:     oklch(0.26 0.06 262);
}
```

Five animated gradient orbs (fixed, z-index -10): teal-emerald, amber-gold, ruby, deep violet, sapphire. They drift + scale + opacity-pulse on independent timers (28–55s).

### Typography

| Role | Font | Variable |
|---|---|---|
| Body / UI | Geist | `--font-sans` |
| Content titles | Fraunces (variable, optical-size 144) | `--font-serif` |
| Wordmark italic | Fraunces italic | `font-serif-display` class |
| Labels / meta / monospace | Space Mono | `--font-mono` |
| Wordmark pixel A | Pixelify Sans | `--font-pixel-b` |
| Wordmark pixel B | VT323 | `--font-pixel-a` |
| Wordmark pixel C | Silkscreen | `--font-pixel-c` |

### Chips (`.chip` / `.chip-off`)

Physical, dimensional — like semi-gloss plastic buttons. Rules:
- **Inactive:** neutral dark plastic, white/15 border, bottom-edge shadow, top gloss highlight
- **Active:** full saturated jewel color (`${color}f0` → `${color}cc` gradient), dark text (`oklch(0.10 0.09 262)`), depth shadows only — **no glow, no color box-shadow spread**
- **Hover:** `scale(1.025)`, slightly brighter border — **no spring physics, no y-axis bounce**
- **Tap:** `scale(0.97)` — ease-in-out only
- Transitions: `0.16s ease-in-out` or CSS `transition: ... 0.18s ease-in-out`

### Iconography

No basic emoji anywhere in UI. Use SVG icons or typographic Unicode markers (◈ ◎ ◉ ○). Detected badges in the add form use `◈ ◎ ◉ ○` prefixes.

### Animated wordmark

`components/animated-wordmark.tsx` — each letter of "Saves" independently fades between Pixelify Sans, VT323, and Silkscreen on staggered timers (2.8–4.6s intervals, ~130ms crossfade). Layout-stable: fixed container height (34px), per-letter `minWidth`.

---

## URL enrichment pipeline (live, Sprint 1)

`lib/actions/enrich-url.ts` is a Server Action called from the `/add` form on URL paste/change/blur (300ms debounce). Non-blocking — uses `useTransition`.

**Decision tree:**
```
URL pasted
  → detectUrlType()
      ├── google_maps → extractMapsCoords() + extractMapsPlaceName() + fetchOgData()
      │                 → category heuristic (restaurant/hotel/place keywords)
      │                 → source: 'google_maps', confidence: 'high'
      ├── instagram   → fetchOgData() → classifyWithClaude() (if ANTHROPIC_API_KEY set)
      │                 → source: 'ai' or 'og'
      ├── youtube     → fetchOgData() → category: 'noted' (let user override)
      └── generic     → fetchOgData() → classifyWithClaude() (if key set)
                        → source: 'ai' or 'og'
```

**Prefill behavior (touch-aware):**
- Title: prefilled unless `titleTouched.current`
- Category: pre-selected if confidence is 'high' or 'medium'
- Note: shown as ghost placeholder text (`suggestedNote`) unless `noteTouched.current`
- Coords: stored in hidden `<input name="coords">` field, written to `canonical_data.coords` in the Server Action

---

## Auth

- Magic link, Apple SIWA, Google OAuth — all configured in Supabase dashboard
- Apple SIWA requires a pre-generated JWT client secret (see `generate-apple-secret.mjs`, a one-time utility)
- OAuth callback at `/auth/callback/route.ts` — exchanges code → session, then calls `setUserCaptureEmail`
- Middleware (`middleware.ts`) refreshes session on every request and guards all non-auth routes
- `getUser()` is used (not `getSession()`) per Supabase SSR docs

---

## Map

- **Provider:** Google Maps JS API via `@react-google-maps/api`
- **Tile style:** Custom deep-sapphire dark style array in `map-client.tsx` — matches `oklch(0.10 0.08 262)` palette
- **Markers:** Custom SVG spheres with radial gradient fill in category jewel colors, passed as data URLs
- **Data source:** `getMapSaves()` queries `saves` where `canonical_data` is not null, then filters JS-side for rows with `canonical_data.coords`
- **Note:** `saves.location` (PostGIS geography column) is NOT yet written to; coordinates live in `canonical_data.coords` only
- **Near Me:** calls `navigator.geolocation`, flies map to user location, adds a teal marker
- **Category filter:** shows only categories that have at least one save with coords
- **Leaflet:** package is still installed but unused — can be removed

---

## Known issues and TODOs

### Bugs / gaps

| Issue | File | Notes |
|---|---|---|
| `saves.location` never written | `app/add/actions.ts` | Coords go to `canonical_data.coords` only; PostGIS `location` field stays null. Should backfill and write both. |
| Leaflet CSS globally imported | `app/layout.tsx` | `leaflet/dist/leaflet.css` imported even though Leaflet is no longer used. Remove after confirming Google Maps works. |
| `leaflet` + `react-leaflet` in deps | `package.json` | Can be removed now that Google Maps is the map provider. |
| `animated-feed.tsx` + `feed-filters.tsx` | `components/feed/` | Scaffolding components, likely unused. Verify and delete. |
| `saves/[id]/page.tsx` is bare | `app/saves/[id]/` | Save detail page needs a real design: hero image, category chip, notes, captures timeline, open-in-maps button. |
| YouTube category defaults to 'noted' | `enrich-url.ts` | Intentionally weak — but Claude could classify youtube.com/watch URLs better by channel/title. |
| Google Maps shortened URLs (`maps.app.goo.gl`) | `url-detect.ts` | `extractMapsCoords()` returns null for shortened URLs — they require a follow/redirect to get the full URL with coordinates. |
| No loading state on /map without API key | `map-client.tsx` | Shows a plain error message. Could be more graceful. |

### Sprint 2 priorities (not built yet)

| Feature | Complexity | Notes |
|---|---|---|
| **PWA Share Target** | Low | `manifest.json` + `share_target` + `POST /share` route handler. Lets "Saves" appear in iOS/Android share sheet from Instagram. Most impactful mobile feature. |
| **iOS Shortcut** | Trivial | Share sheet shortcut: input URL → open `https://saves.app/add?url=[input]`. Works today with no infrastructure. |
| **Email ingest (Postmark)** | Medium | Inbound email → `inbound_messages` → pipeline. `capture_email` is already generated at signup. |
| **SMS ingest (Twilio)** | Medium | Similar to email pipeline. |
| **Write PostGIS `location`** | Low | When coords are available from enrichment, write `ST_Point(lng, lat, 4326)` to `saves.location`. Enables future PostGIS proximity queries for Near Me. |
| **Near Me geolocation filter** | Medium | Current "Near Me" chip shows all saves. Real implementation: `ST_DWithin(location, ST_Point(userLng, userLat, 4326), radiusMeters)` in Supabase query. Requires `saves.location` to be populated. |
| **Save detail page** | Medium | Full design for `/saves/[id]`: hero, category, captures timeline, note, open-in-maps / open-link buttons, delete. |
| **Merge proposal UI** | Medium | Schema exists (`merge_proposals`), no UI. When two saves are near-duplicates, show a card for review. |
| **Household invite** | Medium | Schema supports multi-member households. Need invite flow UI. |
| **Deduplication pipeline** | High | Full classifier + match step. Currently only exact `canonical_url` match in manual add. |
| **Instagram enrichment improvement** | Low | Claude gets no image from Instagram OG (they block scrapers). Consider Apify or a headless browser approach. |
| **maps.app.goo.gl coord resolution** | Low | Follow the redirect server-side to get the full URL, then extract coords. |

### Design / UX debt

| Issue | Notes |
|---|---|
| Save detail page is placeholder | Needs real design treatment |
| No empty state for feed first-time users | Should prompt to add first save with more warmth |
| No error feedback on /add form failures | Server Action throws but no client error display |
| No optimistic updates on save | Form submits, redirects — no skeleton/loading |
| Search only covers title + subtitle | Could search note, location_address, category label |
| Chip color contrast | Dark text on jewel chips — check WCAG at all category colors, especially yellow (#ffe566) |

---

## Coding conventions

### Server vs Client

- **Server Components by default.** `'use client'` only for state, interactivity, browser APIs.
- **All Anthropic API calls** must be in Server Actions or Route Handlers. Never client components.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** or `ANTHROPIC_API_KEY` to client bundles.
- **Data fetching:** Server Components with direct Supabase calls for reads. Server Actions for mutations.
- **Async params:** `params` and `searchParams` in Next.js 15 are Promises — always `await` them.

### Supabase

- Use `createClient()` from `@/lib/supabase/server` in Server Components and Actions.
- Use `createClient()` from `@/lib/supabase/client` in Client Components.
- Never bypass `capture_count` / `last_captured_at` — maintained by trigger on `captures` insert.
- Never edit applied migrations — always write new `.sql` files.

### TypeScript

- Run `npx tsc --noEmit` before declaring any task done. Zero errors required.
- `lib/types/supabase.ts` is auto-generated — never hand-edit it.
- Import DB types as `type Database = Database['public']['Tables']['saves']['Row']` etc.

### Animations

- **No spring physics on chips.** Use `{ duration: 0.16, ease: 'easeInOut' }`.
- **No bounce (y-axis movement) on hover.** Scale only: `whileHover={{ scale: 1.025 }}`.
- **No color glow in box-shadow.** Physical depth only: bottom-edge + drop shadow + inset gloss.
- Page transitions via `app/template.tsx` — already configured.

### Styling

- Tailwind v4 syntax: `@import "tailwindcss"` not `@tailwind base/components/utilities`.
- Never write `oklch()` colors with a `/` opacity inline in Tailwind classes — use `style={}` or CSS variables.
- Category colors only appear on active/selected states — inactive chips are always neutral dark.

---

## Instagram sharing — research summary

**The private-account DM approach is not viable.** Instagram's Graph API explicitly blocks DM read access for third-party apps. Meta requires a special Business Partnership that is not available to personal apps.

**Recommended approach:**

1. **PWA Share Target** *(Sprint 2, ~1 day)* — Add `share_target` to `manifest.json`, create `POST /share` route that reads the shared URL and redirects to `/add?url=...`. Saves appears in iOS (Safari 16.4+) and Android share sheets natively. Zero friction.

2. **iOS Shortcut** *(works today, zero infrastructure)* — One Shortcut per user: "Get clipboard/share input → open `https://saves.app/add?url=[input]`". Install once, appears in every share sheet.

3. **Email to save** *(Sprint 2, Postmark)* — Each user has a personal `capture_email`. Forward any link there. Infrastructure already scaffolded (`inbound_messages` table, `capture_email` column).

The shortcut is the fastest path to saving from Instagram today. PWA Share Target makes it fully native and is the right Sprint 2 investment.

---

## Supabase account note

Always use the **dylandibona** Supabase account, not Natrx. Confirm before `supabase login` or `supabase link`.

---

## Available design skills (local, gitignored)

Two design skills live in this directory but are excluded from the repo. **Use them whenever Dylan asks for design evolution, hi-fi prototyping, design exploration, expert review, or anti-slop frontend improvements.** Don't use them for routine implementation — they're for design-direction work.

- **`huashu-design/`** — HTML-based hi-fi prototyping, design philosophy advisor, expert 5-dimensional review. Includes 24 prebuilt showcases (8 scenarios × 3 styles), 5 schools × 20 philosophies (Pentagram / Field.io / Kenya Hara / Sagmeister / etc.), anti-AI-slop checklist, iOS/mobile prototyping conventions, Playwright validation, animation → MP4/GIF export. Read `huashu-design/SKILL.md` first when invoking.
- **`taste-skill/`** — Portable Agent Skills that upgrade AI-built UIs: stronger layout, typography, motion, spacing instead of boilerplate. Includes image-generation skills for reference boards. Read `taste-skill/README.md` and the `skills/` subfolder when invoking.

**When to reach for these:** Dylan asks for "the design needs to evolve", "let's rethink X", "build a hi-fi prototype", "review this design", "design exploration", "make it feel more considered", or anything similar where the *direction* matters more than the *implementation*. For routine "fix this CSS" or "build this component" tasks, just do the work directly.
