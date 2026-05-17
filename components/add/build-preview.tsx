'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import type { Database } from '@/lib/types/supabase'
import type { ExtractedData } from '@/lib/enrichment/enrich'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Capture build state — drives every visible part of /add.
 *
 * Parent (AddForm) consumes the /api/enrich-stream SSE feed and updates
 * this state; the components in this file render the live capture
 * surface (hero slot, title slot, EXTRACTED panel, ENRICHED chip).
 *
 * Per Stratum v2 handoff §4.2 — italic serif is reserved for the
 * resolved capture title only; every other surface is sans + mono.
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
  /** Mirrors SSE `phase` enum directly — used to derive the centered verb. */
  phase: string
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
  phase: 'idle',
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

// Poetic phase labels mapped from SSE phases. Lowercase, mono.
// Each ~same length so the centered status doesn't jump width.
const PHASE_LABELS: Record<string, string> = {
  idle: '—',
  starting: 'opening',
  detected: 'spotted',
  fetching: 'reading',
  og_parsed: 'parsing',
  og: 'parsing',
  place_looking_up: 'placing',
  place_found: 'placed',
  classifying: 'thinking',
  classified: 'placed',
  titled: 'titled',
  subtitled: 'sourced',
  noted: 'noted',
  extracting_section: 'gleaning',
  ingredient: 'gleaning',
  instruction: 'gleaning',
  exercise: 'gleaning',
  place_detail: 'gleaning',
  article_detail: 'gleaning',
  movie_detail: 'gleaning',
  product_detail: 'gleaning',
  media_detail: 'gleaning',
  recipe_meta: 'gleaning',
  workout_meta: 'gleaning',
  coords: 'gleaning',
  complete: 'kept',
  error: 'paused',
}

const STRAT_EASE = [0.2, 0.8, 0.2, 1] as const

/**
 * Hero image slot — 100% × 120, 4px radius.
 *
 * Empty state shimmers in the category tone (or dim until classified).
 * Filled fades in over 600ms. At phase=complete a tinted halo lands.
 */
export function HeroSlot({
  imageUrl,
  category,
  phase,
}: {
  imageUrl?: string | null
  category?: SaveCategory | null
  phase: string
}) {
  const tone = category ? CATEGORY_COLORS[category] : 'rgba(244,243,239,0.55)'
  const hasImage = Boolean(imageUrl)
  const complete = phase === 'complete'

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 120,
        borderRadius: 4,
        overflow: 'hidden',
        background: hasImage ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
        boxShadow: complete
          ? `inset 0 0 0 0.5px ${tone}, 0 8px 24px -8px ${tone}`
          : 'inset 0 0 0 0.5px rgba(255,255,255,0.07)',
        transition: 'box-shadow 0.5s var(--ease-strat, ease)',
      }}
    >
      {/* Shimmer — only while empty */}
      {!hasImage && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, ${tone} 50%, transparent 100%)`,
            opacity: 0.18,
            animation: 'capShimmer 1.8s ease-in-out infinite',
          }}
        />
      )}

      {/* The image */}
      <AnimatePresence>
        {imageUrl && (
          <motion.img
            key={imageUrl}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: STRAT_EASE }}
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </AnimatePresence>

      {/* Bottom darkening gradient */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* "extracted from page" caption — once image lands */}
      <AnimatePresence>
        {hasImage && (
          <motion.div
            key="caption"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: STRAT_EASE, delay: 0.15 }}
            style={{
              position: 'absolute',
              left: 10,
              bottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 8.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
              <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
              <circle cx="4" cy="5" r="0.9" fill="currentColor" />
              <path
                d="M2 8.5L4.5 6.5L7 8L10 5.5"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            extracted from page
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes capShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

/**
 * Title slot — centered mono verb while processing, italic serif title
 * once resolved. The verb pulse + the resolved title swap are the
 * signature animation moment of the product.
 */
export function TitleSlot({
  title,
  phase,
  category,
}: {
  title?: string | null
  phase: string
  category?: SaveCategory | null
}) {
  const tone = category ? CATEGORY_COLORS[category] : null
  const verbColor = tone ?? 'rgba(244,243,239,0.55)'
  const phaseLabel = PHASE_LABELS[phase] ?? phase
  const idle = phase === 'idle'

  return (
    <div
      style={{
        minHeight: 72,
        marginTop: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: title ? 'stretch' : 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence mode="wait">
        {title ? (
          <motion.h2
            key="title"
            initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: STRAT_EASE }}
            className="font-serif-display"
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.022em',
              color: 'var(--color-paper)',
              textWrap: 'balance',
            }}
          >
            {title}
          </motion.h2>
        ) : (
          <motion.div
            key={phaseLabel}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.36, ease: STRAT_EASE }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'lowercase',
              color: verbColor,
              transition: 'color 0.32s var(--ease-strat, ease)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'currentColor',
                boxShadow: idle ? 'none' : '0 0 10px currentColor',
                animation: idle ? 'none' : 'capPulse 0.9s infinite ease-in-out',
                opacity: idle ? 0.5 : 1,
              }}
            />
            {phaseLabel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tinted rule below resolved title */}
      <AnimatePresence>
        {title && tone && (
          <motion.div
            key="rule"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 24, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: STRAT_EASE, delay: 0.18 }}
            style={{
              marginTop: 7,
              height: 1,
              background: tone,
              boxShadow: `0 0 6px ${tone}`,
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes capPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}

/**
 * Field log row — mono label + mono value. Animates in on mount.
 */
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: STRAT_EASE }}
      style={{
        display: 'grid',
        gridTemplateColumns: '92px 1fr',
        padding: '8px 0',
        borderBottom: '1px solid var(--color-hairline)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 9,
          color: 'var(--color-mute)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          alignSelf: 'center',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          color: 'var(--color-paper)',
          alignSelf: 'center',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </motion.div>
  )
}

/**
 * Derive the mono field log from BuildState. Order matters — early
 * phases (DETECTED, FETCHING, METADATA, CLASSIFYING) appear first, then
 * extracted facts as they arrive.
 */
function deriveFields(state: BuildState): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []

  // ── Live phase rows (the build narrative) ──
  if (state.urlType) {
    const pretty =
      state.urlType === 'google_maps' ? 'google maps url'
      : state.urlType === 'instagram' ? 'instagram reel'
      : state.urlType === 'youtube' ? 'youtube video'
      : 'web page'
    rows.push({ label: 'detected', value: pretty })
  }

  if (state.siteName || state.imageUrl) {
    if (state.siteName) {
      rows.push({ label: 'fetching', value: state.siteName })
    } else if (state.imageUrl) {
      rows.push({ label: 'fetching', value: 'page loaded' })
    }
  }

  if (state.imageUrl) {
    rows.push({ label: 'metadata', value: 'open graph + caption' })
  }

  // ── Category row only while classifying (no title yet) ──
  if (state.status === 'classifying' && !state.title) {
    rows.push({ label: 'classifying', value: 'thinking…' })
  }

  // ── Extracted facts ──
  if (state.recipeMeta.totalTime) {
    rows.push({ label: 'cook', value: state.recipeMeta.totalTime })
  }
  if (state.recipeMeta.servings) {
    rows.push({ label: 'serves', value: String(state.recipeMeta.servings) })
  }
  if (state.ingredients.length > 0) {
    rows.push({
      label: 'ingredients',
      value: state.ingredients.length === 1 ? '1 item' : `${state.ingredients.length} items`,
    })
  }
  if (state.instructions.length > 0) {
    rows.push({
      label: 'steps',
      value: state.instructions.length === 1 ? '1 step' : `${state.instructions.length} steps`,
    })
  }

  // Workouts
  if (state.workoutMeta.duration) {
    rows.push({ label: 'duration', value: state.workoutMeta.duration })
  }
  if (state.workoutMeta.equipment?.length) {
    rows.push({ label: 'equipment', value: state.workoutMeta.equipment.join(', ') })
  }
  if (state.exercises.length > 0) {
    rows.push({
      label: 'exercises',
      value: state.exercises.length === 1 ? '1 move' : `${state.exercises.length} moves`,
    })
  }

  // Place
  if (state.placeDetail.address) rows.push({ label: 'address', value: state.placeDetail.address })
  if (state.placeDetail.hours) rows.push({ label: 'hours', value: state.placeDetail.hours })
  if (state.placeDetail.phone) rows.push({ label: 'phone', value: state.placeDetail.phone })
  if (state.placeDetail.priceLevel) rows.push({ label: 'price', value: state.placeDetail.priceLevel })

  // Article
  if (state.articleDetail.author) rows.push({ label: 'author', value: state.articleDetail.author })
  if (state.articleDetail.readTime) rows.push({ label: 'read', value: state.articleDetail.readTime })
  if (state.articleDetail.publishedAt)
    rows.push({ label: 'published', value: state.articleDetail.publishedAt })

  // Movie
  if (state.movieDetail.year) rows.push({ label: 'year', value: String(state.movieDetail.year) })
  if (state.movieDetail.runtime) rows.push({ label: 'runtime', value: state.movieDetail.runtime })
  if (state.movieDetail.director) rows.push({ label: 'director', value: state.movieDetail.director })

  // Product
  if (state.productDetail.brand) rows.push({ label: 'brand', value: state.productDetail.brand })
  if (state.productDetail.price) rows.push({ label: 'price', value: state.productDetail.price })

  // Media
  if (state.mediaDetail.showName) rows.push({ label: 'show', value: state.mediaDetail.showName })
  if (state.mediaDetail.episodeNumber)
    rows.push({ label: 'episode', value: String(state.mediaDetail.episodeNumber) })
  if (state.mediaDetail.artist) rows.push({ label: 'artist', value: state.mediaDetail.artist })

  // Coords
  if (state.coords) {
    rows.push({
      label: 'coords',
      value: `${state.coords.lat.toFixed(4)}, ${state.coords.lng.toFixed(4)}`,
    })
  }

  // Note (final beat)
  if (state.note) {
    rows.push({
      label: 'note',
      value: state.note.length > 64 ? state.note.slice(0, 60) + '…' : state.note,
    })
  }

  return rows
}

/**
 * EXTRACTED panel — section label + READY chip + grid of mono rows.
 * Empty state: blinking caret + "waiting for the page".
 */
export function FieldLog({ state }: { state: BuildState }) {
  const tone = state.category ? CATEGORY_COLORS[state.category] : null
  const rows = useMemo(() => deriveFields(state), [state])
  const complete = state.phase === 'complete'

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingBottom: 6,
          borderBottom: '1px solid var(--color-hairline)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 9,
            color: 'var(--color-mute)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Extracted
        </span>
        <AnimatePresence>
          {complete && tone && (
            <motion.span
              key="ready"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: STRAT_EASE }}
              style={{
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                fontSize: 9,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: tone,
              }}
            >
              Ready ✓
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div style={{ minHeight: 130 }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '14px 0',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 10.5,
              color: 'var(--color-mute)',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 4,
                height: 11,
                background: 'var(--color-mute)',
                animation: 'capCaret 1s steps(2) infinite',
                verticalAlign: 'middle',
                marginRight: 6,
              }}
            />
            waiting for the page
          </div>
        ) : (
          rows.map(row => <FieldRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />)
        )}
      </div>

      <style>{`
        @keyframes capCaret {
          0%   { opacity: 1; }
          50%  { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/**
 * Post-enrichment callout — only at phase=complete.
 * Tinted ✓ ENRICHED pill + plain-language "Ready to add… Tap Keep below."
 */
export function EnrichedCallout({
  category,
}: {
  category?: SaveCategory | null
}) {
  if (!category) return null
  const tone = CATEGORY_COLORS[category]
  const label = CATEGORY_LABELS[category]?.toLowerCase() ?? category

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: STRAT_EASE }}
      style={{
        marginTop: 14,
        borderTop: '1px solid var(--color-hairline)',
        paddingTop: 12,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: tone,
          padding: '4px 8px',
          background: `color-mix(in oklab, ${tone} 14%, transparent)`,
          border: `0.5px solid ${tone}`,
          borderRadius: 4,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
          <path
            d="M1.5 4.5L3.5 6.5L7.5 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Enriched
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--color-mute)',
        }}
      >
        Ready to add to your{' '}
        <span style={{ color: tone }}>{label}s</span>. Tap{' '}
        <span style={{ color: 'var(--color-paper)', fontWeight: 500 }}>Keep</span> below to save it.
      </div>
    </motion.div>
  )
}
