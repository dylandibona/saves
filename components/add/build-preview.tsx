'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import type { Database } from '@/lib/types/supabase'
import type { ExtractedData } from '@/lib/enrichment/enrich'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Live "build" preview that materializes alongside enrichment streaming.
 *
 * Driven by BuildState which the parent (AddForm) updates as SSE events
 * arrive from /api/enrich-stream. Each visual element transitions in
 * the moment its corresponding field becomes available.
 *
 * This is the signature moment of the product — the user pastes a URL
 * and watches the save card *build itself*. Pacing and polish here matter
 * more than almost anywhere else in the app.
 */

export type BuildStatus =
  | 'idle'
  | 'starting'
  | 'fetching'
  | 'classifying'
  | 'building'
  | 'complete'
  | 'error'

export type BuildState = {
  status: BuildStatus
  urlType?: 'google_maps' | 'instagram' | 'youtube' | 'generic'
  siteName?: string | null
  imageUrl?: string | null
  category?: SaveCategory | null
  confidence?: 'high' | 'medium' | 'low'
  title?: string | null
  subtitle?: string | null
  note?: string | null
  ingredients: string[]
  instructions: string[]
  exercises: NonNullable<ExtractedData['exercises']>
  recipeMeta: { totalTime?: string; servings?: string | number }
  workoutMeta: { duration?: string; equipment?: string[] }
  placeDetail: NonNullable<Pick<ExtractedData, 'address' | 'hours' | 'phone' | 'website' | 'priceLevel'>>
  articleDetail: NonNullable<Pick<ExtractedData, 'author' | 'summary' | 'readTime' | 'publishedAt'>>
  movieDetail: NonNullable<Pick<ExtractedData, 'year' | 'director' | 'runtime'>>
  productDetail: NonNullable<Pick<ExtractedData, 'brand' | 'price'>>
  mediaDetail: NonNullable<Pick<ExtractedData, 'episodeNumber' | 'showName' | 'artist'>>
  coords?: { lat: number; lng: number }
  errorMessage?: string
}

export const EMPTY_BUILD_STATE: BuildState = {
  status: 'idle',
  ingredients: [],
  instructions: [],
  exercises: [],
  recipeMeta: {},
  workoutMeta: {},
  placeDetail: {},
  articleDetail: {},
  movieDetail: {},
  productDetail: {},
  mediaDetail: {},
}

// ── Motion presets ────────────────────────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: 'easeOut' as const },
}

const listItem = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
}

const chipBloom = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
}

// ─── Component ────────────────────────────────────────────────────────

export function BuildPreview({ state }: { state: BuildState }) {
  // Render nothing in idle state; AddForm decides when to mount the card
  if (state.status === 'idle') return null

  if (state.status === 'error') {
    return (
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          background: 'rgba(244,63,94,0.06)',
          border: '1px solid rgba(244,63,94,0.20)',
        }}
      >
        <p className="font-mono text-[11px] text-rose-300/85">Couldn&rsquo;t build a preview.</p>
        <p className="text-[13px] text-white/55 mt-1 leading-relaxed">
          {state.errorMessage ?? 'Try again, or fill in the fields below by hand.'}
        </p>
      </div>
    )
  }

  const color = state.category ? CATEGORY_COLORS[state.category] ?? '#888' : '#666'
  const categoryLabel = state.category ? CATEGORY_LABELS[state.category] : null

  // Featured active-verb moment. The build is doing real work — naming it
  // out loud makes the magic legible. Lives in the title slot until the
  // real title arrives, then fades out and gets replaced.
  const verb: string | null =
    state.title
      ? null
      : state.status === 'fetching'    ? 'Reading'
      : state.status === 'classifying' ? 'Distilling'
      : state.status === 'starting'    ? 'Receiving'
      : null

  return (
    <motion.div
      layout
      transition={{ duration: 0.28, ease: 'easeOut' as const }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Hero image — fades in once OG data arrives */}
      <AnimatePresence>
        {state.imageUrl && (
          <motion.div
            key={state.imageUrl}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.48, ease: 'easeOut' as const }}
            className="relative aspect-[16/9] overflow-hidden bg-white/[0.03]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.imageUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.10_0.08_262)]/40 to-transparent" />
            {/* Category color tint at bottom */}
            {state.category && (
              <motion.div
                {...fadeIn}
                className="absolute inset-x-0 bottom-0 h-20"
                style={{ background: `linear-gradient(to top, ${color}26, transparent)` }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-3">
        {/* Header row — category chip only (verb moved to title slot) */}
        <div className="flex items-center gap-2 min-h-[20px]">
          <AnimatePresence mode="wait">
            {state.category && categoryLabel && (
              <motion.span
                key={state.category}
                {...chipBloom}
                className="font-mono text-[10px] tracking-wider px-2.5 py-0.5 rounded-full"
                style={{
                  background: `linear-gradient(180deg, ${color}f0 0%, ${color}cc 100%)`,
                  border: `1px solid ${color}`,
                  color: 'oklch(0.10 0.09 262)',
                  boxShadow: `0 2px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.36)`,
                }}
              >
                {categoryLabel}
              </motion.span>
            )}
          </AnimatePresence>

          {state.confidence === 'low' && state.category && (
            <motion.span
              {...fadeIn}
              className="font-mono text-[9px] tracking-wider text-white/30"
            >
              not 100% sure
            </motion.span>
          )}

          {state.siteName && (
            <motion.span
              {...fadeIn}
              className="font-mono text-[10px] text-white/30 ml-auto"
            >
              {state.siteName}
            </motion.span>
          )}
        </div>

        {/* Active verb — featured "live work" moment in the title slot */}
        <AnimatePresence mode="wait">
          {verb && (
            <ActiveVerb key={verb} verb={verb} />
          )}
        </AnimatePresence>

        {/* Title */}
        <AnimatePresence>
          {state.title && (
            <motion.h3
              key={state.title}
              {...fadeIn}
              className="font-serif text-lg text-white/92 leading-snug"
            >
              {state.title}
            </motion.h3>
          )}
        </AnimatePresence>

        {/* Subtitle */}
        <AnimatePresence>
          {state.subtitle && (
            <motion.p
              key={state.subtitle}
              {...fadeIn}
              className="text-[13px] text-white/55 leading-relaxed line-clamp-3"
            >
              {state.subtitle}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Note suggestion */}
        <AnimatePresence>
          {state.note && (
            <motion.p
              {...fadeIn}
              className="font-mono text-[10px] text-white/30 italic leading-relaxed"
            >
              {state.note}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Recipe meta + ingredients + instructions */}
        {(state.recipeMeta.totalTime || state.recipeMeta.servings) && (
          <MetaRow
            items={[
              state.recipeMeta.totalTime ? { label: 'Time', value: state.recipeMeta.totalTime } : null,
              state.recipeMeta.servings ? { label: 'Serves', value: String(state.recipeMeta.servings) } : null,
            ].filter((x): x is { label: string; value: string } => x !== null)}
          />
        )}

        {state.ingredients.length > 0 && (
          <Section label="Ingredients">
            <ul className="space-y-1">
              {state.ingredients.map((ing, i) => (
                <motion.li
                  key={i}
                  {...listItem}
                  className="text-[13px] text-white/75 leading-relaxed pl-3 relative before:absolute before:left-0 before:top-[8px] before:w-1 before:h-1 before:rounded-full before:bg-white/30"
                >
                  {ing}
                </motion.li>
              ))}
            </ul>
          </Section>
        )}

        {state.instructions.length > 0 && (
          <Section label="Instructions">
            <ol className="space-y-2">
              {state.instructions.map((step, i) => (
                <motion.li key={i} {...listItem} className="flex gap-2.5 text-[13px] text-white/75 leading-relaxed">
                  <span className="font-mono text-[10px] text-white/40 tabular-nums shrink-0 w-4 text-right">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </motion.li>
              ))}
            </ol>
          </Section>
        )}

        {/* Workout meta + exercises */}
        {(state.workoutMeta.duration || state.workoutMeta.equipment?.length) && (
          <MetaRow
            items={[
              state.workoutMeta.duration ? { label: 'Duration', value: state.workoutMeta.duration } : null,
              state.workoutMeta.equipment?.length
                ? { label: 'Equipment', value: state.workoutMeta.equipment.join(', ') }
                : null,
            ].filter((x): x is { label: string; value: string } => x !== null)}
          />
        )}

        {state.exercises.length > 0 && (
          <Section label="Exercises">
            <ul className="space-y-1.5">
              {state.exercises.map((ex, i) => (
                <motion.li
                  key={i}
                  {...listItem}
                  className="rounded-lg px-3 py-2 text-[13px] flex items-baseline justify-between gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span className="text-white/82 font-serif">{ex.name}</span>
                  <span className="font-mono text-[10px] text-white/45 tabular-nums">
                    {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(' · ')}
                  </span>
                </motion.li>
              ))}
            </ul>
          </Section>
        )}

        {/* Place / restaurant / hotel detail */}
        {(state.placeDetail.address ||
          state.placeDetail.hours ||
          state.placeDetail.phone ||
          state.placeDetail.website ||
          state.placeDetail.priceLevel) && (
          <motion.div {...fadeIn} className="space-y-2">
            {state.placeDetail.address && (
              <p className="text-[13px] text-white/70 leading-relaxed">{state.placeDetail.address}</p>
            )}
            <MetaRow
              items={[
                state.placeDetail.hours ? { label: 'Hours', value: state.placeDetail.hours } : null,
                state.placeDetail.phone ? { label: 'Phone', value: state.placeDetail.phone } : null,
                state.placeDetail.priceLevel ? { label: 'Price', value: state.placeDetail.priceLevel } : null,
              ].filter((x): x is { label: string; value: string } => x !== null)}
            />
            {state.placeDetail.website && (
              <a
                href={state.placeDetail.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-[11px] text-white/45 hover:text-white/75 underline underline-offset-4 decoration-white/20 break-all"
              >
                {state.placeDetail.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </motion.div>
        )}

        {/* Article / book */}
        {(state.articleDetail.author ||
          state.articleDetail.summary ||
          state.articleDetail.readTime ||
          state.articleDetail.publishedAt) && (
          <motion.div {...fadeIn} className="space-y-2">
            <MetaRow
              items={[
                state.articleDetail.author ? { label: 'Author', value: state.articleDetail.author } : null,
                state.articleDetail.readTime ? { label: 'Read', value: state.articleDetail.readTime } : null,
                state.articleDetail.publishedAt ? { label: 'Published', value: state.articleDetail.publishedAt } : null,
              ].filter((x): x is { label: string; value: string } => x !== null)}
            />
            {state.articleDetail.summary && (
              <p className="text-[13px] text-white/70 font-serif leading-relaxed">
                {state.articleDetail.summary}
              </p>
            )}
          </motion.div>
        )}

        {/* Movie / TV */}
        {(state.movieDetail.year || state.movieDetail.director || state.movieDetail.runtime) && (
          <MetaRow
            items={[
              state.movieDetail.year ? { label: 'Year', value: String(state.movieDetail.year) } : null,
              state.movieDetail.runtime ? { label: 'Runtime', value: state.movieDetail.runtime } : null,
              state.movieDetail.director ? { label: 'Director', value: state.movieDetail.director } : null,
            ].filter((x): x is { label: string; value: string } => x !== null)}
          />
        )}

        {/* Product */}
        {(state.productDetail.brand || state.productDetail.price) && (
          <MetaRow
            items={[
              state.productDetail.brand ? { label: 'Brand', value: state.productDetail.brand } : null,
              state.productDetail.price ? { label: 'Price', value: state.productDetail.price } : null,
            ].filter((x): x is { label: string; value: string } => x !== null)}
          />
        )}

        {/* Podcast / music */}
        {(state.mediaDetail.episodeNumber || state.mediaDetail.showName || state.mediaDetail.artist) && (
          <MetaRow
            items={[
              state.mediaDetail.showName ? { label: 'Show', value: state.mediaDetail.showName } : null,
              state.mediaDetail.episodeNumber
                ? { label: 'Episode', value: String(state.mediaDetail.episodeNumber) }
                : null,
              state.mediaDetail.artist ? { label: 'Artist', value: state.mediaDetail.artist } : null,
            ].filter((x): x is { label: string; value: string } => x !== null)}
          />
        )}

        {/* Coordinates */}
        {state.coords && (
          <motion.p
            {...fadeIn}
            className="font-mono text-[10px] text-white/22 tracking-wider tabular-nums"
          >
            {state.coords.lat.toFixed(5)}, {state.coords.lng.toFixed(5)}
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div {...fadeIn} className="space-y-1.5 pt-1">
      <p className="font-mono text-[9px] tracking-widest text-white/30 uppercase">{label}</p>
      {children}
    </motion.div>
  )
}

function MetaRow({ items }: { items: Array<{ label: string; value: string }> }) {
  if (items.length === 0) return null
  return (
    <motion.dl {...fadeIn} className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="font-mono text-[9px] tracking-widest text-white/30 uppercase">{label}</dt>
          <dd className="font-mono text-[11px] text-white/65 tabular-nums">{value}</dd>
        </div>
      ))}
    </motion.dl>
  )
}

/**
 * The active-verb moment — the visible expression of "Finds is doing
 * real work right now." Inspired by Claude's animated verbs ("Thinking",
 * "Pondering", "Searching"): the work has a name and a voice while it's
 * happening, not a hidden spinner.
 *
 * Renders as a serif italic display word in the title slot, with three
 * dots pulsing in sequence beside it. Swaps cleanly via AnimatePresence
 * when the verb changes (Reading → Distilling → Locating → real title).
 */
function ActiveVerb({ verb }: { verb: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.36, ease: 'easeOut' as const }}
      className="flex items-baseline gap-2.5"
    >
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontVariationSettings: "'opsz' 144, 'wght' 400, 'SOFT' 50",
          fontSize: '26px',
          letterSpacing: '-0.02em',
          color: 'var(--color-paper)',
          lineHeight: 1,
        }}
      >
        {verb}
      </span>
      <TypingDots />
    </motion.div>
  )
}

function TypingDots() {
  return (
    <span
      aria-hidden
      className="inline-flex gap-[3px] items-baseline"
      style={{ marginBottom: '6px' }}
    >
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: '5px',
            height: '5px',
            background: 'var(--color-paper)',
          }}
          animate={{ opacity: [0.18, 0.85, 0.18] }}
          transition={{
            duration: 1.15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.18,
          }}
        />
      ))}
    </span>
  )
}
