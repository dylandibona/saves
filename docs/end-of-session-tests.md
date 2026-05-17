# End-of-session test routine

Run through this on your phone (or desktop with mobile viewport) after the
next Vercel deploy. Each test is a quick confirmation that a feature actually
works against production data and rendering — not just "the build passed."

If anything fails, screenshot it and tell me which test number broke.

---

## Stratum v2 visual rubric (drop 1 + drop 2)

Compare each route against the matching target screenshot.

| Route | Target | What to confirm |
|---|---|---|
| `/` (Library, default) | `docs/stratum-v2-target/v2-changelog/library.png` | Single-row header: `[sigil] Finds` left, `{N} kept.` italic-serif right. `kept` in italic serif. Period dim. No `YOUR LIBRARY` mono label. |
| `/` (filtered to recipe) | `docs/stratum-v2-target/v2-changelog/library-recipe.png` | Tap "recipe" in the category strip. Title becomes `{N} recipes.` — number in recipe tone, "recipes" italic serif. |
| `/saves/[id]` | `docs/stratum-v2-target/detail.png` | Full-bleed 184px hero, italic-serif 36px title, glass back-chip top-left, KEPT N AGO chip bottom-right in category tone. |
| `/saves/[id]` Options popup | `docs/stratum-v2-target/detail-options.png` | Tap Options → popup: Share / Add to list / Copy / Edit / **Refresh from source** / Delete. |
| `/add` (post-enrichment) | `docs/stratum-v2-target/capture.png` | Italic-serif title resolved, EXTRACTED log + READY chip, ENRICHED confirmation, cream Keep button with category-tinted top edge + halo. |
| `/settings` | `docs/stratum-v2-target/v2-changelog/settings.png` | Single-row header: `[sigil] Finds` left, `Your settings.` italic-serif right. **SUBSCRIPTION is the first section** with plan card + UPGRADE pill + See plans / Billing history. |
| `/map` (default) | `docs/stratum-v2-target/v2-changelog/map.png` | Glass header with `[sigil] Finds` + `map` italic. Category strip below. **No card visible at the bottom**. |
| `/map` (pin tapped) | `docs/stratum-v2-target/v2-changelog/map-tapped.png` | Tap a pin → card slides up with thumbnail + meta + chevron expand chip. Chevron navigates to the Detail page. |
| `/billing` | (no target — in-spirit) | Single-row header: `Your plan.` italic-serif right. Trial countdown banner if you're trialing. |
| `/login` | `docs/stratum-v2-target/built/built-login.png` | Sigil + Finds, Continue with Google, email + beta code fields. |

---

## Functional verification (re-enrich + image persistence + invite system)

### Test 1 — fix an existing broken save (re-enrich)
1. Open `https://finds.dylandibona.com` on your phone
2. Tap a save whose title shows artifacts like `&rsquo;`, `&mdash;`, `&#8217;`, etc.
3. Tap **Options → Refresh from source**
4. Confirmation modal appears: "Replace this find with fresh data?"
5. Tap **Replace** → wait ~3–5s
6. Page re-renders. Title now uses real characters (`'`, `—`, `…`). Hero image is persisted to our Storage (right-click → URL starts with `…/storage/v1/object/public/hero-images/`).
7. Browser back → Library should now show the cleaned title in the card.

**Pass criteria:** title no longer contains `&[a-z]+;` patterns; the image stays loaded even if you reload the page in a few hours.

### Test 2 — new saves get persistent images
1. Tap the dock `+ Keep` → paste a fresh Instagram reel or recipe URL
2. Watch the capture animation finish; tap Keep
3. Navigate to the new save's detail page
4. Confirm the hero image is from `lqmjglpzrfcpnpshbjwo.supabase.co/storage/v1/object/public/hero-images/`
5. Reload the page — image stays
6. Wait 24h, reload again — image stays even if the source CDN has rotated its URL

**Pass criteria:** all newly captured saves use Supabase Storage URLs for their hero image.

### Test 3 — Storage dashboard confirmation
1. Open https://supabase.com/dashboard/project/lqmjglpzrfcpnpshbjwo/storage/buckets/hero-images
2. You should see one `{save-id}.webp` object per save created since the persistence shipped
3. Click any object → preview shows the resized webp (~800px wide, ~150KB)

**Pass criteria:** the bucket fills up as you save new things.

### Test 4 — invite a household member (Keelin)
1. `/settings` → Invites section → **Share your household → NEW LINK**
2. Copy the URL — looks like `https://finds.dylandibona.com/join/ABCDEFGHJK`
3. Open the URL on a different device or in a private window
4. Should show "Dylan is sharing their library with you" + Sign in to accept
5. Sign in with a different Google account → lands inside the Family household
6. New user's saves now appear alongside Dylan's in the Library

**Pass criteria:** Keelin signs up via the link and sees the shared library; her DD/KL pill appears on saves she captures.

### Test 5 — invite a stranger (app code)
1. `/settings` → Invites section → **Invite a friend → NEW CODE**
2. Code looks like `ABCDEFGHJK`
3. Send to a friend
4. Friend goes to `https://finds.dylandibona.com/login` → pastes code → signs in with Google
5. They land in their OWN household (not yours), `subscription_status='trialing'`, 90-day comp Personal
6. Their account shows up in your `/settings → Testers` section with `90 days left` urgency badge

**Pass criteria:** friend signs up, has their own library, you see them in the Testers list.

---

## Build / deploy hygiene

After any deploy:

- `npx tsc --noEmit` from the repo — exit 0
- `npm run build` — completes with no errors
- New routes appear in Vercel's deployment with sensible bundle sizes (`/saves/[id]` ~5KB, `/settings` ~4KB, `/map` ~36KB due to Google Maps)
- No 500s on auth-gated routes after sign-in
- Sentry / Vercel runtime logs show no "Internal Server Error" in the last hour

---

## Things known unfinished / out of scope

These intentionally do not yet work; don't test them as pass/fail:

- **Edit on Detail Options popup** — disabled, Edit flow is a future sprint
- **Add to grocery list on Detail Options** — disabled, future feature
- **`BILLING_ENFORCED=true`** — env var stays `false` until you flip it. While off, free-tier doesn't bite even if you exceed 12 saves.
- **Apify Instagram captions/comments** — still using OG-only on IG. The "kettlebell workout in the comments" use case continues to under-extract until we subscribe.
- **Twitter/X enrichment** — skipped; share text usually empty.
- **PWA Share Target** — code in place but not validated on a real iOS share sheet.

If any of these come up in real use and you'd like them prioritized, tell me.
