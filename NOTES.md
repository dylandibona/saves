# Notes — running dev log

Session-by-session record. Short, honest, useful for the next session (mine or Dylan's).

**Convention:** newest entries at the top. Each session gets a date + summary. Inside: what shipped, what's stuck, what's next, open questions for Dylan.

---

## 2026-05-11 — Brand reset to Finds, strategy doc cleanup

**What shipped:**
- Saves → Finds rename swept across code, docs, icons (`4d6b924`).
- Apple SIWA removed completely — code, disk keys, docs (`796ea63`).
- `STRATEGY.md` rewritten to match the actual project shape (craft project, no startup theater).
- `REQUIREMENTS.md` retired to `docs/archive/`.
- `PLAN.md` created with prioritized work list.
- `NOTES.md` created (this file).
- `RUNBOOK.md` documenting how Dylan + Claude work together.
- `DECISIONS.md` filled by Dylan with Phase 0 commitments.
- F-block icon replaced the noun-S; all four PNG sizes regenerated.

**What's stuck / pending:**
- Domain swap to `finds.dylandibona.com` — Dylan needs to add as Vercel alias + Cloudflare CNAME + Supabase URL config + Google OAuth origin. Code-side `metadataBase` will swap when DNS resolves.
- PWA Share Target never validated end-to-end on real iOS device.
- Existing pre-extraction saves (~handful from earlier testing) still have empty `canonical_data.extracted`.

**What's next (top of `PLAN.md`):**
1. Stripe gate architecture — plumb billing infrastructure with the lock held open.
2. Existing-saves backfill — `reprocessSave` action + `npm run backfill` CLI + "Refresh" button on detail page.
3. Capture flow at full quality (multi-part, biggest piece of work).

**Open questions for Dylan:**
- When you want to swap to `finds.dylandibona.com`, ping me — I'll do the code-side `metadataBase` + `/saves/[id]` → `/finds/[id]` rename in one push.
- For Stripe pricing tier: confirm $4/$2 in STRATEGY.md is the working number? (It's there now; change if you want different.)

**Decisions made this session:**
- Name: Finds (after Saved-vs-Kept-vs-Finds analysis — Finds won every dimension).
- Apple SIWA out.
- Stripe gate-now-architecture-not-actually committed.

---

## Template for future entries

```markdown
## YYYY-MM-DD — [one-line summary]

**What shipped:** (commits, features, fixes)

**What's stuck / pending:** (blockers, decisions waiting on Dylan)

**What's next:** (top of PLAN.md, or a deviation with reasoning)

**Open questions for Dylan:** (things to answer async)

**Decisions made this session:** (so we don't relitigate later)

**Subagent runs:** (which subagents we dispatched and what they returned)

**Things worth flagging:** (anything in the "what Dylan doesn't know yet" category from RUNBOOK §6)
```

---

## How this file evolves

- I write the entry at the end of each working session.
- Dylan reads it before the next session to catch up.
- After ~50 entries, oldest ones move to `docs/archive/NOTES-YYYY.md` and this file resets.
- Patterns I notice across many sessions go up to `RUNBOOK.md` or `CLAUDE.md` so they don't have to be re-discovered.
