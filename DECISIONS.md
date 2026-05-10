# Phase 0 — Decisions

**Working document.** Fill out when you have time and quiet to think. No section is required — but every section unanswered is a fire someone has to put out later. Skip nothing without writing *why* you're skipping it.

This doc is the input to every subsequent decision. When `STRATEGY.md` or `REQUIREMENTS.md` says "depending on your call on X," X is here.

> **How to use this:** Open it in a text editor, write directly between the prompts. Move on when you've written something honest, even if it's "not sure yet — leaning toward Y." Re-read your own answers a week later and edit. Commit when it feels stable.

---

## A. Why are we doing this?

The cheapest source of clarity. If these answers are vague, every later decision will drift.

### A1. What is your one-line motivation for building this?

The most honest sentence you can write about why this matters to you personally. Not the pitch deck version — the version you'd say to a friend over coffee.

> *(your answer here)*

### A2. Why is now the right moment?

Why not last year? Why not next year? What's specifically true today that makes this the right thing to spend the next year on?

> *(your answer here)*

### A3. If this works exactly the way you want it to, what is your life like 18 months from now?

Be specific. Working how many hours? On what? Where? With whom? Earning what? What does Tuesday at 2pm look like?

> *(your answer here)*

### A4. If this doesn't work — i.e., it's at month 12 and there's no real traction — what's the acceptable outcome?

What's the version of "this didn't pan out" that you can live with? "I learned a lot" is a fine answer if it's true. So is "I built a beautiful tool just for us." So is "I made $30k from a small loyal user base and went back to a job."

> *(your answer here)*

### A5. What's your "stop doing this" signal?

The thing that, if it happens, you walk away. Could be financial ("I burned through $X with no revenue"), time-based ("I'm still on Phase 2 in month 9"), emotional ("Keelin and I are fighting about it"), or signal-based ("after public launch, MAU < 200"). Write the kill criteria *now* before you're emotionally invested.

> *(your answer here)*

---

## B. Personal context

The part most strategy docs skip. Resources include time and energy, not just money.

### B1. Day-job situation

Are you full-time on this, part-time on this, or fitting it around something else? If "fitting around," for how long?

> *(your answer here)*

### B2. Personal financial runway

Honest answer: how many months of personal expenses do you have covered without revenue from this? (You don't have to share a number; just write a duration: "6 months," "18 months," "indefinite.") This shapes everything from team size to launch urgency.

> *(your answer here)*

### B3. Capital available to put into the business

Separate from personal runway. How much money are you willing to spend on this project — pre-revenue — across designers, contractors, software, brand work, legal? Pick a range, not a single number.

> *(your answer here)*

### B4. Keelin's involvement

She's a user, a co-founder, a sounding board, an investor, supportive-but-not-involved? Be honest about what role she'd play and what she's already said about it.

> *(your answer here)*

### B5. Health / sustainability

Solo founder burnout is the biggest risk to solo founder products. What are your non-negotiables for sustainability? Daily exercise? Weekend off? Therapy? Hobbies? Vacation cadence? Write them down and treat them as project requirements.

> *(your answer here)*

### B6. Existing network / advantages to leverage

What do you already have that most founders don't? Specific people, specific access, specific skills, specific existing audience. List five things, even if they feel small.

> *(your answer here)*

---

## C. Budget

The single most leveraged decision. Everything in `REQUIREMENTS.md` flows from this.

### C1. The cap on total pre-revenue investment

Pick one of the three benchmarks from `REQUIREMENTS.md` Section 4, or write your own:

- [ ] **~$50k cap** — solo with contractor help. Lower bar but achievable. ("Great indie" tier.)
- [ ] **~$150k cap** — founding designer + occasional iOS contract. The bar described in `STRATEGY.md` is hittable. (Mymind-tier achievable.)
- [ ] **~$300k+ cap** — small team. Fully production-grade with margin. (Linear-tier achievable with effort.)
- [ ] **Other:** *(write your own)*

> *(your answer + brief reasoning)*

### C2. Where does this capital come from?

Personal savings? Founding-member campaign cash flow? Angel investment? Bootstrap from another business? Don't borrow against the future you don't have yet.

> *(your answer here)*

### C3. What's the burn rate ceiling?

Per-month spend you're willing to sustain pre-revenue. Different from total cap — this is the rate.

> *(your answer here)*

### C4. Are you willing to take outside investment?

Even a small angel check ($25–100k) changes the company's shape (board seat? control? exit pressure?). Be honest about your appetite.

- [ ] No outside money. Bootstrapped.
- [ ] Small angel (one or two trusted individuals).
- [ ] Open to raising a seed round if needed.
- [ ] Not sure — depends on terms.

> *(your answer + reasoning)*

---

## D. Team

### D1. Team shape commitment

Pick one:

- [ ] **Solo** — Dylan + Claude + occasional contractors only.
- [ ] **Founding designer** — Dylan + one designer (full-time or 80%) for the duration.
- [ ] **Small team** — Dylan + designer + iOS engineer (full or contract).
- [ ] **Other:** *(describe)*

> *(your answer + reasoning)*

### D2. If hiring/engaging a designer, what's your sourcing approach?

- [ ] Network introductions.
- [ ] Outreach to specific people whose work I admire (list them).
- [ ] Studio engagement (which ones?).
- [ ] Job posting on Designer News / Sidebar / Read.cv.
- [ ] Already have someone in mind — *(name)*.

> *(your answer here)*

### D3. Designer profile

What kind of designer? Brand strategist? Product designer? Both-in-one? Jr/mid/senior? Industry background (consumer? B2B? agency? in-house?). Write a one-paragraph "ideal candidate" description.

> *(your answer here)*

### D4. iOS engineer — when and how?

If native iOS is in scope (see Section E):
- When do they join — Phase 2 or Phase 3?
- Full-time hire, contractor, or fractional?
- Sourcing approach?

> *(your answer here)*

### D5. What roles are you NOT willing to outsource?

The things that have to stay with you regardless. Examples: "the brand voice," "the product principles," "the user research," "the AI prompt engineering." Naming them upfront prevents drift.

> *(your answer here)*

---

## E. Product scope

### E1. Native iOS commitment

Pick one:

- [ ] **PWA-only at launch.** Faster, cheaper. Risk: doesn't feel like an iOS app. Native added later if signal warrants.
- [ ] **PWA at launch, native iOS at launch+3 months.** Compromise.
- [ ] **Native iOS at launch.** Highest quality. Adds 3–4 months to launch timeline.

> *(your answer + reasoning)*

### E2. Android — when?

- [ ] Never as a priority.
- [ ] Year 2 if iOS validates.
- [ ] Web PWA covers Android forever.
- [ ] Other: *(describe)*

> *(your answer here)*

### E3. The five signature flows — all five, or fewer at launch?

`STRATEGY.md` proposes Capture, Library, Tonight, Trip, Cellar at launch. Are all five real for v1, or are some Phase 5 / post-launch?

If trimming: which can wait, and what's lost by waiting?

> *(your answer here)*

### E4. Audio capture / voice capture

"Hey Saves, save that podcast Marco mentioned" — is this v1 or later? It's substantial work (Whisper integration + intent parsing + on-device speech UI).

- [ ] v1.
- [ ] v2 / post-launch.
- [ ] Never.

> *(your answer here)*

### E5. The "make-the-save-active" loops

Recipe → grocery list. Workout → fullscreen execute + Apple Health. Article → offline read.

- [ ] All three at launch.
- [ ] One at launch (which?).
- [ ] None at launch.

> *(your answer + which to prioritize)*

### E6. Pocket migration importer — yes / no?

`STRATEGY.md` flags this as a real wedge given Pocket's July 2025 shutdown. It's a 1-screen feature that can drive serious top-of-funnel.

- [ ] Yes — ship at launch.
- [ ] Yes — ship in Phase 5.
- [ ] No.

> *(your answer + reasoning)*

---

## F. Brand

### F1. Name commitment

`STRATEGY.md` lead candidate: **Cairn.** Strong alternates: Trove, Atlas, Vellum, Larder.

What's your final-or-leaning name? (Run domain check + USPTO search before committing.)

- [ ] Cairn
- [ ] Trove
- [ ] Atlas
- [ ] Vellum
- [ ] Other: *(write it)*
- [ ] Stay with "Saves" (commit to making a generic name work)

> *(your answer + reasoning)*

### F2. Domain availability

Check before committing. Note results:

- `cairn.com` — *(taken / available / brokered for $X)*
- `cairn.app` — *(check)*
- `cairn.so` — *(check)*
- `cairn.co` — *(check)*

> *(your findings)*

### F3. Trademark check

Quick USPTO TESS search for the name in software / consumer apps. Note any concerning prior filings.

> *(your findings or "not yet checked")*

### F4. Brand sprint scope

Pick one:

- [ ] **In-house** with `huashu-design` and `taste-skill` skills, Dylan + Claude. ~$0–5k.
- [ ] **Solo designer engagement** — engage a specific indie designer for 4–6 weeks, ~$15–30k. *(Who?)*
- [ ] **Studio engagement** — Order / Day Job / Studio Lin / Ramotion / other. ~$30–80k. *(Which one?)*

> *(your answer + reasoning)*

### F5. Custom typography or commercial license?

- [ ] Stick with Fraunces + Space Mono (free, current). No additional cost.
- [ ] Commercial license (Klim's Söhne family or similar, ~$1–3k).
- [ ] Commission custom typography (~$15–40k).

> *(your answer)*

### F6. Voice and tone — non-negotiables

Three rules of voice that the brand must always follow. Examples: "no exclamation marks except in genuine moments." "Plural-aware ('you and Keelin') always." "Confident, never hedging." Write yours.

> *(your three rules)*

---

## G. Pricing & business model

### G1. Pricing tier commitment

`STRATEGY.md` proposes: $8/mo personal, $12/mo household, $199 lifetime founding (capped 500). Annual ~25% off.

- [ ] Use as proposed.
- [ ] Adjust to: *(write your numbers)*
- [ ] Different model entirely: *(describe — e.g., one-time, freemium-only, etc.)*

> *(your answer + reasoning)*

### G2. Free tier shape

`STRATEGY.md` proposes: 50 lifetime saves, manual paste only, no AI extraction, no share extension. Generous enough to evaluate; not so generous that nobody upgrades.

- [ ] Use as proposed.
- [ ] Different limits: *(specify)*
- [ ] No free tier — paid only.

> *(your answer)*

### G3. Founding member campaign timing

When does it open? When does it close (date or # sold)?

- [ ] Open at Phase 1 marketing-page launch (collect waitlist now, charge later).
- [ ] Open at Phase 2 product reveal.
- [ ] Open at public launch.
- [ ] No founding-member tier.

> *(your answer + cadence)*

### G4. Outside revenue paths to consider

Beyond the $8/$12/$199 mix:

- [ ] Affiliate revenue (recipe sites, hotel bookings)? — *(my position)*
- [ ] Premium AI tier (deeper extraction, larger libraries)? — *(my position)*
- [ ] B2B / team plan (interior designer firms, agencies)? — *(my position)*
- [ ] One-time lifetime add-on packs (e.g., Trip mode unlock)? — *(my position)*

> *(your reasoning)*

---

## H. Launch and distribution

### H1. Launch sequencing

Pick one:

- [ ] **Quiet beta first.** Soft launch to friends + family for ~3 months. Founding-member campaign opens after learnings.
- [ ] **Founding member open at launch.** 500 spots visible from day 1. High pressure to deliver.
- [ ] **Indie press launch.** Sidebar.io / Designer News / Product Hunt sequenced for max exposure.
- [ ] **Hybrid.** *(describe)*

> *(your answer + reasoning)*

### H2. Marketing channels you're committed to

- [ ] Indie design press (Sidebar.io, Designer News, etc.)
- [ ] Pocket migration SEM
- [ ] TikTok / Instagram organic content
- [ ] Newsletter / newsletter sponsorships
- [ ] Influencer outreach
- [ ] Paid social (Meta, etc.)
- [ ] Other: *(describe)*

> *(your top 3 with reasoning)*

### H3. Press / PR strategy

DIY or engage someone? If engaging: in-house comms hire, fractional, or agency?

- [ ] DIY (Dylan does outreach).
- [ ] Fractional comms support around launch (~$3–8k/mo for 3 months).
- [ ] Agency.
- [ ] Don't bother — let product speak.

> *(your answer)*

### H4. Content production budget for launch

Photography, video, written manifesto, social content. ~$5–15k for a serious launch package.

- [ ] Bootstrapped — Dylan + iPhone.
- [ ] Modest budget (~$3–5k for one shoot day or video).
- [ ] Full production (~$10–15k).

> *(your answer)*

---

## I. What we explicitly DON'T do

`STRATEGY.md` says "restraint is the brand." Confirm or amend the no-list. Things that will be tempting once usage signals appear, that we commit *now* to not building.

For each, mark:
- ✅ Hard no — never going to ship this.
- 🟡 Soft no — possibly later, not in v1.
- ❌ Disagree — I want this.

| Feature | Position |
|---|---|
| Public profiles | |
| Following / followers | |
| Comments on saves | |
| Recommendations from strangers | |
| A "discover" feed of other users' saves | |
| Streaks / gamification / achievements | |
| Ad-supported free tier | |
| Affiliate links (commission on referrals) | |
| Crypto / NFT / web3 anything | |
| AI chat with your library ("ask your saves") | |

> *(any annotations or amendments)*

---

## J. Risks and what would change everything

### J1. The risk that worries you most

Of the risks in `STRATEGY.md` Section 10 (Mymind ships households / Apple Notes adds AI / Anthropic price hike / IG scraping breaks / solo burnout / pricing wrong / brand sprint produces something derivative / App Store rejection) — which one keeps you up at night, and what's your real mitigation?

> *(your answer)*

### J2. The thing you'd do differently if cap was 2x

If your budget cap doubled tomorrow, what would you spend the additional money on? This often reveals the highest-leverage gap.

> *(your answer)*

### J3. The thing you'd do differently if timeline was 2x

If you had 24 months instead of 12 — what would you build differently?

> *(your answer)*

### J4. The thing you'd do differently if it was just for you and Keelin forever

If you committed to never going public — just an artifact for the two of you — what changes? This often reveals what's "for the business" vs "for the actual user."

> *(your answer)*

---

## K. The seven absolute commitments

The things you commit to *not changing* through the build, no matter the pressure. Write them in your own words.

1. *(commitment 1)*
2. *(commitment 2)*
3. *(commitment 3)*
4. *(commitment 4)*
5. *(commitment 5)*
6. *(commitment 6)*
7. *(commitment 7)*

These get printed and pinned somewhere visible. They're the things that become arguments when reviewers (designers, advisors, investors, friends) push back. The answer is "we're not changing this."

---

## L. The decision summary

Once Section A–K is filled out, the answer to the six big calls collapses to a paragraph:

| Decision | Your call |
|---|---|
| Name | *(C1 → here)* |
| Budget cap | *(C1 → here)* |
| Team shape | *(D1 → here)* |
| Native iOS scope | *(E1 → here)* |
| Brand sprint scope | *(F4 → here)* |
| Launch sequencing | *(H1 → here)* |
| Pricing | *(G1 → here)* |

When this table is filled, Phase 0 is done and Phase 1 begins.

---

## M. Open questions you have for me

Anything in `STRATEGY.md` or `REQUIREMENTS.md` that's unclear, that you disagree with, or that needs deeper exploration before you can answer the above. Drop them here and we'll work through them.

> *(your questions)*

---

*This document is the founder's working space. Not for public consumption. Honest answers > polished answers.*
