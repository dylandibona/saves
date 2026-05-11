# Finds — Design Direction

A kept place for two people. Dark, warm, deliberate.

---

## 1. Mood and philosophy

**Three words:** *Kept. Warm. Considered.*

**Lineage:** *Kenya Hara's "Emptiness" (空)* as the structural philosophy, with *Sagmeister & Walsh "joy through color"* as the signature chromatic moment. From the huashu 20, this is school 17-20 (Eastern philosophy) grounding the system, with one precise school 09-12 puncture per surface.

Hara is the right foundation because Finds is not a feed and not a tool. It is a *vessel that holds*. The library is the brand. The product disappears so the contents can breathe. Hara's principle of *emptiness as receptivity* (the empty bowl that accepts what is placed in it) is literally the product's job. Saves are the content; the app is the bowl.

But pure Hara would be too austere for two people who DM each other Instagram reels. The references (VIBEMOVE's deep-green hero, Dares' vivid card photography) prove the founder wants warmth, not a Muji wall. So the system borrows Sagmeister's discipline of *one saturated color used with total commitment* — never a palette of accents, never a gradient. One signature color per surface, fully owned.

**Anti-philosophy. What Finds is NOT:**

- Not a Pinterest-style tile wall. We refuse uniform grid energy.
- Not a Notion clone. We refuse productivity-software chrome (sidebars, breadcrumbs, status icons).
- Not a feed. We refuse infinite scroll, timestamps as identity, engagement nudges.
- Not a tech product. We refuse SF Pro/Inter default-iOS aesthetics, glassmorphism, neon gradients, "AI sparkle" icons.
- Not gamified. Zero streaks, badges, counts-as-status. *Capture_count* is informational, never celebratory.

The Hara lineage is the reason we say no to all of that. The bowl does not announce itself.

---

## 2. Color system

A single dark base, one ownable signature green, jewel-toned categories used as **typographic accents and chip fills, never as card grounds** (except the signature hero treatment).

**Base layer — the bowl:**
- `--bg`: `oklch(0.14 0.005 95)` (#1a1816) — warm near-black, deliberately *not* `#0a0a0a` or sapphire. Tinted toward paper-ink rather than tech-black. This is the Hara move: warmth is everything.
- `--surface`: `oklch(0.18 0.006 95)` (#22201d) — one stop up, used for save cards and modal grounds.
- `--surface-2`: `oklch(0.22 0.007 95)` (#2a2724) — for hover states, sheet headers, depth cues.
- `--hairline`: `oklch(0.30 0.008 95) / 0.5` — borders only when structurally required. Default is *no border*.

**Signature brand color — the Finds Green:**
- `--brand`: `oklch(0.42 0.09 155)` (#3d5a40) — deep forest, slightly desaturated, library-leather warm. Used as a full-bleed background on the Tonight hero card, the empty-state hero, the wordmark plate, and the active state of the primary CTA. **Never as a 4px accent strip or hairline border. Always full bleed.** This is the Sagmeister discipline: one saturated voice, used with confidence.
- `--brand-ink`: `oklch(0.95 0.02 95)` (#f3eee7) — cream ink that sits on the brand green.

**Category accents** (used as small chip fills, category dots beside titles, and map pin colors — *never* as card grounds):

| Category | oklch | hex |
|---|---|---|
| recipe | `oklch(0.62 0.16 35)` | #c97a4b — terracotta |
| tv | `oklch(0.50 0.14 280)` | #6b5ba8 — dusk violet |
| movie | `oklch(0.45 0.12 25)` | #9a4234 — oxblood |
| restaurant | `oklch(0.66 0.14 70)` | #c9924a — amber |
| hotel | `oklch(0.55 0.08 200)` | #5b8b9a — slate teal |
| place | `oklch(0.60 0.10 145)` | #6a8f6b — moss |
| event | `oklch(0.65 0.16 350)` | #cc6a8c — rose |
| book | `oklch(0.50 0.10 80)` | #87703f — tobacco |
| podcast | `oklch(0.55 0.12 320)` | #a05fa0 — orchid |
| music | `oklch(0.60 0.13 220)` | #4f86c4 — ink blue |
| article | `oklch(0.70 0.04 95)` | #b3a99a — paper gray |
| product | `oklch(0.65 0.10 50)` | #c08864 — sand |
| workout | `oklch(0.62 0.16 130)` | #6fa44e — fern |
| noted | `oklch(0.55 0.02 95)` | #807a72 — graphite |

These are *jewel tones tuned warm*, not Material Design pop. They live next to the warm base without clashing.

**Text on dark:**
- Primary: `--brand-ink` at `1.0` opacity
- Secondary: `--brand-ink` at `0.72`
- Tertiary: `--brand-ink` at `0.50`
- Disabled: `--brand-ink` at `0.32`

**CTA white:** `oklch(0.97 0.012 95)` (#f5f1ea) — never pure white. Always paper-cream. Used on the primary pill button on top of `--brand` green (the Hara/Sagmeister handshake: monk-paper on forest moss).

---

## 3. Typography system

**Primary sans — Söhne** (commercial license when we ship paid; *Inter Tight* is the free dev placeholder, never Inter regular). Three weights only:
- `Söhne Buch` (400) — body
- `Söhne Halbfett` (500) — UI labels, chip text
- `Söhne Kräftig` (700) — H1, H2, hero headings

**Serif accent — Fraunces** (variable, optical-size 144). Used **deliberately for the one-word emphasis** in hero headings, the same way VIBEMOVE italicizes *what* and *train*. Rule: never more than one Fraunces italic word per surface. Never as body. Never as button text.

**Mono — JetBrains Mono** at weight 400, used only for metadata that benefits from monospace: capture timestamps in the detail sheet, source domain stamps, the wordmark animation cycling letters.

**Size scale (mobile-first, 4px grid):**

| Role | Size / Line / Tracking | Use |
|---|---|---|
| H1 | 34px / 1.05 / -0.02em | Tonight hero, page titles |
| H2 | 24px / 1.15 / -0.015em | Save detail title, section headers |
| H3 | 18px / 1.25 / -0.01em | Card title, modal headings |
| Body | 16px / 1.5 / 0 | Description, notes |
| Caption | 13px / 1.35 / 0.01em | Metadata, recommender attribution |
| Micro | 11px / 1.2 / 0.06em uppercase | Category chip, mono labels |

Fraunces italic accent words inherit their host size but with `font-variation-settings: "opsz" 144, "SOFT" 50` — soft optical size, never the harsh display cut.

---

## 4. Card and surface patterns

This is where the founder's "no cards" feedback resolves. "No cards" does not mean *flat*. The Hara reading: **cards should not announce themselves as cards.** No drop shadows. No borders by default. No rounded chrome competing with content. The save is the card.

**The save card — photo-led, edge-defined.**

When a save has an extracted hero image, the card *is* the image. Full-bleed photo at the top edge (16:10), `border-radius: 14px`, no border, no shadow. Below: 16px padding, title in H3, a 6px category dot + single-line metadata in caption gray, and a recommender pill (DD/KL initials, 22px circle on `--surface-2`). Cards sit on `--surface` — slightly raised from the bowl, like paper on a leather desk, never glowing tiles.

**No left-edge color accent strip.** The category color is a 6px dot beside the title. This is the explicit anti-slop call from huashu §6.2: "圆角卡片+左 border accent" is on the slop list.

**Saves with no image** get the bookplate treatment: full-bleed `--surface-2` plate, title in Söhne Kräftig 28px, one Fraunces italic accent word if the title carries emotional weight (the classifier flags this). Category dot top-right.

**Hero / Tonight card — the signature green moment.**

The Tonight surface gets *one* card per visit on `--brand` green full-bleed (16:11), with the recommended save as a smaller image plate centered inside. Above the plate, in cream: "Tonight, you *saved* a place." — *saved* in Fraunces italic. Below: title and a single cream CTA pill ("Open it"). **This is the screenshot moment.** It appears once per session. Scarcity is what makes the green feel earned.

**Empty states — typographic, never illustrated.**

- Feed: H2 "Nothing kept yet." + body "Forward a link to your capture address." No icon, no illustration.
- Map: a single tonal-gray topo line across the center at 12% opacity, with caption "Saves with a place show up here." The emptiness *is* the map.
- Library: the wordmark animation runs once (cycling Pixelify / VT323 / Silkscreen), then settles to Fraunces "Finds." Caption below.

**The build-preview card — the live AI moment.**

When a save is being enriched, the card develops like a Polaroid over 1.2-2.5s:

1. **Plate (0-300ms):** empty `--surface` plate appears, 1px hairline pulses once at 60% then settles to 30%. Source URL in mono caption.
2. **Image (300-1200ms):** hero image fades in, 8px blur → 0, Expo-out.
3. **Fields (1200ms+):** title types in at 28ms/char on sine ease (no caret blink), category dot blooms from gray to its jewel color in 240ms, structured fields cascade with 80ms stagger.

**No spinner ever appears.** If enrichment takes >4 seconds, the title placeholder shifts to "Still reading…" in italic, then resolves.

---

## 5. Photography and imagery

**Treat extracted hero images as primary content, not decoration.** The image is what the user came for. No filters, no color overlays, no duotone. Render at native colors. Portrait sources crop to 16:10 with smart focal-point, never letterbox. For Instagram-extracted images, strip the burned-in metadata bar server-side.

**When a save has no image** the bookplate treatment is the answer. Do NOT fall back to a Unsplash stock photo, a category emoji, or an SVG fork-knife-book. Those are AI slop. The bookplate is what the brand promises: a *kept thing*, treated like a card-catalog entry. This is downstream of Hara — emptiness is acceptable.

**Iconography:** line only, 1.5px stroke, rounded caps, never filled. Cream `--brand-ink` at 0.72 opacity. Built on `@radix-ui/icons` with custom category icons for the 14 enum values. **No icon ever appears next to a card title.** Icons live in the tab bar, FAB, and detail-sheet header. The save card uses the category dot, never an icon.

---

## 6. Motion language

**Three rules:**

1. **Ease-out only.** Default curve `cubic-bezier(0.16, 1, 0.3, 1)` (Expo out). No bounce, no spring, no overshoot. The library is calm.
2. **One animated thing at a time per surface.** When the build-preview card is materializing, nothing else moves. When the Tonight card swaps, the rest of the feed is frozen.
3. **Durations: 180 / 320 / 600 / 1200.** Four-tier scale. Hover transitions at 180ms. State changes at 320ms. Card materializations at 600ms. The full build-preview sequence at 1200ms. Anything longer than 1200ms must be a deliberate Polaroid-style narrative beat.

**The signature motion moment — the wordmark cycle.**

When the app cold-launches, the "Finds." wordmark renders in five rapid faces in sequence over 700ms: Pixelify Sans → VT323 → Silkscreen → Space Mono → Fraunces italic (final, settles). Total runtime under 1 second. This is the brand's signature — the same way Mymind has its color-shifting blob. It only plays on cold launch and on the splash screen for new captures' first-save moment. Hara meets Sagmeister: a single, considered, slightly playful chromatic-typographic gesture that earns its place because it is *rare*.

---

## 7. Signature visual moments

Three screens that should make a user want to screenshot.

**1. The Tonight hero card.**

A full-bleed forest-green plate (`--brand`) inside an otherwise dark, restrained app. The juxtaposition of warm-black bowl and saturated green field is the brand. Headline "Tonight, you *saved* a place." with *saved* in Fraunces italic. The recommended save sits inside the green as a smaller plate, like a postcard on leather.

Treatment: 16:11, 24px padding, inner save plate at 14px radius / 80% width, centered. Cream CTA pill (`oklch(0.97 0.012 95)`) on green, 44px height, 999px radius. Composition is asymmetric — headline left, CTA bottom-right of the plate. Sagmeister discipline, Hara restraint.

**2. The build-preview card during AI enrichment.**

The live moment when a forwarded link becomes a kept save. The user sees the AI *thinking* without a spinner. The card develops like a Polaroid: image first (blurred → sharp), title typing in, category dot blooming. This is what converts "the app is slow" into "the app is doing something for me."

Treatment: 600ms image fade with blur-to-sharp, 28ms-per-char title reveal on Expo-out, 240ms category dot color transition, 80ms field cascade. `--surface-2` ground, single hairline pulse at start. No skeleton shimmer, no progress bar, no percentage.

**3. The Library at scroll.**

The recommender attribution. Every save shows a 22px initials circle (DD or KL) in the top-right corner of the card. The household primitive made visual. "Both" saves get a double-pill (DD/KL) with circles staggered 8px overlap. This is the visible wedge against Mymind. The Hara reading: presence without performance.

Treatment: cream-on-`--surface-2` circles, Söhne 500 at 11px, centered. Long-press expands into a chip showing "Saved by Dylan, 3 days ago" then collapses. No follower counts, no avatars, no faces.

---

## 8. The brand voice in copy

**Three voice rules:**
1. Plain words. No "experiences" or "moments" — say "saves" and "things."
2. Plural-aware in any household-context string. "You and Keelin have 14 saves in Rome."
3. Quiet confidence. No "Welcome back!" energy. State the fact.

**Five microcopy examples:**

- Empty feed: *"Nothing kept yet. Forward a link to your capture address to begin."*
- Save confirmation: *"Saved. Open it."*
- Stripe error: *"Payment didn't go through. Try again or use a different card."*
- Trip mode header: *"You and Keelin saved 9 things in Lisbon."*
- Cellar visit prompt: *"Five saves from last spring. Revisit, archive, or release."*

No exclamation points. No em dashes. No emojis. The Hara voice is in every line: state the thing, trust the reader.

---

## 9. Anti-patterns

Five things this design must NEVER do.

1. **Never apply a colored 4px border accent to the left edge of a card.** This is the single most identifiable AI-slop pattern from 2020-2024 Material/Tailwind era. The category color lives in a 6px dot beside the title, full stop.
2. **Never use SF Pro, Inter, or system-default fonts as the primary face.** Söhne is the commitment. Inter Tight is the placeholder until license. Any session that drifts back to Inter is regressing.
3. **Never render a loading spinner.** Spinners signal "your app is slow." We use the build-preview Polaroid sequence or the Fraunces italic "Still reading…" placeholder. If you can't make it feel like development, redesign the surface.
4. **Never use gradient backgrounds.** Not purple, not green-to-teal, not subtle. The signature `--brand` green is flat, full-bleed, single value. Sagmeister's rule of one saturated voice depends on never diluting it with a gradient.
5. **Never put a category icon next to a card title.** Icons next to every title is iconography slop (huashu §6.2). The category dot is the only category signal at the card level. Icons live in chrome (tab bar, FAB), not in content.

---

## 10. One-sentence design philosophy

> **Finds is a warm dark bowl that holds your kept things; the app disappears, the saves breathe, and once per surface a single saturated green moment reminds you this is yours together.**

This is the Kenya Hara emptiness lineage with one Sagmeister chromatic puncture per surface. Whenever a design decision is unclear — a new component, a layout, a moment — return to this sentence and ask: *does this make the bowl quieter, or does it earn the green?* If neither, cut it.
