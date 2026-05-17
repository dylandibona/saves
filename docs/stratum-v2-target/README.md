# Stratum v2 — success-mode targets

These six PNG screenshots are the **ground truth** for the redesign. They were captured directly from Claude Design's working prototype (`_design input/design_handoff_finds_stratum_v2/`) via headless Chrome, mounting each Stratum v2 component into a 380×820 phone frame.

Use these as the visual rubric during implementation and verification. If the built app deviates from these in a way the handoff README didn't anticipate, ask before deviating further.

| File | What it shows | Source component |
|---|---|---|
| `library.png` | Library default, "10 Finds." count line, full unfiltered card list, dock closed | `StratumV2` |
| `library-recipe.png` | Library filtered to recipes — "3 recipes." with category-tone numeral + recipe-tone underline | `StratumV2` with `active='recipe'` |
| `library-dock.png` | Library with the floating dock open — 3 icons + "+ Keep" pill | `StratumV2` with dock opened |
| `capture.png` | Capture at `phase=complete` — italic serif title, EXTRACTED panel, ENRICHED ready chip, MY FAMILY / JUST ME tabs, cream Keep button with category-tinted top edge + halo | `StratumV2Add` |
| `detail.png` | Detail page — full-bleed hero, KEPT chip, italic serif title, NOTE block, EXTRACTED summary, ingredients list, two-button footer | `StratumV2Detail` |
| `detail-options.png` | Detail with Options popup open — Share / List / Copy / Edit / Delete | `StratumV2Detail` with options open |

## How these were captured

```bash
# From the repo root with the design-canvas preview server running on :5174:
chrome --headless=new --window-size=380,820 \
       --screenshot=docs/stratum-v2-target/<view>.png \
       'http://localhost:5174/render-target.html?view=<view>'
```

Render harness: `_design input/design_handoff_finds_stratum_v2/_render/render-target.html`. The harness mounts a single Stratum v2 component into a 380×820 div, optionally clicks an interaction (recipe filter / dock open / options open) before signaling `window.__ready=true`.

## Verification protocol during implementation

After each implementation step (per PLAN.md §0), run the local dev server, navigate to the corresponding production route in a 380px-wide viewport, and side-by-side compare against the matching target image:

| Production route | Compare to |
|---|---|
| `/` | `library.png` + `library-recipe.png` (filter on) + `library-dock.png` (dock open) |
| `/add` (post-enrichment of an IG reel) | `capture.png` |
| `/saves/<id>` | `detail.png` + `detail-options.png` (Options open) |

Subjective acceptance criteria (not pixel-diff, but spirit):
- Same font families, sizes, weights, letter-spacing
- Same color tokens, including per-category tones
- 4px max border radius everywhere except glyph-dots
- Italic serif appears ONLY on the Capture title (post-resolve) and Detail title
- Mono "meta line" reads `CATEGORY · TIME · INITIALS` with category-tinted category name
- No saver pills anywhere
- No always-visible top nav; floating dock at bottom-right, closed by default
- No animated jewel orbs in the background

If a production screen differs from its target image in a way that isn't covered by the handoff README's "in-spirit / not designed" caveats, that's a regression — fix or escalate.
