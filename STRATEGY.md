# Strategy — reset of "Saves"

**Status:** Strategic plan as of 2026-05-10. Reset moment after the working private build (see `CLAUDE.md`). Authored by Claude in collaboration with Dylan.

> **Premise:** What we have is a competent personal tool. What we want is a business. This document is the bridge — what Saves *should* be, evaluated independent of what it currently is.

---

## TL;DR — the strategic call

1. **Position:** *"Mymind for couples — multi-category, beautifully kept, AI-organized."* The wedge nobody owns.
2. **Audience:** Couples and small households (2–4 people) who are aesthetically discerning, save 50+ things/year, and already share via DMs. Not "everyone." Not solo bookmark power-users (Raindrop owns that). Not single-category obsessives (Letterboxd/Recime own those).
3. **Brand:** Rename. "Saves" is a feature. The product needs a one-syllable noun-name that connotes *a kept place, two people, quietly tended.* Top candidate: **Cairn**.
4. **Pricing:** $8/mo personal, $12/mo household, $199 lifetime founding-member capped at 500. Premium tier, not utility tier.
5. **Product reset:** Five signature flows — Capture, Library, Tonight, Trip, Cellar — replace the generic feed-of-cards mental model. Each one has at least one moment of designed delight.
6. **Build target:** Public-launchable v1 in **4–5 months of focused work**. Native iOS app, real onboarding, real brand, all five flows shipped. No "just enough." No "MVP-but-still."
7. **What we don't do:** social feed, public profiles, recommendation algorithms, gamification, ad monetization, anything resembling Pinterest. Restraint is the brand.

---

## 1. Honest evaluation of where we are

The private build works. It has correct primitives — captures, household, recommenders, per-category schemas, jewel design, AI extraction. It's running in production at a custom domain with auth, deploys, and database in good shape. The technical foundation is *not* the bottleneck.

What it lacks is the difference between a tool and a product:

- **No identity.** "Saves" reads as a feature name. The brand is an aesthetic, not a story.
- **No moment of delight that can't be replicated by Recime in two weekends.** Today's differentiator is "AI extraction across categories" — real, but copyable.
- **No surfacing logic.** A library that shows everything chronologically is closer to a database than to a kept place.
- **No onboarding.** New users land in an empty feed with no story.
- **No share story for non-D+K users.** Single-household. The household primitive is in the schema but unexercised.
- **No price.** Without a price, no business.
- **No marketing surface.** Nothing for a logged-out visitor to read.

These are the gaps to close. The next 4–5 months are about closing them, not about adding more features to the personal tool.

---

## 2. The strategic position

### The market thesis

The personal-save market in 2026 has three tiers:

1. **Vertical apps** (Letterboxd, Goodreads, Untappd, Recime, Hevy). Strong in their lane, beloved by category obsessives. Loyalty + premium pricing. Ceiling: nobody wants to pay six subscriptions for six apps.
2. **Generalist databases** (Notion, Raindrop, Apple Notes). Power users force them to do this job. Free or cheap. No AI extraction, no aesthetic.
3. **AI-organized aesthetic libraries** (Mymind, Are.na). Premium pricing, beautiful, indie. Single-player by ideology. Underserve households entirely.

The opening: a generalist that **outpolishes the verticals on aesthetic** while explicitly **serving households**. The thing Mymind philosophically refuses to build (sharing) is the thing couples actually need. The thing Recime can't expand into (everything beyond food) is what makes it worth replacing six apps.

### The wedge

> **"The library you and your partner build together. Send anything from anywhere; we make it beautiful and remember it for both of you."**

Three moves this sentence makes that no competitor makes:

1. **"Together"** — the household primitive is baked in from the first save. No competitor pitches this.
2. **"Anything from anywhere"** — multi-category + multi-source as a feature, not an afterthought.
3. **"Beautiful and remembered"** — aesthetic + intelligent retrieval. Not a feed, not a database — a *kept place.*

### Who this is NOT for

State this so the design stays disciplined:

- **Solo aesthetes** (Mymind has them). Saves works for them but doesn't lead with single-player.
- **Bookmark power-users** (Raindrop has them). Folder hierarchies and granular tagging aren't our game.
- **Discovery-seekers** (Pinterest has them). We don't surface other people's saves; we surface yours.
- **Productivity stackers** (Notion has them). We're not building blocks for people who want to compose their own system.

### The competitive moat (in priority order)

1. **Household primitive** — schema + UX built around 2–4 people, not retrofitted. This is the deepest moat because it requires Recime/Mymind/Are.na to fundamentally rebuild.
2. **Per-category structured extraction quality** — we ship recipes-with-real-ingredient-lists and workouts-with-real-set-counts and places-with-real-hours. The first time a competitor experiences ours, they're 6 months behind.
3. **Surfacing intelligence** — "Tonight," "Trip mode," geo resurfacing, weekly revisit. The library remembers and helps without nagging.
4. **Aesthetic + craft** — the category accepts premium pricing only when the product *looks* premium. Our jewel design + animated wordmark is on the right track but needs a brand-grade upgrade.
5. **Pocket migration window** — Pocket shut down July 2025; millions of read-later users are actively shopping. A first-class importer is a real wedge for 12 months.

---

## 3. Brand reset

### Why rename

"Saves" has three structural problems:
- **Feature, not product.** "Save to Saves" sounds like a Notion clipper feature.
- **Search-invisible.** App Store search for "saves" returns gambling apps and Pokémon save guides.
- **Nothing to fall in love with.** Bear, Mymind, Are.na, Things, Beli all feel like *places.* "Saves" feels like a verb.

The pattern that works in this category: one-or-two-syllable common nouns connoting *a kept thing, quietly, well.* Bear, Things, Mem, Arc, Otto, Beli, Reflect, Granola, Vellum.

### Candidate names

Lead candidate: **Cairn**

- A stack of stones marking a trail.
- One syllable, four letters, easy to type and say.
- The metaphor maps cleanly: *we mark the things worth coming back to. Two people building the same trail.*
- App Store search clean (existing apps are minor).
- Domain availability needs check (cairnapp.com, cairn.so, cairn.app).

Strong alternatives:

- **Trove** — clearer pitch ("a personal trove"), slightly less mythic, more familiar.
- **Atlas** — geographic-leaning, works because places are a strong save category, slightly overloaded (atlassian etc).
- **Vellum** — most precious/refined, designer-coded, slightly feminine and slightly software-name-already-taken.
- **Larder** — household-warm but food-coded; risks pushing the brand toward recipes-only perception.

I'd go **Cairn** unless the domain is unavailable. The metaphor is strong enough to survive into marketing copy: "Mark the things worth coming back to. Together."

### Visual identity

What's working today:
- Deep sapphire `oklch(0.10 0.08 262)` base. Hold it.
- Five animated jewel orbs in the background. Reduce intensity 20%. Hold them.
- Fraunces serif for content. Hold it.
- Space Mono for labels. Hold it.

What needs to change:
- **The animated wordmark is a great Easter egg but the wrong primary mark.** Pixel fonts cycling is fun in the nav, not in App Store icons or marketing. Build a *static* wordmark in a single confident face — likely a custom-tuned Fraunces italic or a designer-cut wordmark — for use in marketing, App Store, favicons.
- **The tetris-S favicon is generic.** Replace with an icon system that matches the brand's actual identity (cairn = stacked stones; trove = chest; etc.). This is real iconography work, ~1-2 weeks of design time.
- **No type system documentation.** What's the H1, H2, body, caption stack? What's letter-spacing per role? Designers will eyeball it differently every screen without rules.
- **No color system beyond chrome.** What are semantic colors (success, warning, info)? What's the per-category color used for, semantically?

This is real brand work, ideally with a real designer. Two paths:

1. **In-house brand sprint** (3–4 weeks of focused design with the `huashu-design` and `taste-skill` skills available locally). Can produce something defensible.
2. **Engage a brand designer** at this scale. ~$15–30k for a small studio engagement, ~$40–80k for a top-tier indie. This is the kind of thing the founding-member tier is meant to fund.

My recommendation: do the in-house brand sprint first to get the visual language to "very good," and reserve studio engagement for a second pass after public launch when the product has real users to design for.

### Voice and tone

Today: undefined. Microcopy is functional.

Target voice:
- **Quiet.** No exclamation marks except in genuine moments. No "Awesome!" "You did it!" "Let's go!"
- **Plural-aware.** "You and Keelin saved this" not "Someone in your household saved this."
- **Confident.** No hedging ("Maybe try this?") and no over-explaining.
- **Warm but not cute.** "Tonight" not "TONIGHT 🌙." "Saved" not "Yay, saved!"

Three example microcopy passes:

| Surface | Wrong | Right |
|---|---|---|
| Empty feed | "No saves yet — add your first one!" | "Nothing yet. Send a link from anywhere to begin." |
| Save success | "🎉 Saved!" | "Saved. Open." |
| Login error | "Oops! Something went wrong." | "Sign-in didn't take. Try again." |

This voice is the same one Mymind uses, the same one Things uses, the same one Bear uses. It's not original — it's correct for this category.

---

## 4. Product principles

The rules that govern every design decision:

1. **The save is the destination, not the bookmark.** Extract enough that you never have to follow the link again. This is already a stated principle; commit harder. If a recipe save has no ingredients, it's a failed save.
2. **Two people, not one.** Every screen designed with the household lens. Every interaction question asks "what does the partner see?"
3. **Calm, not feed.** No infinite scroll. No engagement metrics. No streaks. No notification-driven retention.
4. **Less, more.** When in doubt, remove the chrome, the filter row, the second action. Match Mymind's restraint.
5. **Fast.** Capture is one tap. Search is instant. Page transitions are 200ms. Anything slower is a bug.
6. **Beautiful before complete.** A half-built feature with great craft beats a complete feature with rough edges.
7. **Categories are the structure, not folders.** Users don't organize. The system organizes by category, by location, by time, by recommender. Folders/tags are an emergency exit, not the primary surface.
8. **Surface, don't search.** The library proactively shows things at the right time. Search is for when surfacing fails.
9. **The wordmark is sacred.** Don't decorate. Don't gradient. Don't animate the static mark. Use one face, perfectly.
10. **No emojis in product UI.** Typographic markers, SVG icons, or nothing. Already a rule; preserve it as the brand grows.

Every PR, every design review, every feature scope — measured against these.

---

## 5. The five signature flows

This is the product. Five named surfaces that replace the generic feed-of-cards model.

### 1. Capture

**Goal:** From any source, in 1 tap, a save lands enriched and structured.

**Flows:**
- iOS share extension (native, not Shortcut). Tap share in Instagram → tap our app → toast confirms → never leave Instagram.
- Email-in. Forward any email → save lands.
- Paste. Open the app, paste a link, watch the save build itself live.
- (Future) Audio note. "Save that restaurant Marco mentioned" → transcript → save with note.

**Delight moment:** the save card builds itself in front of the user during enrichment. Hero image fades in, title resolves, category chip animates to its jewel color, structured fields populate one at a time. ~3-second show. The user sees the AI working — this is what makes it feel intelligent rather than slow.

**Anti-patterns to avoid:** modal forms, multi-step wizards, "What is this?" disambiguation that breaks the one-tap promise. Disambiguate later, in the library, on a save-by-save basis when the system genuinely couldn't decide.

### 2. Library

**Goal:** Everything we've kept, beautifully arranged, instantly searchable.

**Layout:** Inspired by Mymind's spatial canvas, but household-aware. A masonry of cards where:
- Hero images carry visual weight; saves without images get typographic treatment.
- Recent saves bloom in with subtle entry animation; older saves fade slightly into the background opacity.
- Category color is a thin spine on each card, never the whole card.
- Saver attribution (DD/KL pill) lives in the corner, not the meta row.

**Surfaces:**
- **Search.** ⌘K everywhere. Natural language: "Italian restaurants in Brooklyn we haven't been to," "recipes under 30 min," "movies Keelin saved this year."
- **Filters by category.** Chip row only when there's something to filter (already implemented).
- **Filter by saver.** "Just Dylan's saves" / "Just Keelin's saves" / "Both of us saved" toggle.
- **Map mode.** Existing map view promoted to first-class.

**Delight moment:** typing in search shows results forming as you type, and a *cluster summary* appears: "12 places, 8 in Brooklyn, 3 in Mexico, 1 in Tokyo." The library understands its own contents.

### 3. Tonight

**Goal:** A daily-changing surface that suggests something from your saves *now*.

The home screen at 6pm Thursday is different from the home screen at 9am Sunday. The library knows what season it is, what day, where you are.

**Logic:**
- Time-of-day → surfaces appropriate categories. Weeknight evening → quick recipes, restaurants nearby. Weekend morning → coffee places, articles to read. Friday afternoon → podcasts/movies for the weekend.
- Geography → surfaces saves near you. "You're 0.4 km from a place you saved 3 months ago."
- Season → "It's October — your fall recipes." "It's June — your beach reads."
- Recency-aware decay — old saves get a chance to resurface.
- Couple awareness — "movies you both saved" when watch-together time.

**Delight moment:** on a Saturday morning, the home view shows three things — a coffee place 200m away you saved in February, a long-read article a friend recommended via DM last month, and the weekly resurface ("You haven't thought about: Forest of Dean trip"). Three. That's it. Today's offering, then nothing.

This is the feature most likely to become the brand. *"It's like a friend handing you the right thing at the right time."*

### 4. Trip

**Goal:** Plan a trip from your saves.

When you have a trip coming up — manually flagged or auto-detected from a "Lisbon" cluster of saves with future dates in the wild — Trip mode collapses everything tagged or geographically associated with that destination into a planning view.

**Layout:**
- Map at the top with all your saves for that destination pinned.
- Below: grouped by category — places, restaurants, hotels, articles ("things to read on the flight"), workouts ("hotel-room-friendly workouts you've saved").
- "What you haven't done yet" badges on places you've saved but never visited.
- Per-day planner option — drag saves into Day 1, Day 2, etc.

**Delight moment:** sharing the trip plan with Keelin via a single link — she sees the same view, can mark things "yes/maybe/no," and her decisions show on Dylan's view live.

This is the feature most likely to drive premium upgrades. The household pitch is most concrete in Trip mode.

### 5. Cellar

**Goal:** Lossless culling. Old saves get a chance to be revisited or quietly archived.

The save library accumulates entropy. Without a cellar, every library becomes a graveyard. Mymind avoids this with sheer aesthetic; we can do better with explicit decay-aware UX.

**Logic:**
- Saves never auto-delete.
- Saves older than ~6 months with zero engagement get a gentle "Cellar" status — visible in a separate view, not in the main library.
- Once a quarter, a "Cellar visit" surface offers ~5 saves: "Still want to read this? Still want to try this place? Or release it?" Three taps to revisit, archive, or delete.
- Deletion is always two-step (confirmation modal, already built).

**Delight moment:** the cellar view itself looks like a wine cellar — saves arranged on a "shelf" view with year of saving as the visual anchor. A small ritual rather than a chore.

---

## 6. Architecture sketch

Not a code spec — the major systems and how they relate.

### Capture pipeline

```
[Source: iOS share extension / email-in / paste / API]
     ↓
[Inbound queue (already exists: inbound_messages)]
     ↓
[Classifier: claude-haiku, fast, cheap, classifies category + extracts URL canonical]
     ↓
[Per-category enricher: claude-sonnet, slower, extracts structured data]
  ├── recipe → JSON-LD parser first, Claude fallback
  ├── workout → Claude with caption + transcript (audio for video reels)
  ├── place → Google Maps embed parsing + Places API (paid, capped)
  ├── article → Readability parsing + Claude summary
  └── ...
     ↓
[Dedup: canonical_url match within household scope, RLS-aware]
     ↓
[Save row: created with extracted fields populated]
     ↓
[Async: hero image processing, embed generation for share-out]
```

Two AI tiers (Haiku for classification, Sonnet for extraction) keeps unit cost workable.

### Native iOS app

Yes, native. Reasons:

1. Share extension UX is meaningfully better native than PWA share-target.
2. Push notifications for "Tonight" and Trip resurfacing.
3. App Store discoverability for migration campaigns (Pocket users searching).
4. Offline support for the library.

Architecture: SwiftUI + thin local cache + Supabase as backend. Or — depending on team size — React Native to share rendering with the web app. Real call: SwiftUI for the iOS app (better native feel, share extensions that feel right), and the web app stays Next.js for desktop + landing.

Android can wait until iOS validates the model.

### Surfacing engine ("Tonight," geo resurfacing)

A daily cron that, per household, computes:
- Saves matching today's time-of-day + season window.
- Saves within 500m of last known location.
- Saves that haven't been viewed in 90+ days, weighted by how often they're searched.

Stores ~5 candidates in a `surfaces_today` table. Home view reads from there, not from full library.

This is genuinely simple to build (~1 week) and the differentiator-per-engineering-hour ratio is the highest of anything on this roadmap.

### Search

Two modes:
- **Lexical** (instant, current): pg_trgm full-text on title/subtitle/extracted text. Already in the schema; needs UX wiring.
- **Semantic** (~3 month feature): pgvector embeddings of save content. "Italian places we wanted to try" without the word "Italian" appearing in any save. Claude generates the embedding at save time.

Lexical first; semantic when there are enough saves per household to make it worth the inference cost.

### Multi-tenancy / households

Existing schema is correct. What's missing:
- Invite flow (email-based, accept link, merge user into household).
- "Personal" households — solo users have a household-of-one. The whole UI works the same.
- Migration path — when a solo user invites a partner, their existing saves stay with the merged household.

This is ~2 weeks of work and unlocks the entire pitch.

### Billing

Stripe via the Supabase auth integration. Three plans (Free, Personal, Household, Founding Member). Self-serve signup, monthly/annual toggle, dunning emails. Standard Stripe Checkout for v1; build custom billing UI in v2.

---

## 7. Business model

### Pricing

| Tier | Price | Limits | Audience |
|---|---|---|---|
| **Free** | $0 | 50 lifetime saves, manual paste only, no AI extraction, no share extension | Tire-kickers, students |
| **Personal** | $8/mo or $72/yr | Unlimited saves, full AI, share extension, email-in, single-user | Solo users |
| **Household** | $12/mo or $108/yr | Personal × 2-4 members, shared library, Trip mode, all of the above | The pitch |
| **Founding Household** | $199 lifetime, capped 500 | Household features forever, locked-in pricing, beta access, founder Slack | Launch lever |

### Why these numbers

- **$8/$12 anchors premium.** Mymind ($7–13), Reflect ($10), Mem ($10) all live here. Recime/Raindrop ($5/$3) are the utility tier; Saves is not a utility.
- **Annual discount = 25%** is the standard pull.
- **Household at 1.5× personal** is below industry norm (Apple One is ~1.5×, 1Password Families is ~1.7×) — pricing aggressively because the household pitch IS the product.
- **$199 lifetime founding** = 16 months of household at full price. Believable to early adopters, generates ~$100k of cash if all 500 sell.

### Unit economics back-of-envelope

Average household: 2 users × 60 saves/month = 120 saves/month.

Per save inference cost (estimate):
- Classification (Haiku): ~$0.001
- Extraction (Sonnet, average): ~$0.01
- Image processing: ~$0.001
- Total per save: ~$0.012

120 saves × $0.012 = **$1.44/month inference cost per household.**

Supabase + Vercel infrastructure: amortized ~$0.50/month per household at scale.

Stripe fees: ~$0.40 + 2.9% on $12 = $0.75.

**Net per household: ~$9.30/month margin** at $12 revenue. Healthy.

The unit economics are fine because the AI cost is bounded by user behavior. People don't save 10x more just because the app exists.

### Revenue targets

| Milestone | Households | MRR | Revenue/yr |
|---|---|---|---|
| **Public launch** | 500 (founding) + 200 paid | ~$5k MRR (excl. lifetime) | $60k + $100k lifetime cash |
| **Year 1** | 2,000 paid | ~$24k MRR | $288k |
| **Year 2** | 8,000 paid | ~$96k MRR | $1.15M |

These are conservative — Mymind has ~30k paid in 5 years; Are.na has ~18k paid in 12 years. Saves' household pitch is more mainstream than either.

### Distribution

Three channels in priority order:

1. **Pocket migration campaign.** "Migrate from Pocket" landing page, importer that ingests Pocket exports, paid SEM on "pocket alternative." This is a 12-month window before the urgency fades.
2. **Indie design press.** Sidebar.io, Designer News, Product Hunt, Tobias van Schneider's circle. Mymind got there; we can. Brand sprint quality matters here.
3. **Couple/lifestyle content.** TikTok/Instagram around "how we plan our weekends together," "our shared library." Lo-fi authentic, not branded.

What we don't do: paid Facebook/Instagram ads, performance marketing tracked by CPI. The brand can't survive that pipeline.

---

## 8. Competitive positioning

### Side-by-side

| Dimension | Mymind | Recime | Raindrop | Notion | **Saves** |
|---|---|---|---|---|---|
| Multi-category | ✓ | ✗ (recipes) | ✓ | ✓ | ✓ |
| AI extraction | ✓ | ✓ | ✗ | ✗ | ✓ |
| Household / shared | ✗ | ✗ | Limited | ✓ (overkill) | **Native** |
| Aesthetic premium | ✓ | ✗ | ✗ | ✗ | **✓** |
| Surfacing intelligence | Limited | ✗ | ✗ | ✗ | **Tonight, Trip** |
| Price | $7-13 | $5 | $3 | $0-10 | $8/$12 |

### One-line elevator pitches against each

- *vs Mymind:* "Mymind, but with the partner you actually share with."
- *vs Recime:* "Recime, but for everything you save — not just recipes."
- *vs Raindrop:* "Raindrop, but it actually understands what you saved."
- *vs Notion:* "Notion couldn't decide what to be. We did."

### The defensive risk

The biggest competitive risk is **Mymind adding household sharing.** They've publicly stated they won't, but founders pivot. Defense:

- Build the household primitive *deeper* than they could retrofit — recommender attribution per save, "who saved" visible in the design language, partner notifications, Trip mode that requires multi-user input.
- Build category-specific extraction depth they can't match — they're a generalist by ideology and won't ship recipe-specific JSON-LD parsers.
- Move fast on the Pocket migration window.

The second-biggest risk: **Apple builds this into Notes/Reminders/Maps.** Defense: stay 18 months ahead on per-category extraction quality and shared-household UX. Apple is structurally bad at AI and at couple-shared products.

---

## 9. Execution plan

Five phases, each ~3–6 weeks. No week-by-week schedule — those are decided per phase. The phases are sized to keep momentum and let learnings flow into the next phase.

### Phase 0 — Strategic decisions (1–2 weeks)

Before any code, decide:

- [ ] Final name (Cairn vs alternatives) — domain check, App Store check, trademark search.
- [ ] Brand sprint scope — in-house with `huashu-design` skill or engage a designer.
- [ ] Pricing structure final — three tiers with lifetime cap, or two tiers, or different.
- [ ] Native iOS commitment — yes/no/when.
- [ ] Founding member campaign timing.
- [ ] Co-founder / hire plan — does this stay solo or bring in a designer/engineer?

These are conversations to have, not work to do. Output: a one-page commitment doc.

### Phase 1 — Brand + product foundation (4–6 weeks)

The thing that decides whether this is a business or a hobby.

- Brand sprint: name, wordmark, color, type system, voice doc, App Store icon, marketing landing page.
- Product foundation: convert existing app to new brand. Visual refresh per the new design system (not a rewrite, a refresh).
- Onboarding flow: welcome state, "save your first thing" walkthrough, partner-invite setup.
- Account settings: display name, email, photo, household management, account deletion.
- Legal pages: privacy, terms, cookie consent.
- Marketing landing page at root domain (logged-out users).
- Analytics + error tracking (Plausible + Sentry).

Output: a polished, branded, marketable v0 of the existing private build.

### Phase 2 — The five signature flows (6–8 weeks)

Build the actual product differentiation.

- **Capture** — native iOS share extension. Email-in via Postmark. Live-build animation in /add.
- **Library** — Mymind-style spatial layout. Search with cluster summaries. ⌘K everywhere. Filter by saver.
- **Tonight** — surfacing engine. Daily cron, geo-aware, time-aware, season-aware. New home view.
- **Trip** — destination mode. Map-anchored, day planner, shared decisions UI.
- **Cellar** — old-save resurfacing. Quarterly visit surface.

Output: the product Saves *is*, fully realized.

### Phase 3 — Native iOS app (8–10 weeks)

SwiftUI app with:
- Share extension that handles URL, text, image inputs.
- Push notifications for Tonight resurfacing and partner activity.
- Offline-first library cache.
- Native maps integration (vs the web's Google Maps embed).
- Trip mode with native gestures.

Output: App Store submission.

### Phase 4 — Public launch (3–4 weeks)

- Founding Member campaign launch. Sidebar.io / DesignerNews / ProductHunt seeded.
- Pocket migration importer + landing page.
- Press outreach to indie design publications.
- TikTok/Instagram content seed.
- Stripe billing live with all three tiers.
- 500 lifetime members cap visible on landing.

Output: Saves is in the market.

### Phase 5 — Iterate on signal (ongoing)

After launch, the roadmap is determined by users. Likely: better Instagram extraction (Apify), Android app, semantic search, social sharing of single saves, public profiles for opt-in users (maybe — restraint principle says no).

---

## 10. Risks and what to monitor

| Risk | Severity | Mitigation |
|---|---|---|
| Mymind ships household | High | Build deeper than retrofit-able; ship Trip mode early as the proof |
| Apple Notes / Maps gets AI extraction | Medium | Stay 18 months ahead; private Apple is bad at couples + AI |
| Anthropic price increase / capacity issues | Medium | Multi-vendor strategy ready (OpenAI fallback, Gemini for vision); per-save cost monitoring |
| Instagram makes scraping illegal/impossible | Medium | Email-in is a backstop; Apify partnership |
| Solo build burns out the founder | High | Hire / engage a designer at Phase 1; engineer at Phase 3 |
| Pricing too high for target audience | Medium | A/B test $8/$12 vs $6/$10 in Phase 4 |
| Brand sprint produces something derivative | High | Engage real critique loops with `huashu-design`; spend the month |
| App Store rejection (share extension issues) | Low | Submit early, allow time for revisions |

---

## 11. What success looks like in 12 months

- 2,000 paid households.
- ~$24k MRR.
- 500 founding members locked in (revenue + advocacy).
- App Store rating 4.7+ with sub-100 reviews (small but loyal beats large and indifferent).
- Featured by at least one of: Sidebar.io, Designer News, indie design press, Tobias van Schneider's newsletter.
- A clear answer to "why does this exist" that comes from users, not from us.
- A native iOS app live in App Store.
- A team of 2–3 (founder + designer + engineer at minimum).

What this is **not**:
- 100k users (that's a different product).
- $1M ARR by year 1 (possible but not the point).
- VC-backed with growth metrics (this is a craft business).
- "10x" anything.

---

## 12. The next conversation

Before any code is written:

1. **Name decision.** Cairn? Trove? Atlas? Something else? Domain + trademark check.
2. **Brand sprint scope and budget.** In-house using local skills, or engage a studio?
3. **Co-founder / hire conversation.** Does this stay a solo build with Claude? Bring in a designer first? An engineer?
4. **Timing.** Public launch in 4–5 months, or take longer?
5. **Pricing commitment.** $8/$12 + $199 lifetime, or different?
6. **Founding member campaign — when does it open and close?**

These are 1–2 hour conversations, not days of work. The Phase 0 output is a single committed direction on each.

After those decisions, Phase 1 starts.

---

## Appendix — ten concrete things that change immediately

If the strategy above is the right direction, these ten things change the moment work begins on Phase 1:

1. **Repo renamed** from `saves` to whatever the new name is. Domain follows.
2. **CLAUDE.md updated** to reflect new product name throughout.
3. **Brand book file created** (BRAND.md) with the type system, color tokens, voice rules.
4. **Pricing committed** in marketing copy. Stripe products created.
5. **Marketing landing page** scaffolded at root domain (the auth-gated app moves to a subdomain or a path).
6. **iOS native project initialized** even if work doesn't start for 2 months — claim the App Store name.
7. **Plausible + Sentry** added.
8. **Founding member waitlist form** live. Start collecting interest before there's anything to sell.
9. **The animated wordmark moves to an Easter-egg surface** (settings page, onboarding moment) and a static, single-face wordmark becomes the primary mark.
10. **Pocket migration importer** scoped — a one-screen tool that accepts a Pocket export JSON and creates saves.

These are the visible signals that the product reset is real. They cost a few weeks of work but communicate seriousness — to users, to partners, and to whoever joins the team next.

---

*This document is the strategy as of 2026-05-10. Revisit at every phase boundary. The plan should change; the principles shouldn't.*
