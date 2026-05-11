# Strategy — Finds

The unchanging stuff. Vision, audience, positioning, signature features, brand, anti-features. What gets revisited at major phase boundaries, not weekly.

> The how-fast and how-much-money planning that used to live here was the wrong shape for this project. See `docs/archive/REQUIREMENTS.md` for the previous venture-shaped version if you want the historical reference.

---

## The bet

> **Finds is the library Recime would be if it weren't only for recipes — and the library Mymind would be if it understood you weren't alone.**

The thing you find on Instagram, in an article, on a friend's text — it's saved, extracted into a structured card with enough context that you don't need to follow the link later. Your partner sees it too. Both of you build a kept place together.

Multi-category. Household-shared. AI-extracted. Beautifully kept.

---

## The audience

**Couples and small households (2–4 people) who already share recommendations and are tired of losing them.**

Concretely:
- Aesthetically discerning. Notice fonts, care about how things feel.
- Save 50+ things a year between them — restaurants, recipes, places, articles, workouts, shows, products.
- Already DM each other Instagram posts that get buried.
- Trust paid software when it earns it. Subscribe to Things, Bear, Mymind, or similar.

Specifically *not* for:
- Solo aesthetes (Mymind has them).
- Bookmark power-users with elaborate folder hierarchies (Raindrop has them).
- Discovery-seekers looking for other people's saves (Pinterest has them).
- Productivity stackers who want to compose their own system (Notion has them).

---

## The wedge

Three moves that no competitor makes:

1. **"Together"** — the household primitive is the schema, not retrofitted. Mymind philosophically refuses; Recime is structurally locked into single-user-single-domain; Raindrop has rudimentary sharing as an afterthought. Couples are an unowned market.
2. **"Anything from anywhere"** — multi-category by design. The user doesn't think about which app to send to.
3. **"Beautifully kept"** — aesthetic + intelligent retrieval. Not a feed. Not a database. A place that breathes.

---

## Competitive position

| Dimension | Mymind | Recime | Raindrop | Notion | **Finds** |
|---|---|---|---|---|---|
| Multi-category | ✓ | ✗ (recipes) | ✓ | ✓ | ✓ |
| AI extraction | ✓ | ✓ (recipes) | ✗ | ✗ | ✓ (all categories) |
| Household / shared | ✗ | ✗ | Limited | ✓ (overkill) | **Native** |
| Aesthetic premium | ✓ | ✗ | ✗ | ✗ | ✓ |
| Surfacing intelligence | Limited | ✗ | ✗ | ✗ | **Tonight, Trip** |

One-line elevator pitches against each:
- *vs Mymind:* "Mymind, but with the partner you actually share with."
- *vs Recime:* "Recime, but for everything — not just recipes."
- *vs Raindrop:* "Raindrop, but it actually understands what you saved."
- *vs Notion:* "Notion couldn't decide what to be. We did."

### The defensive risks

| Risk | Note |
|---|---|
| Mymind adds household sharing | They've publicly said they won't, but founders pivot. Defense: build household *deeper* than retrofitable — recommender attribution per save, Trip mode requiring multi-user input, partner presence cues. |
| Apple builds this into Notes / Reminders / Maps | Defense: stay ahead on per-category extraction quality and couple-shared UX. Apple is structurally bad at AI and at couple-products. |
| Instagram makes scraping illegal or impossible | Email-in is a hard backstop. Apify handles the breakage maintenance window. |

---

## The five signature flows

This is the product. Five named surfaces — not feature dumps. Each one designed with the discipline of "a designed moment, not just a feature."

### 1. Capture

**One tap from anywhere → enriched save lands.**

- iOS share extension (when we go native). PWA Share Target for now.
- Email-in. Forward any email → save lands.
- Paste in the app. Watch the save build itself live.
- (Later) Voice. "Save that podcast Marco mentioned."

**Signature moment:** the save card builds itself in front of the user during enrichment. Hero image fades in, title resolves, category chip animates to its jewel color, structured fields populate one at a time. The user sees the AI working — this is what makes the product feel intelligent rather than slow.

### 2. Library

**Everything kept, beautifully arranged, instantly searchable.**

Inspired by Mymind's spatial canvas, household-aware. Recent saves bloom in; older ones fade slightly. Category color is a thin spine, never the whole card. DD/KL identity pill in the corner.

- Search with cluster summaries: *"12 places, 8 in Brooklyn, 3 in Mexico."*
- Filter by saver: "Just Dylan's," "Just Keelin's," "Both saved."
- Map mode for places.

**Signature moment:** typing in search shows results forming as you type, and a cluster summary appears live. The library understands its own contents.

### 3. Tonight

**A daily-changing surface that suggests something from your saves right now.**

The home screen at 6pm Thursday is different from 9am Sunday. Logic:
- Time of day → appropriate categories surface (quick recipes for weeknights, coffee places for weekend mornings).
- Geography → saves near you ("0.4 km from a place you saved 3 months ago").
- Season, weather, day-of-week → relevant clusters.
- Recency-aware decay — old saves get a chance.

**Signature moment:** on a Saturday morning, the home view shows three things — a coffee place 200m away you saved in February, a long-read a friend recommended last month, a weekly resurface. Three. That's it.

*This is the feature most likely to become the brand.* The friend handing you the right thing at the right time.

### 4. Trip

**Plan a trip from your saves.**

When you have a destination coming up — manually flagged or auto-detected from a geographic cluster — Trip mode collapses everything for that destination into a planning view.

- Map at the top, all your saves there pinned.
- Grouped by category — places, restaurants, hotels, "things to read on the flight."
- Day-by-day planner.
- Shared decisions UI — both partners react yes/maybe/no, updates appear live on the other view.

*This is the feature most likely to drive premium upgrades.* The household pitch is most concrete here.

### 5. Cellar

**Lossless culling. Old saves get a chance to be revisited or quietly archived.**

Every library accumulates entropy. Without a cellar, every library becomes a graveyard.

- Saves never auto-delete.
- Saves older than ~6 months with zero engagement quietly enter "Cellar" status.
- Once a quarter, a "Cellar visit" surface offers ~5 saves: revisit, archive, or release.
- The view looks like a wine cellar — saves on a shelf with year-of-saving as visual anchor. A small ritual rather than a chore.

---

## Brand

### Identity

- **Name:** Finds. The unit of save is *a find.* "What's your latest find?" is a phrase people already say.
- **Wordmark:** the animated letter-cycling mark (Pixelify Sans / VT323 / Silkscreen). For static use (App Store icon, OG images), a single confident face — current direction is Fraunces italic; brand sprint may refine.
- **Icon:** F-block on sapphire jewel base. Geometric, will likely be refined as the brand matures.
- **Color:** deep sapphire `oklch(0.10 0.08 262)` base, five animated jewel-tone orbs (teal, amber, ruby, violet, sapphire). Grain overlay for tactile depth.
- **Type system:** Geist (body), Fraunces (content titles, optical-size 144), Space Mono (labels), Pixelify Sans / VT323 / Silkscreen (wordmark only).

### Voice rules (non-negotiable)

1. No em dashes.
2. Clarity and brevity.
3. No exclamation points.
4. Plural-aware ("you and Keelin") in household contexts.
5. Quiet, confident, warm but not cute.
6. No emojis in UI. Typographic markers (◈ ◎ ◉ ○) or SVG icons only.

Examples:

| Surface | Wrong | Right |
|---|---|---|
| Empty feed | "No saves yet — add your first one!" | "Nothing yet. Send a link from anywhere to begin." |
| Save success | "🎉 Saved!" | "Saved. Open." |
| Login error | "Oops! Something went wrong." | "Sign-in didn't take. Try again." |

---

## Pricing — when we ever go paid

Not committed; not urgent. Stripe is plumbed but the lock is open. When paid signup opens, this is the thinking:

| Tier | Price | Limits |
|---|---|---|
| Free | $0 | 12 saves, all functionality works |
| Paid | $4/user/mo or $36/yr | Unlimited saves, full AI, share extension, email-in |
| Household member | $2/mo (50% off) | Invited by a paid user, full features |

Grandfather pricing as costs rise. Friends and family get free codes during quiet beta.

**Unit economics check:** at $4/user/month, ~$1.20 inference cost + amortized infra ~$0.50 + Stripe ~$0.40 = ~$1.90/user margin. Healthy enough for the experiment. Apify subscription (Instagram) is a fixed line item that requires ~17 paid users to cover.

---

## What we explicitly don't build

These will be tempting once usage signals appear. We commit *now* to not shipping them:

- ✅ Public profiles
- ✅ Comments on saves
- ✅ Recommendations from strangers
- ✅ Streaks, gamification, achievements
- ✅ Ad-supported anything
- ✅ Affiliate links / commission revenue
- ✅ Crypto / NFT / web3
- 🟡 Following/followers — soft no, but we will build "invite to follow your Finds with quick-add to your own"
- 🟡 Public discover feed — not at first
- 🟡 AI chat with your library ("ask your finds") — maybe later, when libraries are large

Restraint is the brand.

---

## The seven absolute commitments

Pinned. These don't change under pressure.

1. **Ease of use, then disappear.**
2. **Communicate only when something is worth saying.**
3. **Clean, refined, considered design — every screen.**
4. **No hardcore commercial demands from day one. No ads. Ever.**
5. **Android is secondary, on the radar.**
6. **Tech stack decided by craft, not trend.**
7. **Real feedback from us and others shapes the product. More than a persona project's worth.**

---

## Operating mode

This is the experiment in *what motivated individual + AI can build at full quality.* The project's nature:

- **Serious.** Not "kinda cool but never finished." High bar. Quality threshold doesn't move.
- **Patient.** No four-month deadline. Ships when it's actually good.
- **Personal-investment-light.** Built solo + Claude. Contractors only when an obvious need surfaces. No outside money sought.
- **Validation before commerce.** Friends and family test on free codes. Real usage shapes priorities before we ever charge.
- **No startup theater.** No press launch, no founding-member campaign math, no MRR target. If the product earns it, the business follows. If not, that's a valid outcome too.

What "success" looks like:
- It becomes a daily ritual for D + K.
- Friends spontaneously ask to use it.
- A handful of paid subscribers emerge organically.
- Strangers who try it pay without being convinced.

---

## See also

- `CLAUDE.md` — current state of the build, file map, schema, env vars
- `RUNBOOK.md` — how Dylan and Claude work together
- `PLAN.md` — prioritized next things to build
- `NOTES.md` — running dev log
- `DECISIONS.md` — Phase 0 founder commitments
- `docs/archive/REQUIREMENTS.md` — historical venture-shaped requirements doc (kept for reference)
