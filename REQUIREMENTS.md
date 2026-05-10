# What this actually takes

**Companion to `STRATEGY.md`.** That doc says what we should build. This one says what's required to actually hit the "shockingly fun, easy, useful" bar — including everything we don't currently have.

> **The bar:** the kind of product that strangers screenshot and post. Linear-tier, Things-tier, Mymind-tier, Arc-tier craft. The kind that someone shows their friend in person, unprompted. Anything less than that is "good enough," and "good enough" is a different product.

---

## 1. What "shockingly fun" actually looks like

The apps that have ever cleared this bar have one thing in common: **a single signature interaction so well-crafted it becomes the brand.**

- **Linear:** the command palette + cycle view. People tweet about typing into Linear.
- **Arc:** Spaces and the command bar. People made YouTube videos about *opening tabs.*
- **Things 3:** the Today view's gentle separation of "today" from "this evening." A productivity app that makes you feel calmer by opening it.
- **Mymind:** paste anything → watch it auto-organize, OCR'd, searchable. People do demos for friends.
- **Flighty:** flight visualization that turns boarding-pass anxiety into a screensaver.
- **Granola:** meeting notes that quietly become better while you talk. PMs tweet about it.

Common pattern:
- **One signature moment** that defines the app. Not five things — one.
- **Visible craft.** You can *see* someone cared. Type rendering, animation timing, error states, empty states — all considered.
- **Speed.** Things that should be instant are instant (sub-100ms feel).
- **Aesthetic point of view.** Not "nice" — a specific opinion.
- **Surprising depth in one direction.** Linear goes deep on keyboard. Things goes deep on time. Arc goes deep on browsing. Pick a depth, own it.

For Saves, two candidates for the signature moment:

1. **Capture-build animation** — the moment of capture is the first impression. Paste a URL, watch the AI extract the save in real-time in front of you. The signature for *new users.*
2. **Tonight's offering** — daily-changing single-thing-that-matters. The signature for *returning users.*

Both need to be designed with the discipline of a Pixar short film — motion, timing, microcopy, sound. Not "good enough" — actually shocking.

---

## 2. The delight moments inventory

Every one of these is a designed moment, not a feature. Twenty-three things to make real. Categorized by where in the user's day they live.

### First-impression moments (capture)

1. **Live capture-build animation.** Share from Instagram → share extension opens with a card scaffolding visible. Hero image dissolves in. Title resolves character-by-character. Category chip color blooms to its jewel hue. Ingredients/exercises/hours populate as a typed list, line by line, with the satisfying tap of a typewriter sound option. Two-second show. The save settles, breathes once. "Saved." Done.

2. **Save card type-resolution.** When the AI is uncertain about category, the chip flickers between two colors briefly before settling. Visible thinking, tasteful.

3. **"Already saved" gentle overlap.** Save the same thing twice → the app shows the existing save with "you already have this — save again to add a note?" Not a modal. Just the existing card surfacing.

4. **Voice capture** (later phase). "Hey Saves, save that podcast Marco mentioned at dinner." Audio → transcription → smart context resolution → save with a contextual note.

5. **Email-in confirmation.** Forward any link to your `capture@cairn.so` (or wherever) → email reply confirms with a beautiful card preview, no app needed. The capture surface that works on a 9-year-old browser.

### Library moments

6. **Cluster-aware search.** Type "Italian places we'd like to try" → results form *as you type*, with a quiet summary at the top: *"12 places, 8 in Brooklyn, 4 in Queens — 3 saved by you, 9 saved by Keelin."* Search that thinks.

7. **Spatial canvas with attention-decay.** Inspired by Mymind. Recently saved or recently viewed items have full opacity. Untouched items fade subtly. The library breathes.

8. **Saver attribution as a held secret.** No avatars on cards — but tap-and-hold any save and the saver's identity pill animates in next to the title. Discoverable, not noisy.

9. **Map view with cluster-color.** All your saves on a map, clustered geographically, color-coded by category. Pinch out → saves cluster into bubbles. Pinch in → individual jewel markers.

10. **Search history as a memory.** Searches you've made before are themselves saved. "What did I search for last week?" works.

### Daily ritual moments

11. **Tonight, the daily offering.** Open the app at 6pm Thursday → home view shows ONE thing. Not three, not five. Today's offering. Tomorrow it's different. A daily ritual.

12. **The serendipity nudge.** Walking around → iOS notification appears, gentle: *"You're 200m from a place you saved 3 months ago."* The app being a friend tapping you on the shoulder.

13. **Morning briefing** (optional). Set a daily 8am "good morning" surface that pulls together: today's weather, anything saved relevant to today's calendar, one resurface from your library. Like a personal newspaper made of your own taste.

### Couple moments (the wedge)

14. **Live presence.** When Keelin is also using the app, a tiny dot pulses next to her initials in your library. Subtle co-presence without notifications.

15. **"You both saved" badge.** A jewel mark on saves that both partners independently added. Aesthetic recognition of overlapping taste.

16. **Trip mode reveal.** When the system detects an upcoming trip from your saves' geographic clustering, a quiet card appears: *"Want to plan Lisbon? You have 12 saves there."* Tap → Trip mode opens.

17. **Decision-sharing in Trip mode.** Each partner can react to saves: yes/maybe/no. Live updates appear on the other partner's view. No chat, no comments — just shared decisions.

18. **Anniversary-type resurfacing.** "A year ago today you saved this restaurant — you went the next month, by the way." The library remembers.

### Active moments (saves becoming live)

19. **Recipe → grocery list.** Tap a recipe save → "Add ingredients to..." → Apple Reminders, Things, Reminders, custom. Done in two taps.

20. **Workout → execute.** Tap a workout save → "Start" → fullscreen guided mode with timer, sets, rest periods. Auto-logs to Apple Health on completion. The save becomes a session.

21. **Place → nearby check.** Tap a place save → "Open in Maps" with mode selected based on time of day (transit during commute, walking on weekends).

22. **Article → read on flight.** Saves marked for "later reading" can be downloaded as a bundle for offline.

### Sharing moments

23. **The single-save postcard.** Share any save publicly via a beautiful, type-set, brand-quality URL. Recipient sees a real designed page, not a generic preview. A free marketing surface that feels like a gift.

---

## 3. What we don't have (an honest inventory)

To make those moments real at the level they require — not in a homemade approximation — here's what's missing.

### People

| Role | Why we need it | Cost (FT-equivalent) | Realistic engagement |
|---|---|---|---|
| **Brand strategist / designer** | Naming, identity, voice, type system, marketing aesthetic — the foundation. Cannot be done by an engineer or by Claude alone. | $120–180k/yr or $30–80k for a 3–4 month brand sprint engagement | Studio engagement: Order, Day Job, Studio Lin, Ramotion. Or a top indie: Mat Dolphin, Frank Chimero, Jessica Walsh. |
| **Product designer** | The five flows need someone who's shipped premium consumer products. Linear/Things/Mymind/Apple alumni. | $130–200k/yr | Full-time hire OR senior contractor at $150–250/hr |
| **iOS engineer** | Native share extension, push notifications, App Store. SwiftUI specialist. Share extensions are subtle. | $140–200k/yr | Full-time hire OR contractor at $150–250/hr |
| **Motion designer** | The signature capture-build animation. The Tonight reveal. Cellar's "stocking" animation. The library's breathing. | $100–150k/yr or contract | Probably contract — ~$8–20k for launch animation set |
| **Backend/AI engineer** | Audio transcription pipeline, surfacing engine, scaling Supabase, Apify integration. | $140–200k/yr | Could be Dylan + Claude for early phases |
| **Marketing / PR strategist** | Founding member campaign, indie design press outreach, Pocket migration positioning. | $80–150k/yr or contract | Contract or fractional, $5–15k/mo around launch |

**Realistic minimum team to hit the bar:** Dylan + a brand designer for Phase 1 + a senior product designer + an iOS engineer. Three people plus Dylan, of which two are full-time, one is a Phase-1 contract.

### Money — one-time

| Item | Cost | Notes |
|---|---|---|
| Brand sprint (studio) | $30–80k | The single most leveraged investment. Defines the next 3 years. Order ~$30k, Day Job ~$50k, Ramotion ~$80k. |
| Custom typography (commission) | $15–40k | Optional. Commissioning a custom serif for the wordmark is the maximum-luxury move; licensing Klim's Söhne family ~$1–3k is the practical move. |
| Photography / illustration | $10–20k | One shoot day for marketing assets, or illustration commission for empty states. |
| Iconography system | $5–10k | Either commissioned or built carefully. Lucide-out-of-the-box won't survive scrutiny. |
| Trademark filing | $1–3k | Per region. US first, then EU. |
| Legal: terms/privacy/incorporation | $3–8k | Real attorney, not Termly. |
| Brand domain | $10–10,000 | `cairn.app` ~$10/yr. `cairn.com` likely $5–50k via brokerage if available. |
| iOS dev hardware (if not already owned) | $2–4k | M-series Mac. |
| Launch press kit / video | $5–15k | Hero video, press images, written manifesto. |

**One-time total: $70–185k**, depending on luxury level.

### Money — recurring

| Item | Cost/month | Notes |
|---|---|---|
| Anthropic API | $0–500/mo pre-launch, scales linearly with users | ~$1.50/household at $12 pricing — fine. |
| OpenAI Whisper (audio transcription) | $30–200/mo at modest volume | For video reel transcription. |
| Apify Instagram scraper | $49–199/mo | For real Instagram caption/comment extraction. **Critical** for the workout-in-comments use case. |
| Google Maps Places API | $0–500/mo | Beyond free tier. Capped per-user. |
| Postmark (inbound email) | $15–100/mo | For email-in capture. |
| Supabase | $25–500/mo as users scale | Free until ~500 users. |
| Vercel | $20/mo team plan | Free hobby tier covers early. |
| Stripe | 2.9% + $0.30/txn | Standard. |
| Sentry | $26–80/mo | Error tracking. Real, not optional. |
| Plausible analytics | $9–19/mo | Privacy-respecting. |
| ConvertKit (email marketing) | $25–80/mo | For waitlist + newsletter. |
| Resend (transactional email) | $0–20/mo | Cheap. |
| Figma | $15/mo per editor | Design tool. |
| Linear | $8/mo per user | Project tracking. |
| Apple Developer Program | $99/yr | Required for App Store. |

**Recurring total at Phase 4 / pre-launch: ~$300–800/mo.**
**At 1k paid households: ~$2k–4k/mo.**

### Software / Tools we should commit to

- **Figma** for design.
- **Linear** for project management.
- **GitHub** (already there).
- **Supabase** (already there) — pgvector for semantic search later.
- **Vercel** (already there).
- **Stripe** for billing.
- **Apify** for Instagram extraction.
- **Apple Developer Program** for App Store.
- **TestFlight** for beta.
- **Plausible + Sentry** for observability.
- **Resend + Postmark** for email out + email in.

### Skills we don't have on the team

- Brand strategy
- Native iOS engineering (SwiftUI, share extensions, push)
- Senior product design (interaction, not just visual)
- Motion design
- Marketing/PR strategy
- Legal counsel (trademark, terms, GDPR)
- iOS share extension specifics (security review, sandbox limits)

### Time

Honest range, given the bar:

- **Phase 0** (decisions): 2–3 weeks. Naming, brand sprint commitment, hiring decisions, pricing commitment, legal entity setup.
- **Phase 1** (brand + foundation): 8–12 weeks. Brand sprint runs in parallel with foundation engineering.
- **Phase 2** (the five flows): 12–16 weeks. This is the design-heavy phase. Each flow gets ~2–3 weeks of dedicated design + engineering.
- **Phase 3** (native iOS): 12–16 weeks. SwiftUI app, share extension, App Store submission process.
- **Phase 4** (launch): 6–8 weeks. Founding member campaign, Pocket migration, press, content seeding.

**Total: 10–14 months from decisions to public launch**, with overlap between phases (Phase 1 and 2 can overlap; Phase 3 starts during Phase 2).

This is a realistic timeline for the bar described, with a small high-quality team. Faster only with more team or lower bar.

---

## 4. The decisions this requires

Phase 0 isn't "name + pricing." It's a real founder-level commitment to a budget and team shape. Six decisions to make first:

### Decision 1 — Budget cap

What's the cap on total investment to public launch? Three plausible answers:

- **$50k cap.** Solo build with Dylan + Claude + light contractor support. Quality bar lowers — closer to "great indie" than "Mymind-tier." Lifetime founding member campaign funds most of it.
- **$150k cap.** Dylan + one designer + occasional iOS engineer contract. Closer to the bar described above. Roughly funded by founding-member campaign + 6 months of personal runway.
- **$300k+ cap.** Real team — designer, iOS engineer, marketing contractor. Fully production-grade. Funded by external means (savings, angel, founder revenue elsewhere).

This decision determines almost everything else. Be honest with yourself about which one is real.

### Decision 2 — Team shape

Three options:

- **Solo** — Dylan + Claude + occasional contractors. Cheapest. Slowest. Quality limited by Dylan's design+engineering bandwidth.
- **Founding designer** — Dylan + one designer (full-time or 80% time) for the duration. Best quality-per-dollar. Likely path.
- **Small team** — Dylan + designer + iOS engineer. Fastest. Most expensive. Required if launch needs to happen in <10 months.

### Decision 3 — Native iOS scope

- **PWA-only at launch.** Faster, cheaper, lower share-extension quality. Risk: never feels like an iOS app.
- **PWA at launch, native iOS at launch+3-months.** Compromise. Public launch with PWA gets feedback; native ships shortly after.
- **Native iOS at launch.** Highest quality. Adds 3–4 months to launch timeline.

### Decision 4 — Brand sprint scope

- **In-house** with `huashu-design` and `taste-skill` skills available. Lowest cost. Quality depends on Dylan's taste + Claude's execution.
- **Solo designer engagement** — engage a strong indie designer for 4–6 weeks, ~$15–30k.
- **Studio engagement** — Order / Day Job / Studio Lin / Ramotion. ~$30–80k. Highest credibility, longest timeline (8–12 weeks).

### Decision 5 — Launch sequencing

- **Quiet beta.** Soft launch to friends + family. Test the founding-member campaign with 50 people. ~3 months until learnings inform real launch.
- **Founding member launch.** Open the 500 lifetime spots immediately at public launch. High pressure to deliver.
- **Indie press launch.** Sidebar.io / Designer News / Product Hunt sequenced. Maximum exposure but binary outcome.

### Decision 6 — What you don't ship

This is as important as what you do ship. Commit to NOT shipping:
- Public profiles
- Following / followers
- Comments on saves
- Recommendations from strangers
- A "discover" feed
- Streaks, gamification, achievements
- Ad monetization
- Affiliate links

These will be tempting once usage signals appear. The brand depends on saying no.

---

## 5. Revised execution plan (long-form version)

Because the timelines in `STRATEGY.md` were ambitious-but-still-quick. This is the realistic version aligned with the bar.

### Phase 0 — Commit (2–3 weeks)

**Owner:** Dylan + Claude.

- Name decision (with trademark + domain check).
- Budget cap committed.
- Team decision — solo vs founding designer vs small team.
- Brand sprint vendor decision.
- Native iOS commitment.
- Founding member campaign timing decided.
- LLC formed (Wyoming or Delaware).
- Stripe account opened.
- Trademark filing initiated.

Output: a one-page commitment doc that pins down every variable. **No code.**

### Phase 1 — Brand + foundation (8–12 weeks, parallel tracks)

**Track A — Brand sprint (8–10 weeks).** Designer or studio runs:
- Name validation + final.
- Logomark + wordmark (multiple rounds).
- Type system documentation.
- Color system documentation.
- Voice and tone guide with example microcopy across 30+ surfaces.
- Iconography direction (commission vs Lucide-with-customization).
- App Store icon set.
- Marketing landing page design.
- Photography/illustration direction.

Output: `BRAND.md` + Figma design system + asset library.

**Track B — Foundation engineering (8–12 weeks).** Dylan + Claude run:
- Repo rename + domain swap.
- Convert existing private build to new brand (visual refresh, not rewrite).
- Onboarding flow (welcome state + first-save walkthrough + partner invite).
- Account settings (display name, photo, household management, account deletion).
- Legal pages (privacy, terms, cookie consent).
- Marketing landing page (logged-out experience at root domain).
- Sentry + Plausible + ConvertKit waitlist.
- Stripe products + Checkout integration (not yet live, but plumbed).
- Founding member waitlist form live.

Output: a polished, branded, logged-out-marketable v0 of the existing app.

### Phase 2 — The five flows (12–16 weeks)

Each flow gets ~2–3 weeks of dedicated design + engineering. Order matters: Capture and Library are the foundation; Tonight, Trip, Cellar build on them.

- **Capture (3 weeks)** — share extension protocol, live-build animation, voice/email channels, Apify integration for Instagram, Whisper for video reels.
- **Library (3 weeks)** — spatial canvas, cluster-aware search, ⌘K, attention-decay, map mode promotion.
- **Tonight (2 weeks)** — surfacing engine cron + UX. Daily-changing single-thing-that-matters home.
- **Trip (3 weeks)** — destination mode, day planner, shared decisions UI, anniversary resurfacing.
- **Cellar (2 weeks)** — quarterly visit surface, archive flow, "still want this?" prompt design.
- **Polish + integration (3 weeks)** — recipe-to-Reminders, workout-to-Health, single-save public share-out URL, app-wide motion pass.

Output: the product Saves *is*.

### Phase 3 — Native iOS (12–16 weeks)

SwiftUI app with everything from Phase 2 implemented natively, plus:
- iOS share extension (URL, text, image inputs).
- Push notifications (Tonight resurfacing, partner activity, geo trigger).
- Offline-first library cache.
- Native maps integration (vs web's Google Maps).
- Live Activities for Trip mode.
- Widgets (Tonight on home screen).

Output: TestFlight beta → App Store submission.

### Phase 4 — Public launch (6–8 weeks)

- Founding Member campaign opens. 500 spots, $199 each. Visible counter on landing.
- Pocket migration importer + landing page.
- Press outreach: Sidebar.io, Designer News, ProductHunt, Tobias van Schneider's circle, indie design newsletters.
- TikTok/Instagram content seeded — not paid, organic content from Dylan + Keelin.
- Influencer/creator outreach (curators, food/travel writers, design Twitter).
- Stripe billing live across all three tiers.

Output: the product is in the market.

### Phase 5 — Iterate (ongoing)

Determined by user signal. Likely first real moves:
- Android app
- Semantic search via pgvector
- Better Apify maintenance (or alternative)
- Family plan tier (4+ members) if requested
- Web extension for desktop save-from-anywhere

---

## 6. The "shockingly fun" QA loop

Once the product exists, how do we know it cleared the bar?

Not metrics. Six qualitative tests:

1. **The screenshot test.** Does anyone post a screenshot to Twitter/Threads unprompted in week one of beta?
2. **The friend test.** Do beta users show this to a friend in person without being asked?
3. **The retention shape.** Day-1 retention 70%+, week-1 50%+, month-1 35%+. Below those, we're not there.
4. **The unprompted compliment.** Do users send "this is beautiful" / "I love this" messages to support email without prompting?
5. **The press fit.** Does Sidebar.io / Designer News include us *organically* (not paid, not seeded)? If yes, we cleared the design bar.
6. **The "I keep coming back" test.** Do users open the app on day 7 without a notification? If yes, Tonight is working.

If three of six are clearing, we're in the right zone. If five of six, this is a real product.

---

## 7. The honest summary

To hit "shockingly fun":

- **~10–14 months** from commit to public launch.
- **~$80–200k** in capital, depending on team/quality choices.
- **~3 people** at minimum in the working group: Dylan, a designer, an iOS engineer (full or contract).
- **Paid services**: Apify, Whisper, Stripe, Sentry, Plausible, Postmark, ConvertKit, Apple Developer, brand sprint engagement.
- **Decisions before code:** name, budget, team shape, iOS scope, brand sprint vendor, launch sequencing, what we explicitly don't ship.

This isn't a "few weeks" project. It's the multi-month build of a real product that has a chance of mattering. The reason every detail has to be considered is that the apps that clear this bar — Linear, Things, Mymind, Bear, Arc — *all* spent a year-plus on each of their first releases with small focused teams.

The Saves we have today is a strong proof of concept. The Saves you're describing is a different category of artifact.

---

## 8. One question to start with

Before any of the six decisions in Section 4: **what's the budget cap?**

Everything else flows from that. $50k = solo with contractor help, smaller bar. $150k = founding designer + occasional iOS contract, real bar achievable. $300k = small team, full bar plus margin.

Pick the number, then we work the rest of the plan to fit.

---

*This document is a companion to STRATEGY.md. Both should evolve as Phase 0 commitments crystallize.*
