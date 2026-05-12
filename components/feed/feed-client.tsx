'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SaveCard } from './save-card'
import { CATEGORY_LABELS } from '@/lib/utils/time'
import type { SaveWithRecommenders } from '@/lib/data/saves'
import type { Database } from '@/lib/types/supabase'

type Cat = Database['public']['Enums']['save_category']
const ALL_CATS = Object.keys(CATEGORY_LABELS) as Cat[]

/**
 * Feed — Library surface.
 *
 * The masthead wordmark in BottomNav already carries the brand. So the
 * page hero doesn't need to repeat "Finds." — it just needs to count
 * what's here. The chromatic puncture moves onto the numeral: an
 * oversized Fraunces-italic count in brand green, with "finds." in
 * cream beside it. One charged element, lots of breathing room around
 * it — Hara emptiness, Sagmeister color discipline, no redundant logo.
 */

const EASE = { duration: 0.18, ease: 'easeInOut' } as const

/**
 * Category pill — two physical states.
 *
 * Inactive (raised): surface-2 ground, 7px dot in the category color on
 *                    the left, paper-color label. Reads as a chip sitting
 *                    on the page surface.
 *
 * Active (pressed-in): the pill takes the FULL saturated category color
 *                      as its ground with dark text on top, plus an
 *                      inset shadow so it reads as a saturated chip
 *                      pressed into the surface. The whole page tints
 *                      to match (handled below), so the chip-press
 *                      reads as "the room caught the chip's color."
 */
function CategoryPill({
  label,
  active,
  cat,
  onClick,
}: {
  label: string
  active: boolean
  cat: Cat
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={EASE}
      className="inline-flex items-center gap-1.5 transition-colors duration-200"
      style={{
        height: '28px',
        padding: active ? '0 12px' : '0 12px 0 10px',
        borderRadius: 'var(--radius-pill)',
        background: active ? `var(--color-cat-${cat})` : 'var(--color-surface-2)',
        color: active ? 'var(--color-bg)' : 'var(--color-paper)',
        fontFamily: 'var(--font-mono-space)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: active ? 600 : 500,
        boxShadow: active
          ? 'inset 0 2px 4px rgba(0,0,0,0.35), inset 0 -1px 0 oklch(1 0 0 / 0.10)'
          : 'none',
      }}
    >
      {!active && (
        <span
          aria-hidden
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '999px',
            background: `var(--color-cat-${cat})`,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </motion.button>
  )
}

export function FeedClient({
  saves,
  initialCategory,
  initialQuery,
}: {
  saves: SaveWithRecommenders[]
  initialCategory?: string
  initialQuery?: string
}) {
  const [query, setQuery]   = useState(initialQuery ?? '')
  const [active, setActive] = useState<Cat | null>((initialCategory as Cat) ?? null)

  const availableCats = useMemo(() => {
    const present = new Set(saves.map(s => s.category as Cat))
    return ALL_CATS.filter(c => present.has(c))
  }, [saves])

  const filtered = useMemo(() => {
    let r = saves
    if (active) r = r.filter(s => s.category === active)
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.subtitle?.toLowerCase().includes(q) ?? false)
      )
    }
    return r
  }, [saves, active, query])

  // Hero shows the filtered count when a category is active — "1 find"
  // in the Recipe color when Recipe is selected, "9 finds" in the
  // default forest green otherwise. The numeral cross-fades on change.
  const total = saves.length
  const count = active ? filtered.length : total
  const noun = count === 1 ? 'find' : 'finds'
  const numeralColor = active
    ? `var(--color-cat-${active})`
    : 'oklch(0.70 0.16 152)'

  return (
    <div className="relative space-y-6">
      {/* ── Page-wide tint when a category is active ──────────────────
          The whole viewport takes on a tone of the active category color.
          Full-bleed flat fill (not a faint top wash) so the page actually
          feels themed by the active pill — amber when Restaurant is on,
          terracotta for Recipe, moss for Place. Fixed positioning
          survives scroll; pointer-events-none keeps it from blocking
          taps; -z-10 keeps it behind everything. */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background: `color-mix(in oklch, var(--color-cat-${active}) 14%, var(--color-bg))`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Header: oversized green numeral as the one chromatic moment ── */}
      <header className="space-y-2">
        <p
          className="font-mono uppercase"
          style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            color: 'var(--color-mute)',
          }}
        >
          Library
        </p>

        {total === 0 ? (
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontVariationSettings: "'opsz' 144, 'wght' 500, 'SOFT' 50",
              fontSize: '40px',
              letterSpacing: '-0.025em',
              color: 'var(--color-paper)',
              lineHeight: 1,
            }}
          >
            No finds<span style={{ fontStyle: 'normal' }}>.</span>
          </h1>
        ) : (
          <h1
            className="flex items-baseline gap-3"
            style={{ lineHeight: 1 }}
          >
            {/* Numeral cross-fades on count OR category change. Color
                tracks the active category (or the default forest green
                when nothing is filtered). */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${count}-${active ?? 'all'}`}
                className="tabular-nums"
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontVariationSettings: "'opsz' 144, 'wght' 500, 'SOFT' 50",
                  fontSize: '64px',
                  letterSpacing: '-0.04em',
                  color: numeralColor,
                  display: 'inline-block',
                }}
              >
                {count}
              </motion.span>
            </AnimatePresence>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontVariationSettings: "'opsz' 144, 'wght' 400",
                fontSize: '28px',
                letterSpacing: '-0.02em',
                color: 'var(--color-paper)',
              }}
            >
              {noun}<span style={{ fontStyle: 'normal' }}>.</span>
            </span>
          </h1>
        )}
      </header>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="relative">
        <span
          aria-hidden
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-mute)' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full transition-shadow duration-150 outline-none placeholder:lowercase"
          style={{
            height: '44px',
            paddingLeft: '40px',
            paddingRight: '16px',
            background: 'var(--color-surface)',
            color: 'var(--color-paper)',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
          }}
          onFocus={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
          onBlur={e => (e.currentTarget.style.background = 'var(--color-surface)')}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--color-mute)' }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Category pills ────────────────────────────────────────────── */}
      {availableCats.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {availableCats.map(cat => (
            <CategoryPill
              key={cat}
              label={CATEGORY_LABELS[cat]}
              cat={cat}
              active={active === cat}
              onClick={() => setActive(prev => (prev === cat ? null : cat))}
            />
          ))}
        </div>
      )}

      {/* ── Feed ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState filtered={Boolean(query || active)} />
      ) : (
        <motion.div
          key={String(active)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="space-y-2"
        >
          {filtered.map((save, i) => (
            <motion.div
              key={save.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.28), duration: 0.22, ease: 'easeOut' }}
            >
              <SaveCard save={save} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div
      className="mx-auto flex flex-col items-center text-center"
      style={{
        maxWidth: '360px',
        padding: '40px 24px',
      }}
    >
      <span
        aria-hidden
        style={{ fontSize: '20px', color: 'var(--color-mute)', marginBottom: '14px' }}
      >
        ◎
      </span>
      <h2
        className="font-serif italic"
        style={{
          fontSize: '20px',
          color: 'var(--color-paper)',
          marginBottom: '6px',
          lineHeight: 1.2,
        }}
      >
        {filtered ? 'Nothing matches.' : 'Send your first link.'}
      </h2>
      {!filtered && (
        <p style={{ fontSize: '13px', color: 'var(--color-mute)', lineHeight: 1.5 }}>
          Tap the centered + below to begin.
        </p>
      )}
    </div>
  )
}
