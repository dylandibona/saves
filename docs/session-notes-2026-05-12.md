# Session notes — 2026-05-12

Working session between Dylan and Claude on `finds.dylandibona.com`. Eleven
commits, all pushed to `main` on `dylandibona/saves`. Production deploy on
Vercel ("Dylan's projects" team, project `saves`).

> Read this against the master plan in `CLAUDE.md` §8 ("The gap to
> production-public") and §7 ("Backlog") to assess where today's work moves
> the line, and what's still ahead.

---

## 1. What shipped

### Enrichment pipeline

| Area | Outcome |
|---|---|
| **Google Maps share URLs** (`maps.app.goo.gl/...`) | Now produce a complete save card. Three coordinated fixes — Facebook-bot UA gets through Google's consent interstitial, `extractMapsPlaceName()` learned the `?q=NAME,ADDRESS` shape iOS uses, OG title cleanup strips the new `· 4.3★(37) · Restaurant` suffix in addition to legacy ` - Google Maps`. |
| **Google Places API (New) integration** | New module `lib/enrichment/places.ts`. Place name + URL coords → Places `searchText` with a 500m location bias → first photo resolved through `skipHttpRedirect=true` so the photo URL we store is the final `googleusercontent.com` CDN URL (no API key leaks to client). Place types map to our `save_category` enum (lodging → hotel, food/drink → restaurant, theater/stadium → event, otherwise place). Wired into both the one-shot `enrichUrl()` (used by `/api/share-save`) and the phased SSE route. Skips the Claude classifier roundtrip when Places returns a hit. |
| **Cloudflare-protected publishers** (Dotdash/Meredith — foodandwine, allrecipes, eatingwell, simplyrecipes, …) | Was returning HTTP 403 with a 330KB "Simple Page" challenge body. Tested seven bot UAs against the scorpion-bowl URL; **Slackbot's link-expander UA gets HTTP 200 with the full 589KB rendered page including Recipe JSON-LD** (ingredients, HowToStep instructions, `totalTime`, `recipeYield`). `pickUserAgent()` now uses Slackbot for everything except Instagram (Facebook bot) and Google Maps (Facebook bot). |
| **`fetchAndParse` resilience** | Sends a full browser-header set (Accept-Language, sec-ch-ua, Upgrade-Insecure-Requests, etc.). No longer bails on `!res.ok` when the body is >5KB — several WAFs return 4xx with the actual content intact. |
| **AddForm double-enrichment bug** | Pasting an Instagram URL ran enrichment once on paste and a second time when "Keep" was tapped. `lastEnrichedRef` now guards the URL through paste→submit; the `onBlur` re-trigger is removed. |

### Active-verb UI moment

The 10px mono `· classifying` indicator inside the build preview chip row read
as a debug line. Replaced with a featured Fraunces-italic 26px verb in the
title slot of the build card — three dots pulsing in sequence beside it —
inspired by Claude's animated verbs. Cross-fades through
`Reading… → Distilling…` and is replaced by the real title when it arrives.
Same slot, same scale, same italic voice; the build feels like the app is
doing work *in front of you*, not running a hidden spinner.

### Home page redesign (iterated three times in-session)

1. **Pass 1** — replaced the Bricolage `Your finds` H1 with the same Fraunces
   italic `Finds.` treatment from the masthead on a saturated forest-green
   hero panel. Compact horizontal save cards (88px tall, 88×88 thumbnail on
   the left) replaced the full-bleed 16:11 hero cards. Bookplate fallback is
   a typographic letterform in the category color.
2. **Pass 2** — killed the green panel (it was repeating the wordmark right
   on top of itself, eating ~280px). Header is now `LIBRARY` eyebrow +
   oversized italic numeral + smaller serif `finds.` beside it. Color
   presence moved from the panel onto the numeral itself.
3. **Pass 3** — category pills now have a real two-state physical feel:
   *raised* (surface-2 ground + 7px category-color dot beside the label) vs.
   *pressed-in* (full saturated category color + inset shadow + dark text).
   Active pill triggers a flat full-bleed page tint
   (`color-mix(in oklch, var(--color-cat-X) 14%, var(--color-bg))`) so the
   whole viewport takes on amber / terracotta / moss / fern depending on
   what's active. Hero numeral tracks the filter — `1 find` in terracotta
   when Recipe is selected, `3 finds` in amber for Restaurant, etc. Numeral
   cross-fades with a blur+y motion keyed on `${count}-${active}`.

### Copy polish

`9 things kept.` → `9 finds.` per brand vocabulary. Stale doc-comments
updated to match.

### Domain

`saves.dylandibona.com` → `finds.dylandibona.com` in `metadataBase`, Stripe
checkout fallback, and Settings → iOS Shortcut instructions.

---

## 2. Architectural learnings worth keeping

These are pitfalls and tactics that future sessions will want to remember.
Worth folding into `CLAUDE.md` when we next revise it.

### Slackbot UA as the default fetch identity

For general article scraping, Slackbot's link-expander UA gets through more
publisher WAFs than any browser UA, any other bot UA we tried, or fully
spoofed headers. Publishers whitelist it because Slack previews are common
and they don't want them broken. It returns identical content to a real
browser on sites that don't gate, so this is a strict upgrade. We tested:

| UA | Status | Useful data? |
|---|---|---|
| Chrome (full headers) | 403 + 330KB Cloudflare challenge body | None |
| Facebook bot | 460 | None |
| Twitterbot | 403 | None |
| Googlebot | 460 | None |
| Bingbot | 460 | None |
| iPhone Safari | 403 + same challenge | None |
| LinkedIn / Discord / WhatsApp / Telegram / Applebot | 402–403 | None |
| **Slackbot** | **200 + 589KB real page** | **og:title, og:image, og:description, Recipe JSON-LD intact** |

The current UA picker is:

```ts
if (url.includes('instagram.com')) return FB_BOT_UA
if (url.includes('maps.app.goo.gl') || url.includes('goo.gl') || url.includes('maps.google'))
  return FB_BOT_UA
return SLACK_BOT_UA
```

### Tailwind v4 silently tree-shakes `@theme` variables

If a CSS variable defined inside `@theme { ... }` is never referenced by a
generated utility class, Tailwind v4 **strips it from the production CSS
entirely**. We had defined fourteen `--color-cat-*` variables in `@theme`
but only used them via `var()` in inline styles (chip dots, marker fills,
bookplate letterforms, etc.). Tailwind decided they were unused and removed
them. Symptom: every "category color" rendered as transparent or as a
fallback. Moved the cat vars to a regular `:root { ... }` declaration
outside `@theme`. All other tokens (`--color-bg`, `--color-surface`, etc.)
stay in `@theme` because they're aliased into Tailwind's color namespace
through `@theme inline` and therefore *do* get referenced by utility classes.

Rule of thumb going forward: **if a CSS variable is only ever used via
`var()` in inline styles, define it on `:root`, not in `@theme`.**

### Per-host UA strategy is necessary, not optional

A single User-Agent string is not sufficient for our crawl surface:

- **Instagram** — only `facebookexternalhit/1.1` returns rich OG with
  captions. Chrome UA gets nothing useful, Slackbot gets less.
- **Google Maps shortlinks** — Chrome UA hits a consent interstitial with
  no redirect; the FB-bot gets the full `/maps?q=NAME,ADDRESS` URL with
  rich OG.
- **Cloudflare-protected publishers** — Slackbot is the only viable path.

Today's `pickUserAgent()` encodes this. As we add new source types (TikTok,
YouTube, Substack, etc.), assume each may need its own UA.

### Places API (New) photo flow

Photos come back as resource names (`places/<id>/photos/<photo-id>`) that
need a separate `/v1/{name}/media` call to resolve. Calling that endpoint
with `skipHttpRedirect=true` returns JSON `{ photoUri: "https://lh3..." }`
instead of a 302 — that final CDN URL has no API key embedded and is safe
to render with `<Image src=...>`. This is the only safe way to surface
Places photos to a client without leaking the server key.

### The hero numeral is the chromatic puncture

The earlier "big saturated forest-green panel containing a giant `Finds.`
wordmark" repeated the brand mark within 150px of the masthead and ate
~280px of vertical real estate for one line of data. Replacing it with an
oversized italic numeral as the chromatic moment preserved the Sagmeister
discipline (one charged element per surface) while reclaiming the space.
Pattern worth applying elsewhere: when a hero panel is just a colored
container around small content, **promote one element from the content to
be the chromatic moment itself** instead of building a frame around it.

---

## 3. Commits in order

| SHA | Title |
|---|---|
| `9e7d963` | AddForm redesign + double-enrichment fix + finds.dylandibona.com |
| `eddf0b4` | Home page redesign + WAF-protected article fetch fix |
| `1d4ae1e` | Google Places API integration for Maps URL enrichment |
| `fb89a4d` | Hero subtitle: '9 finds.' not '9 things kept.' |
| `dcb77f1` | Kill the redundant green hero panel |
| `dc13d3a` | Three fixes for Google Maps share URLs (maps.app.goo.gl) |
| `89a8849` | Category pills: bigger dot when off, full category color when on |
| `bc9fb62` | Move category color vars to :root so Tailwind v4 stops tree-shaking |
| `ec5ca24` | Pressed-in active pills + page-wide chromatic wash |
| `573c2bb` | Slackbot UA for articles + featured active-verb moment |
| `c124345` | Saturated active pill + flat page tone + responsive hero count |

---

## 4. Still open before this work is fully done

These are the loose ends from this session — small and well-scoped. None
are blockers.

| Item | Effort | Notes |
|---|---|---|
| **Add `GOOGLE_PLACES_API_KEY` to Vercel** | 2 min | Already in `.env.local`. Without it set in production+preview, Places lookups silently fall back to OG/Claude (still much better than before thanks to the FB-bot UA fix, but not as good as Places). `vercel env add GOOGLE_PLACES_API_KEY production && vercel env add … preview`. |
| **Restrict Google Maps API key + Places API key** | 10 min | Both are currently unrestricted in Cloud Console. Maps JS key → restrict to `finds.dylandibona.com/*`. Places key → leave application-unrestricted (server-side) but API-restrict to Places API (New) only. |
| **Re-test the F&W article** | 1 min | The Slackbot UA fix landed in `573c2bb`. Should now extract the full scorpion-bowl recipe — 7 ingredients, 3 instruction steps, 30-min totalTime, 4 servings. Worth confirming end-to-end on the phone. |
| **Re-test a maps.app.goo.gl share end-to-end on the phone** | 2 min | With both fixes deployed (FB-bot UA + Places integration), the Saint-Paul-de-Vence restaurant test case should produce a full save with hero photo, address as subtitle, hours/phone/website in extracted. |
| **Backfill existing pre-Places saves** | low–medium | The reprocess endpoint in `CLAUDE.md` backlog. The early test saves have no Places enrichment. A "Reprocess" action on the save detail page would run `enrichUrl()` again and update fields. |

---

## 5. Backlog progress, mapped to `CLAUDE.md`

Items from `CLAUDE.md` §7 that today's work moved:

- **"Better Instagram extraction"** — partially mitigated. The FB-bot UA is
  applied; on a smaller universe of Instagram posts this gets richer OG
  including some captions. The full Apify/Browserless path is still future.
- **"Recipe-specific JSON-LD parser"** — partially mitigated. With the
  Slackbot UA we now reliably get the JSON-LD body for Dotdash/Meredith
  sites; Claude reads it. A dedicated schema.org parser is still a
  meaningful win for reliability + zero-AI-cost, but the unblock is done.
- **"Distribute pre-built iOS Shortcut via iCloud link"** — not addressed.
- **"Validate PWA Share Target on iOS"** — not addressed.
- **"Reprocess action for existing saves"** — not addressed.
- **"Edit save UI"** — not addressed.
- **"Restrict Google Maps API key"** — not addressed (now joined by the
  new Places key needing the same review).

Items from `CLAUDE.md` §8 ("The gap to production-public") — no progress
this session. That entire ladder is still ahead, and was deliberately not
the focus today.

---

## 6. Production-deploy status

- Branch `main` is at `c124345`, pushed to `dylandibona/saves`.
- Vercel will redeploy automatically on push. No manual env changes needed
  for today's commits to render correctly — Places enrichment is gated on
  `GOOGLE_PLACES_API_KEY` and silently no-ops if absent.
- All today's changes type-check (`npx tsc --noEmit`) and build clean
  (`npm run build`).
- No new migrations. Schema unchanged.

---

## 7. Open questions for the next planning session

These were not raised today but are worth flagging for review:

1. **When do we add `GOOGLE_PLACES_API_KEY` to Vercel and turn on the full
   place enrichment in production?** Today vs. after a more cautious test
   pass.
2. **Should the active-verb moment apply outside the AddForm?** There's a
   case for using it during save deletion ("Releasing…"), search
   ("Filtering…"), or reprocess ("Refreshing…") — anywhere the app is doing
   real work that deserves a voice.
3. **Should the page-tint behavior carry to `/map` and `/saves/[id]`?**
   Today it lives on `/` only. Tinting the save-detail page to its
   category's color would extend the same chromatic logic.
4. **Slackbot UA — is identifying as Slack ethically OK at scale?** Today
   we're a one-household app and it's purely defensive against an
   over-aggressive WAF. As the user base grows, we should think about
   whether to register our own UA + a robots policy, and respect blocks.
