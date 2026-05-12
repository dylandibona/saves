'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SaveCard } from './save-card'
import { CATEGORY_LABELS } from '@/lib/utils/time'
import type { SaveWithRecommenders } from '@/lib/data/saves'
import type { Database } from '@/lib/types/supabase'

type Cat = Database['public']['Enums']['save_category']
const ALL_CATS = Object.keys(CATEGORY_LABELS) as Cat[]

/**
 * Feed — Library surface.
 *
 * The page hero is a saturated Finds Green panel that uses the same
 * Fraunces italic wordmark as the top-left brand mark — one typographic
 * voice for "Finds." across the app. Beneath it: a count subtitle ("11
 * things kept."), a search bar, category pills, then the compact rows.
 *
 * The hero panel is the one chromatic puncture per Sagmeister discipline:
 * forest green ground, cream ink, and nothing else fights it.
 */

const EASE = { duration: 0.18, ease: 'easeInOut' } as const

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
      className="inline-flex items-center gap-1.5 transition-colors duration-150"
      style={{
        height: '28px',
        padding: '0 10px',
        borderRadius: 'var(--radius-pill)',
        background: active ? 'var(--color-bone)' : 'var(--color-surface-2)',
        color: active ? 'var(--color-bg)' : 'var(--color-paper)',
        fontFamily: 'var(--font-mono-space)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 500,
      }}
    >
      <span
        aria-hidden
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '999px',
          background: `var(--color-cat-${cat})`,
        }}
      />
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

  const total = saves.length
  const noun = total === 1 ? 'thing' : 'things'

  return (
    <div className="space-y-6">
      {/* ── Brand hero panel — saturated forest, the one color moment ──── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'var(--color-brand)',
          color: 'var(--color-brand-ink)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 24px 24px',
        }}
      >
        {/* Soft inner highlight for tactility */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 80% at 12% 0%, rgba(255,255,255,0.10), transparent 55%)',
          }}
        />

        <div className="relative">
          <p
            className="font-mono uppercase"
            style={{
              fontSize: '10px',
              letterSpacing: '0.18em',
              color: 'oklch(0.95 0.02 95 / 0.65)',
            }}
          >
            Library
          </p>

          <h1
            className="mt-3 leading-none"
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontVariationSettings: "'opsz' 144, 'wght' 500, 'SOFT' 50",
              fontSize: '64px',
              letterSpacing: '-0.025em',
              color: 'var(--color-brand-ink)',
            }}
          >
            Finds<span style={{ fontStyle: 'normal' }}>.</span>
          </h1>

          <p
            className="mt-3"
            style={{
              fontSize: '14px',
              color: 'oklch(0.95 0.02 95 / 0.78)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {total === 0
              ? 'Nothing kept yet.'
              : (
                <>
                  <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--color-brand-ink)' }}>
                    {total}
                  </span>{' '}
                  {noun} kept.
                </>
              )}
          </p>
        </div>
      </section>

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
