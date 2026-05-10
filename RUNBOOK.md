# Runbook — how we work

Operating protocol for the Dylan + Claude co-founder pair. Pinned, editable, revisited at every project phase.

> **Premise:** This is the experiment in *what motivated individual + AI can build at full quality*. The runbook has to actually scale to that ambition — not "personal project habits."

---

## 1. Roles

### Dylan
- Product principles, brand voice, design taste-final-call.
- User research with himself, Keelin, friends.
- Strategic direction, scope decisions, name + visual identity calls.
- Anything where personal judgment is the thing being applied.
- Fund decisions, contractor engagement, legal commitments.

### Claude
- Implementation across stack (frontend, backend, infra, AI, design execution).
- Proactive technical suggestions — flag things Dylan should know about.
- Documentation hygiene — keep CLAUDE.md, STRATEGY.md, DECISIONS.md, NOTES.md current.
- Tool/method recommendations — when and how to use specific Claude Code capabilities.
- Subagent orchestration for large work.
- Research and competitive analysis on demand.
- Code review and design critique via subagents.
- Calling out gaps Dylan might not see.

### Joint
- Major architectural decisions.
- "Done" criteria for any feature.
- Trade-off discussions when scope vs quality vs time tension surfaces.

---

## 2. Documentation hierarchy

Living docs, in order of how often they update:

| Doc | Purpose | Update cadence |
|---|---|---|
| `CLAUDE.md` | Onboarding doc for any future Claude session — what the project IS today | After every meaningful change |
| `STRATEGY.md` | Product north star — vision, positioning, brand, business model thinking | Monthly or on major pivots |
| `RUNBOOK.md` | This file — how we work | When working mode evolves |
| `DECISIONS.md` | Phase 0 founder commitments | Stable once filled |
| `PLAN.md` *(to create)* | Prioritized list of next worthwhile things to build | Weekly or as work completes |
| `NOTES.md` *(to create)* | Running dev log — what shipped, what's stuck, observations | After each work session |
| `BRAND.md` *(to create at Phase 1)* | Voice, type system, color tokens, microcopy rules | When brand sprint runs |
| `ADRs/` *(to create as needed)* | Architecture Decision Records — one per major technical choice | One file per ADR |

**Convention:** every new doc gets a heading at the top with: purpose, last updated, and the section of `STRATEGY.md` it relates to.

---

## 3. Subagent team

Saves' subagent specialists. Each one is a research/critique/execution agent with a defined remit. I dispatch them when work needs structured isolation — they don't pollute the main session context, and they bring back findings.

| Agent | When to use | Scope |
|---|---|---|
| **research** | Competitive analysis, market research, technical-prior-art questions, pricing benchmarks, user-behavior data | "Go find what X looks like / costs / has done well." Returns under-2000-words structured findings. |
| **design-critique** | Reviewing visual or UX work — does the screen clear the bar? Where does it fall short? | Uses `huashu-design` skill (HTML hi-fi prototyping + 5-dimensional expert review) and `taste-skill` (anti-slop frontend). Returns a critique with specific fixes. |
| **architecture** | Planning major technical changes — schema migrations, new flows, infrastructure decisions | Returns a plan, not code. Identifies risks, sequences work. |
| **code-review** | After multi-file changes — does it hold together? Any cross-file inconsistencies? | Reads everything that changed, flags issues. Uses the project-specific `Explore` agent for fast file lookups. |
| **microcopy** | Voice consistency review — does this microcopy match the K commitments? | Reads the seven absolute commitments, audits any user-facing text. |
| **devops** | Vercel/Supabase/Stripe configuration sanity, deployment troubleshooting | Specialized: knows the production stack, env vars, deploy gotchas. |
| **brand-sprint** *(activates when we're doing brand work)* | Naming, identity exploration, type system, marketing aesthetic | Uses `huashu-design` deeply. Returns multiple directions, not one answer. |

**Convention:** when I dispatch a subagent, I include the prompt verbatim in NOTES.md so we have a record of what was researched.

---

## 4. Claude Code techniques to use

Beyond basic file edits, the toolkit Dylan should know about:

### MCP servers active

- **Supabase MCP** — `apply_migration`, `execute_sql`, `generate_typescript_types`, `list_migrations`, `get_logs`, `get_advisors`. Schema changes go through this, not through the dashboard.
- **Available but not yet wired:** consider adding **Stripe MCP** (manage products/prices when we add billing), **GitHub MCP** (issue tracking, PRs).

### Local skills available (gitignored, in repo working dir)

- **`huashu-design/`** — HTML hi-fi prototyping, design exploration, expert 5-dim review, 24 prebuilt showcases. Use for: brand sprints, hero animations, marketing landing page, big design moments. Read its `SKILL.md` before invoking.
- **`taste-skill/`** — Anti-slop frontend skill. Layout/typography/motion/spacing upgrades. Use for: UI polish passes, microinteraction design, "make this not look AI-built."

### Hooks worth setting up

- **Pre-commit:** `npx tsc --noEmit` and ESLint must pass before any commit lands.
- **Post-migration:** auto-regenerate `lib/types/supabase.ts` after `apply_migration` runs.
- **Post-edit on user-facing copy:** auto-trigger microcopy subagent review.

### Slash commands worth creating

- **`/ship`** — runs typecheck + build + commit + push as one operation
- **`/review`** — invokes code-review subagent on uncommitted changes
- **`/migrate <name>`** — scaffolds a new migration file with timestamp + opens it
- **`/design-review <screen>`** — invokes design-critique subagent on a specific screen

### Working in worktrees

For experimental features that might not land — use Claude's `EnterWorktree` capability. Keeps main branch clean, lets us prototype freely. Especially useful for brand experiments or major UI rewrites.

---

## 5. Communication cadence

### Within a working session
- I propose, Dylan decides on anything strategic or design-feel.
- I implement, then summarize what changed, in plain language.
- I flag risks in line ("note: this approach has X trade-off") rather than burying them.
- I ask once if uncertain, then commit. Don't make Dylan re-confirm the same call multiple times.

### Between sessions
- `NOTES.md` gets an entry at the end of each session: what shipped, what's stuck, what's next.
- Open questions get a section in NOTES.md — Dylan answers async when it suits him.
- If something is *blocking* the next session's work, it gets called out at the top.

### Decision logging
- Anything that takes a paragraph to explain gets an entry in `DECISIONS.md` or an ADR.
- "We decided X because Y, alternatives were Z, expected to revisit when W."
- This prevents re-litigating decisions weeks later.

---

## 6. What Dylan doesn't know yet (or might not)

I'll proactively flag these when relevant. Cataloging known gaps now:

### Technical
- **Pocket migration urgency window** — Pocket shut down July 2025. The "I lost my saves" search-intent peak was the second half of 2025. We're now in May 2026 — still a real opportunity but the wave is past. Plan accordingly.
- **PWA share-target limitations on iOS** — even when installed, iOS PWA share targets have quirks (no Live Activities, no widgets, no background notifications). Native is meaningfully better; PWA is workable for v1.
- **Supabase RLS performance at scale** — RLS policies that join through other tables get slow at >100k rows. Saves' visibility model joins captures→saves→users; will need denormalization at scale.
- **Stripe webhook idempotency** — double-charging from retries is a thing. Handle webhook IDs as primary keys.
- **Apple SIWA private email relay** — when users sign in with Apple, Apple gives us a relay email, not their real one. Need to handle this for `capture_email` generation.
- **iOS share extension memory limits** — 120MB ceiling on share extensions. Heavy enrichment must happen server-side.

### Product
- **The "build the save in front of the user" animation is technically demanding** — needs SSE or WebSocket for live progress updates from the enrichment server. Not Next.js Server Action territory.
- **Audio transcription cost** — $0.006/min via Whisper API. A 60-second IG reel = $0.006. Cheap, but multiplied by users it adds up.
- **The capture flow has to handle network failures gracefully** — user is on Instagram, taps share, network is bad. The save needs to queue and retry, never lose.
- **Solo + AI ceiling** — design execution is where AI is most uneven. I can write code at quality. Critiquing whether a screen feels right is harder. We need either a critique loop with you (you reviewing every screen) or a real designer engagement. Honest assessment.

### Brand / Marketing
- **First impression is the App Store screenshots** — they convert visitors at 5× the rate of any other asset. Spend disproportionate time on them.
- **The "demo video" is the tweet that goes viral** — for apps in this category, the share-from-IG-and-watch-it-extract video is the marketing object. Plan for it.
- **Indie press has gatekeepers** — Sidebar.io editor is one person. Designer News is moderated. Getting featured is part craft, part relationships, part timing.

### Business
- **App Store payments take 30%** — if/when we go native iOS with subscriptions, Apple takes 30% (15% after year one, 15% if under $1M ARR via the Small Business Program). Web checkout via Stripe avoids this. Build paid signup on web, link from iOS.
- **GDPR matters even for US-only apps** — if any EU user signs up, GDPR applies. Cookie consent, data export, account deletion — non-negotiable.
- **Trademark filing is per-class, per-jurisdiction** — US Class 9 (downloadable software) and Class 41 (online services) are the two relevant classes. EU separately if going global.

### Claude Code specifically
- **Subagents have isolated context** — efficient for research but they don't see what's been discussed in the main thread. Brief them fully when dispatching.
- **The session has a context window** — when it fills, we hit a "compaction" event that summarizes earlier conversation. Long-running projects benefit from frequent commits to docs that survive compaction.
- **Skills are powerful but consume tokens** — invoking `huashu-design` loads its full SKILL.md. Don't use it for routine work.

---

## 7. The first three things to do, post-runbook

In order:

1. **Pick the name (Kept or commit to Saves).** Run TESS + domain checks within an hour. Update repo, domain, docs, microcopy.
2. **Rewrite STRATEGY.md** to match the actual project shape. Retire REQUIREMENTS.md to `docs/archive/`.
3. **Create PLAN.md** — the prioritized working doc. First entries: Stripe gate-architecture (open lock), capture flow rebuild at full bar, NOTES.md template, deploy hygiene (CI typecheck pre-merge).

After that, we're in build mode.

---

*This runbook is living. Updated when our working mode evolves. The discipline of having it — and following it — is part of the experiment.*
