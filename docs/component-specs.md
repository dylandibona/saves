# Finds — UI Component Specs

Single dark mode. Household-shared library for couples. Premium positioning. References: VIBEMOVE (workout) for photo-led cards + bottom nav + FAB, DARES (creator) for vivid solid-color cards + bold sans-serif headers.

**Anti-slop principles applied** (quoted from `taste-skill/README.md` and `huashu-design/SKILL.md`):

1. *"All临场发明的色都会让品牌识别度下降"* (huashu §6.3) — every color below is named and reused. No on-the-fly hexes in components. Tokens or nothing.
2. *"一个细节做到 120%，其他做到 80%"* (huashu §6.3) — the hero card and the live-build preview get the signature treatment. Everything else stays disciplined and quiet.
3. *"圆角卡片 + 左彩色 border accent"* is flagged as AI slop (huashu §6.2 table). Finds uses **full-bleed photography or solid-color saturation** to mark hierarchy, never a left-border accent.
4. *"Inter/Roboto/Arial system fonts 作 display"* is slop (huashu §6.2). H1s use Fraunces italic display (already in brand). Body is Geist.
5. *"减法是 fallback，不是普适律"* — Finds is a household library, not a feed; we are explicitly on the **克制型 (restrained)** side of the density spectrum.

---

## Design tokens (Tailwind v4, in `app/globals.css` via `@theme`)

```css
@theme {
  --color-ink:        oklch(0.08 0.02 262);  /* near-black, the page */
  --color-ink-2:      oklch(0.13 0.025 262); /* surface raised 1 */
  --color-ink-3:      oklch(0.18 0.028 262); /* surface raised 2, inputs */
  --color-hairline:   oklch(0.26 0.025 262 / 0.6);
  --color-bone:       oklch(0.96 0.01 90);   /* white-pill CTA fill */
  --color-paper:      oklch(0.88 0.02 80);   /* body on dark, never pure white */
  --color-mute:       oklch(0.62 0.015 262); /* meta, timestamps */
  --color-moss:       oklch(0.42 0.09 152);  /* signature green, VIBEMOVE lineage */
  --color-ember:      oklch(0.68 0.18 38);   /* FAB / accent, restrained */
  --color-ruby:       oklch(0.58 0.18 22);
  --color-violet:     oklch(0.50 0.15 295);
  --color-amber:      oklch(0.78 0.14 78);
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-body:    "Geist", ui-sans-serif, system-ui;
  --font-mono:    "Space Mono", ui-monospace, monospace;
}
```

All radius tokens: `--radius-sm: 10px`, `--radius-md: 18px`, `--radius-lg: 24px`, `--radius-pill: 999px`.

---

## 1. Save card (feed item)

**Purpose.** Render one save in the library list — photo-led, scannable, tap to expand.

**Anatomy.** image (full-bleed top, 16:11 ratio) → 16px gutter → title (Fraunces 17px / 1.25) → meta row (category chip + recommender pill + timestamp) → bottom-left capture-count badge if `>= 2`.

**Visual spec.**
- Card: `bg-ink-2`, `rounded-[18px]`, no border, `overflow-hidden`, total padding only on the text region: `p-4` (16px). Image is full-bleed, no inset.
- Image: `aspect-[16/11]`, `object-cover`. Fallback when no image: solid-color block using one of moss/ruby/violet/amber chosen by `(save.id hash) % 4`. **No CSS gradient placeholders** (slop per huashu §6.2).
- Title: `font-display italic text-[17px] leading-[1.25] text-paper`, max 2 lines (`line-clamp-2`, `text-wrap: pretty`).
- Meta row: `mt-2 flex items-center gap-2 text-[12px] text-mute`.
- Capture-count badge: absolute over image, `top-3 left-3`, `px-2 py-1 rounded-pill bg-ink/70 backdrop-blur text-[11px] font-mono text-paper`. Only when `capture_count >= 2`.

**States.**
- Default: as above.
- Hover (desktop): `scale-[1.01]` and image `scale-[1.03]`, transition 280ms ease-out.
- Active (touch): `scale-[0.99]`, 80ms.
- Loading skeleton: same shape, image area `animate-pulse bg-ink-3`, title area two `h-3` lines.

**Behavior.** Click → `router.push('/saves/[id]')`. The image and title share `layoutId` with the detail page (Framer Motion shared-layout transition).

**Tailwind (default state):**
```tsx
<article className="group relative overflow-hidden rounded-[18px] bg-ink-2 transition-transform duration-300 ease-out hover:scale-[1.01]">
  <div className="aspect-[16/11] overflow-hidden">
    <img className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
  </div>
  <div className="p-4">
    <h3 className="font-display italic text-[17px] leading-[1.25] text-paper line-clamp-2 text-pretty">{title}</h3>
    <div className="mt-2 flex items-center gap-2 text-[12px] text-mute">{meta}</div>
  </div>
</article>
```

**Inspiration.** VIBEMOVE workout cards (photo-led, calm), Mymind tile grid (no chrome).

---

## 2. Hero / featured card

**Purpose.** "Today's pick" or first item in the feed — distinguishes the visit, not every card.

**Anatomy.** full-bleed solid-color or photo bed → eyebrow ("Today" or "Recently saved") → display headline (Fraunces italic, 2-line) → optional 1-line context → action row (white pill CTA + ghost link).

**Visual spec.**
- Container: `rounded-[24px]`, `aspect-[5/4]` on mobile, `aspect-[16/9]` md+, `p-6 md:p-8`, `flex flex-col justify-between`.
- Background: either category-keyed solid (moss/ruby/violet/amber at full saturation, DARES lineage) **or** photo with bottom 40% dark overlay (`bg-gradient-to-t from-ink/85 via-ink/30 to-transparent`). Pick one per card, not both.
- Eyebrow: `font-mono uppercase tracking-[0.18em] text-[11px] text-paper/70`.
- Headline: `font-display italic text-[32px] md:text-[44px] leading-[1.05] text-bone text-wrap: balance`.
- Primary CTA: white pill (see component 4). Ghost link sits 16px to its right.

**States.** Default / hover (lift 2px: `-translate-y-0.5 shadow-2xl shadow-black/40`) / pressed.

**Behavior.** Same nav as save card. Exactly one hero per feed session (rotated daily); never two in a row.

**Tailwind:**
```tsx
<section className="relative aspect-[5/4] md:aspect-[16/9] overflow-hidden rounded-[24px] bg-moss p-6 md:p-8 flex flex-col justify-between">
  <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-paper/70">Today</span>
  <div>
    <h2 className="font-display italic text-[32px] md:text-[44px] leading-[1.05] text-bone text-balance">{title}</h2>
    <div className="mt-5 flex items-center gap-4">{cta}</div>
  </div>
</section>
```

**Inspiration.** DARES creator cards (solid saturated color, big italic display).

---

## 3. Category chip

**Purpose.** Label what kind of thing a save is.

**Anatomy.** optional 8px typographic marker (◈◎◉○ from brand voice rules — NOT emoji, NOT icon-font) → label text.

**Visual spec.**
- Size: `h-6 px-2.5`, `rounded-pill`, `text-[11px] font-mono uppercase tracking-[0.12em]`.
- Fill: **subtle tint on dark**, never a saturated fill in the feed. `bg-ink-3 text-paper`. Saturated only on hero cards: `bg-paper/10 text-bone backdrop-blur`.
- Category-keyed dot (4px) on the left when on a photo card: `bg-{moss|ruby|violet|amber}`.

**States.** Default / hover (`bg-ink-3/80`) / selected as filter (`bg-paper text-ink`).

**Behavior.** Click on the feed → filters to that category. Click on a card → no-op (decorative).

**Tailwind:**
```tsx
<span className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-ink-3 px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper">
  <span className="size-1 rounded-full bg-moss" aria-hidden />
  Recipe
</span>
```

**Inspiration.** Restraint from `taste-skill` ("calm palette, premium fonts"). The category dot is the only chromatic moment — keeps chips quiet in a busy feed.

---

## 4. Primary CTA button

**Purpose.** The one thing on the screen we want pressed. "Save", "Open", "Add to Finds".

**Anatomy.** label only — no icon (per huashu "icon slop").

**Visual spec.**
- Default (on dark surfaces): white pill. `h-11 px-5 rounded-pill bg-bone text-ink`, `font-body font-medium text-[14px] tracking-[-0.005em]`.
- Press: `bg-paper` (slight warming), `scale-[0.97]`, 80ms.
- Hover: `shadow-[0_8px_24px_-12px_rgba(255,255,255,0.4)]`.
- Disabled: `bg-ink-3 text-mute cursor-not-allowed`.
- Loading: keep width stable, swap label for a 14px Framer Motion rotating arc; never replace with a generic spinner.

**Pick one direction.** Use the **white pill** (VIBEMOVE lineage). Skip the DARES gradient-outlined version — gradient outlines age into slop in 18 months and don't read at 320px.

**Behavior.** Click → action. Disabled blocks click. Loading prevents double-submit.

**Tailwind:**
```tsx
<button className="inline-flex h-11 items-center justify-center rounded-pill bg-bone px-5 text-[14px] font-medium text-ink transition-all duration-150 hover:shadow-[0_8px_24px_-12px_rgba(255,255,255,0.4)] active:scale-[0.97] disabled:bg-ink-3 disabled:text-mute disabled:cursor-not-allowed">
  Save
</button>
```

**Inspiration.** VIBEMOVE white pill (calm, confident, ages well).

---

## 5. Secondary CTA / link button

**Purpose.** The second action — "Cancel", "View source", "Skip".

**Anatomy.** label, optional 12px underline-on-hover.

**Visual spec.**
- `h-11 px-4 rounded-pill bg-transparent text-paper border border-hairline`, `text-[14px] font-medium`.
- Hover: `bg-ink-2 border-paper/30`.
- Text-link variant (inside paragraphs): `text-paper underline decoration-hairline underline-offset-4 hover:decoration-paper`.

**States.** Default / hover / disabled (text-mute, no border change).

**Behavior.** Same as primary, lower visual weight.

**Tailwind:**
```tsx
<button className="inline-flex h-11 items-center rounded-pill border border-hairline bg-transparent px-4 text-[14px] font-medium text-paper transition-colors hover:bg-ink-2 hover:border-paper/30">
  Cancel
</button>
```

**Inspiration.** Linear / Vercel hairline-border secondaries — but in our dark, oklch hairline so it doesn't muddy.

---

## 6. Input field (text)

**Purpose.** URL paste on `/add`, email on `/login`, search.

**Anatomy.** floating label (above, never inside) → input → optional trailing affordance (paste button on URL field; filter icon on search).

**Visual spec.**
- Container: `h-12 rounded-[14px] bg-ink-3`, no outer border (the surface IS the border).
- Inside: `px-4 text-[15px] font-body text-paper placeholder:text-mute`.
- Label above: `text-[11px] font-mono uppercase tracking-[0.12em] text-mute mb-2`.
- Focus: ring `ring-2 ring-paper/15` (NOT a blue browser ring), transition 120ms.
- Error: ring `ring-2 ring-ruby/60` and a `text-[12px] text-ruby` helper below.

**States.** Default / hover (`bg-ink-3/90`) / focus / error / disabled (50% opacity).

**Behavior.** Focus → ring. On the `/add` URL field, paste from clipboard auto-fires the live-build preview (component 9).

**Tailwind:**
```tsx
<label className="block">
  <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">URL</span>
  <input className="h-12 w-full rounded-[14px] bg-ink-3 px-4 text-[15px] text-paper placeholder:text-mute outline-none transition-shadow focus:ring-2 focus:ring-paper/15" />
</label>
```

**Inspiration.** Stripe Checkout dark, Cron app inputs.

---

## 7. Empty state

**Purpose.** A page with nothing yet should still feel composed — a kept place that's *waiting*, not broken.

**Anatomy.** typographic marker (◎) → headline (Fraunces italic, 1 line, 22px) → 1-line subhead in body voice → optional primary CTA.

**Visual spec.**
- Center-aligned, vertical rhythm: marker `mb-4`, headline `mb-2`, subhead `mb-6`, CTA below.
- Max-width `max-w-[360px]` so the lines break poetically.
- Background: just `bg-ink`, no illustration, no card. *Voice rule: "Restraint is the brand."*

**Behavior.** CTA where there's one obvious action (`/add` deep link). Otherwise omit — empty doesn't always need a button.

**Tailwind:**
```tsx
<div className="mx-auto flex max-w-[360px] flex-col items-center px-6 py-24 text-center">
  <span className="mb-4 text-[22px] text-mute" aria-hidden>◎</span>
  <h2 className="mb-2 font-display italic text-[22px] leading-[1.2] text-paper">Nothing yet.</h2>
  <p className="mb-6 text-[14px] text-mute">Send a link from anywhere to begin.</p>
</div>
```

**Inspiration.** Voice rules in STRATEGY.md. *Anti-slop: no "no-results SVG illustration"* (huashu §6.2 — SVG画imagery is slop).

---

## 8. Header / page title

**Purpose.** The H1 of each screen.

**Anatomy.** optional eyebrow (mono uppercase, e.g. "Library / Recipes") → H1 (Fraunces italic) → optional right-side trailing controls (filter, sort).

**Visual spec.**
- Eyebrow: `font-mono uppercase text-[11px] tracking-[0.18em] text-mute`.
- H1: `font-display italic text-[34px] md:text-[44px] leading-[1.05] text-bone text-balance`.
- Layout: `flex items-end justify-between gap-6 pt-10 pb-6`.
- The DARES "Sign In" lesson: **big, unapologetic display weight, lowercase ok, italic ok**. Don't shrink the title to be polite.

**Behavior.** Static.

**Tailwind:**
```tsx
<header className="flex items-end justify-between gap-6 pt-10 pb-6">
  <div>
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">Library</p>
    <h1 className="mt-1 font-display italic text-[34px] md:text-[44px] leading-[1.05] text-bone text-balance">Your finds</h1>
  </div>
  <div>{trailing}</div>
</header>
```

**Inspiration.** DARES "Sign In" header energy, Fraunces 144 optical size already in brand.

---

## 9. Live-build preview card

**Purpose.** The signature moment — AI extracting a save, fields appearing one by one. **This is the 120%-detail component.**

**Anatomy.** card shell appears first → image slot (skeleton then crossfade to extracted image) → title (typed character-by-character) → meta row (chips fade in left to right, 60ms stagger) → "Save it" CTA fades in last.

**Visual spec.**
- Same dimensions as save card (`rounded-[18px] bg-ink-2`, full-bleed image area).
- A 1px moving conic-gradient border while building: `before:absolute before:inset-0 before:rounded-[18px] before:p-px before:bg-[conic-gradient(from_var(--angle),transparent_70%,var(--color-paper)_85%,transparent_100%)]` with `--angle` animated 0→360° over 2.4s.
- Title types in: cursor `|` blinks at the tail.
- Each field arrival uses `framer-motion`: `initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}` with `transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}`.

**States.** building → ready (border stops, CTA enables) → saved (card flies up 8px, fades, then takes its place in the feed via `layoutId`).

**Behavior.** Triggered when user pastes URL on `/add`. Cannot be cancelled mid-build — that's the *promise* of the extraction.

**Tailwind sketch (Framer Motion required):**
```tsx
<motion.article layoutId={`save-${id}`} className="relative overflow-hidden rounded-[18px] bg-ink-2 isolate">
  <span className="pointer-events-none absolute inset-0 rounded-[18px] p-px [background:conic-gradient(from_var(--angle),transparent_70%,oklch(0.96_0.01_90)_85%,transparent)] [mask:linear-gradient(black,black)_content-box,linear-gradient(black,black)] [mask-composite:exclude]" style={{ "--angle": angle }} />
  {/* fields render here */}
</motion.article>
```

**Inspiration.** Linear's loading aesthetic, Vercel deploy stream, the *one* signature moment a Finds user describes when they recommend the app.

---

## 10. Nav

**Purpose.** Move between Library / Map / Cellar / Add.

**Recommendation: bottom tab bar + FAB.** The current top bar reads "web product"; bottom + FAB reads "kept thing on a phone" (VIBEMOVE lineage) and matches a couple using this in bed.

**Anatomy.** floating bottom bar (4 icons evenly spaced) + center-raised FAB ("+") for `/add`.

**Visual spec.**
- Bar: fixed bottom `bottom-4 inset-x-4`, `h-16 rounded-[24px] bg-ink-2/85 backdrop-blur-xl border border-hairline`, `flex justify-around items-center`.
- Icons: 22px stroke (Lucide), `text-mute` default, `text-bone` active. Active tab also gets a 3px wide × 2px tall `bg-bone` bar 6px below the icon — typographic marker, not pill background.
- FAB: 56px circle, raised `-translate-y-3` so it overlaps the bar. `bg-ember text-ink`, `shadow-[0_12px_32px_-8px_rgba(232,124,58,0.45)]`. Plus-sign hand-drawn as two divs (not an icon font) — crisper at all DPRs.

**States.** Tap → spring scale 0.94 → 1. FAB long-press → quick-action sheet (paste URL / scan / from photos) — Sprint 2+.

**Behavior.** Active state from `usePathname()` in a `'use client'` component. Use Suspense per `nextjs` skill (search-param hooks need it).

**Tailwind:**
```tsx
<nav className="fixed inset-x-4 bottom-4 z-40 flex h-16 items-center justify-around rounded-[24px] border border-hairline bg-ink-2/85 backdrop-blur-xl">
  {/* 2 tabs · FAB · 2 tabs */}
</nav>
```

**Inspiration.** VIBEMOVE bottom bar + orange FAB, exactly.

---

## 11. Identity pills (DD / KL)

**Purpose.** Show who saved/captured an item.

**Anatomy.** circle with 2-letter initials, stacked when multiple.

**Visual spec.**
- Size: 22px (in cards), 28px (in detail). Border: `ring-2 ring-ink-2` (matches the card it sits on, so it cuts a clean negative space).
- Fill: a stable hash-to-color from {moss, ruby, violet, amber, ember} keyed by user id — *never* random per render.
- Initials: `font-mono text-[10px] uppercase font-medium text-ink` (dark text on saturated bg has highest premium feel; brand sapphire base reinforces).
- Stack: `flex -space-x-1.5`. Max 2 visible; third+ becomes `+N` pill same dimensions, `bg-ink-3 text-paper`.

**States.** Static, no hover unless inside a clickable parent.

**Behavior.** Click on the stack (in detail view) → reveals capture list ordered by `captured_at`.

**Tailwind:**
```tsx
<div className="flex -space-x-1.5">
  <span className="grid size-[22px] place-items-center rounded-full bg-moss ring-2 ring-ink-2 font-mono text-[10px] uppercase text-ink">DD</span>
  <span className="grid size-[22px] place-items-center rounded-full bg-ember ring-2 ring-ink-2 font-mono text-[10px] uppercase text-ink">KL</span>
</div>
```

**Inspiration.** Linear avatars; the dark-text-on-color is huashu's "120% detail" — most apps default to white text on color, which is the AI mean.

---

## 12. Settings list row

**Purpose.** One configurable item in `/settings`, `/billing`, household member list.

**Anatomy.** left: 22px optional typographic marker → label + sub-label (2 lines) — right: control (toggle / chevron / value text).

**Visual spec.**
- Row: `h-[64px] px-5 flex items-center justify-between`. Rows separated by `divide-y divide-hairline` on the parent `<ul>`.
- Label: `text-[15px] text-paper`.
- Sub-label: `text-[12px] text-mute mt-0.5`.
- Right value: `text-[14px] text-mute`. Chevron: 16px lucide-react `ChevronRight`, `text-mute`.
- Toggle: 44×26 pill, `bg-ink-3` off, `bg-moss` on. 22px thumb `bg-bone`.

**States.** Default / hover (`bg-ink-2`) / pressed (`bg-ink-3`). Destructive rows (Delete account): label `text-ruby`, no special background.

**Behavior.** Whole row is the hit target. Toggle rows commit immediately (no Save button) and show a tiny "Saved" `text-[11px] text-moss` toast 220ms after commit.

**Tailwind:**
```tsx
<li className="flex h-[64px] items-center justify-between px-5 transition-colors hover:bg-ink-2">
  <div>
    <p className="text-[15px] text-paper">Capture email</p>
    <p className="mt-0.5 text-[12px] text-mute">dylan-9a4f@in.saves.app</p>
  </div>
  <ChevronRight className="size-4 text-mute" />
</li>
```

**Inspiration.** iOS Settings discipline, Things 3 row rhythm.

---

## Layout system

**Container max-widths.**
- Mobile (default): `px-5` (20px) gutters, full-bleed.
- `sm` (≥640): `max-w-[640px] mx-auto px-6`.
- `md` (≥768): `max-w-[760px] mx-auto px-8`.
- `lg` (≥1024): `max-w-[960px] mx-auto px-8`. Library feed switches to a 2-column masonry here. We do **not** widen past 960 — restraint, plus "kept notebook" is a focused reading width.

**Page padding.** Top `pt-10` for screens with an H1, `pt-6` for sub-screens. Bottom: always `pb-28` to clear the floating nav (component 10).

**Section spacing.** `space-y-10` between major sections. `space-y-6` between subsections inside one.

**Card spacing.** Feed gap: `gap-3` mobile, `gap-4` md+. Never `gap-2` (looks crammed) or `gap-6` (looks unconfident).

---

## Motion specs

All easings reference Framer Motion. Pick `cubic-bezier(0.22, 1, 0.36, 1)` — the "ease-out-expo-ish" curve, signature smooth without bounce.

- **Hover transition:** 280ms with `[0.22, 1, 0.36, 1]`. Color-only hovers: 150ms.
- **Page transition:** `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}` 420ms exit 200ms. Use Next.js App Router `<motion.main>` in the layout.
- **Card entry stagger:** 60ms per child, max 8 staggered (cap so opening the library doesn't take 1.2s). After 8, fade the rest as a block.
- **Modal open/close:** open 320ms scale 0.96→1 + opacity 0→1; close 220ms reverse. Backdrop blur fades 180ms.
- **Live-build preview:** field arrival 450ms, character typing 24ms/char (cap line at 800ms total — speed up if title is long).

---

## Six implementation tips (AI-implementer gotchas)

1. **Tailwind v4 `@theme` is consumed at build — don't use `theme()` calls in arbitrary values.** Use direct CSS variables (`bg-[var(--color-moss)]`) or the named utility (`bg-moss`). The intermediate `theme(colors.moss)` syntax that worked in v3 is removed.

2. **`'use client'` only where it's earned.** Every component above except the live-build preview, the bottom nav (uses `usePathname`), and any input/toggle is a Server Component. Don't paste `'use client'` at the top of the save card — kills RSC streaming and bloats the bundle.

3. **`usePathname()` and `useSearchParams()` need a Suspense boundary at the route level** (per `vercel-plugin:nextjs` skill). The nav has a CSR bailout otherwise. Wrap `<Nav />` in `<Suspense fallback={<NavSkeleton />}>` inside `layout.tsx`.

4. **Framer Motion `layoutId` shared transitions** need both elements mounted in the same React tree at the moment of navigation. Use Next.js `<Link>` with `prefetch` and put the `LayoutGroup` inside the app layout, not inside individual pages — otherwise the card-to-detail morph silently fails.

5. **OKLCH colors in Tailwind v4 require `color-mix()` for opacity in some toolchains.** If `bg-moss/40` produces no output, fall back to `bg-[color-mix(in_oklch,var(--color-moss)_40%,transparent)]`. Test in build, not just dev — Turbopack can be more lenient than the production compiler.

6. **Don't apply `backdrop-blur` to elements that contain text without also setting `transform: translateZ(0)` or `will-change: transform`.** On iOS Safari (which is what the founder will demo this on), backdrop-blur over scrolling content causes a 1-frame text shimmer. The bottom nav already needs this — add `transform-gpu` to the nav root.

---

**Closing note.** The two reference apps share a common DNA: *one* loud chromatic moment per screen (the green hero in VIBEMOVE, the orange product card in DARES) surrounded by quiet structure. Apply that ratio here. The hero card, the FAB, and the live-build preview do the talking. Save cards, chips, inputs, and rows stay quiet. That's the difference between "black and white, no cards" and "a kept place that feels expensive."
