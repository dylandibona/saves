# Stratum v2 — CHANGELOG targets (2026-05-17 drop 2)

Five PNG screenshots captured from Claude Design's updated prototype at
`_design input/design_handoff_finds_stratum_v2 2/`. These are the
ground truth for the second design drop, which adds:

1. **App-wide rules** — no hamburger anywhere; single-row header with
   sigil+wordmark left and italic-serif title fragment right
2. **Subscription section** inserted as the first section on `/settings`
3. **Map** chrome rewrite + pin-tap behavior (card starts hidden, opens
   on pin tap, gains a chevron expand-to-detail chip)

| File | What it shows | Source component |
|---|---|---|
| `library.png` | New single-row header: `[sigil] Finds` left · `10 kept.` italic-serif right. Cards unchanged. | `StratumV2` |
| `library-recipe.png` | Filtered: `3 recipes.` — number in recipe tone, "recipes" in italic serif, period dim | `StratumV2` |
| `settings.png` | New `Your settings.` title top-right. New SUBSCRIPTION section first: plan card with `Free` + `10 of 12 finds used` mono + cream `UPGRADE` pill + See plans / Billing history buttons. | `StratumV2Settings` |
| `map.png` | Map default — no card visible. Single-row header in glass: `[sigil] Finds` · `map` italic. Drag-scroll category strip below. | `StratumV2Map` |
| `map-tapped.png` | After tapping a pin — card slides up with thumbnail + category-tinted meta line + title + place + `>` expand chip on the right edge that navigates to Detail | `StratumV2Map` with pin clicked |

## Implementation rubric (from CHANGELOG.md §"Implementation order")

1. Remove every top-left hamburger button. Only the sigil+wordmark stays.
2. Rewrite the shared header pattern app-wide.
3. Add the Subscription section. Wire to existing `users.subscription_status`
   + `lib/billing/*`. UPGRADE → `/api/checkout`. MANAGE → Stripe Billing Portal.
4. Update the Map: drop `ON THE MAP · n`, add wordmark header, change
   `selectedSave` initial state to `null`, add the chevron-expand chip.

## Subjective acceptance

- Header row reads `[sigil] Finds` left, `[number] [italic-serif word].` right
- Period at end of title fragment is `var(--color-mute)` not full paper
- "kept" / "recipes" / "settings" / "map" all use `font-serif-display` (Instrument Serif Italic)
- No `YOUR LIBRARY` / `YOUR ACCOUNT` mono labels remain
- Settings: Subscription is FIRST, before Household
- Map: opens with no card; tapping pin reveals it; chevron chip on the card
- Capture and Detail unchanged from previous drop
