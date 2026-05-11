'use client'

import { useState, useMemo } from 'react'
import type React from 'react'
import { motion } from 'framer-motion'
import { SaveCard } from './save-card'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import type { SaveWithRecommenders } from '@/lib/data/saves'
import type { Database } from '@/lib/types/supabase'

type Cat = Database['public']['Enums']['save_category']
const ALL_CATS = Object.keys(CATEGORY_LABELS) as Cat[]

// Near Me: special chip — teal-green, distinct from categories
const NEAR_ME_COLOR = '#00e5a0'
const NEAR_ME = '__near_me__' as const

const EASE = { duration: 0.16, ease: 'easeInOut' } as const

function Chip({
  label,
  active,
  color,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  color: string
  onClick: () => void
  icon?: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      transition={EASE}
      className={`chip font-mono text-[11px] px-3 py-1.5 rounded-full ${active ? '' : 'chip-off'}`}
      style={active ? {
        background: `linear-gradient(180deg, ${color}f0 0%, ${color}cc 55%, ${color}e0 100%)`,
        border: `1px solid ${color}`,
        color: 'oklch(0.10 0.09 262)',
        boxShadow: [
          `0 3px 0 rgba(0,0,0,0.55)`,
          `0 5px 16px rgba(0,0,0,0.40)`,
          `inset 0 1px 0 rgba(255,255,255,0.38)`,
          `inset 0 -1px 0 rgba(0,0,0,0.18)`,
        ].join(', '),
      } : undefined}
    >
      {icon}{label}
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
  const [query, setQuery]         = useState(initialQuery ?? '')
  const [active, setActive]       = useState<Cat | typeof NEAR_ME | null>(
    (initialCategory as Cat) ?? null
  )

  // Only surface category chips that have at least one save.
  // Stable order: keep the canonical category order from CATEGORY_LABELS.
  const availableCats = useMemo(() => {
    const present = new Set(saves.map(s => s.category as Cat))
    return ALL_CATS.filter(c => present.has(c))
  }, [saves])

  const filtered = useMemo(() => {
    let r = saves
    // Near Me or no category filter: show all
    if (active && active !== NEAR_ME) {
      r = r.filter(s => s.category === active)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.subtitle?.toLowerCase().includes(q) ?? false)
      )
    }
    return r
  }, [saves, active, query])

  function toggle(val: Cat | typeof NEAR_ME) {
    setActive(prev => (prev === val ? null : val))
  }

  return (
    <div className="space-y-5">

      {/* Live search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your saves…"
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/[0.07] border border-white/10 text-sm font-mono text-white/80 placeholder:text-white/25 focus:outline-none focus:bg-white/[0.10] focus:border-white/25 transition-all duration-200"
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Chips row */}
      <div className="flex gap-2 flex-wrap">

        {/* Near Me — special first chip */}
        <Chip
          label="Near Me"
          active={active === NEAR_ME}
          color={NEAR_ME_COLOR}
          onClick={() => toggle(NEAR_ME)}
          icon={
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="mr-1 shrink-0">
              <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          }
        />

        {/* Category chips — only ones that have saves */}
        {availableCats.map(cat => (
          <Chip
            key={cat}
            label={CATEGORY_LABELS[cat]}
            active={active === cat}
            color={CATEGORY_COLORS[cat]}
            onClick={() => toggle(cat)}
          />
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-white/30 text-sm font-mono">
            {query || active ? 'Nothing matches.' : 'No finds yet.'}
          </p>
          {!query && !active && (
            <a href="/add"
              className="mt-3 inline-block text-sm text-white/45 hover:text-white/80 transition-colors underline underline-offset-4 decoration-white/20">
              Add your first find →
            </a>
          )}
        </div>
      ) : (
        <motion.div
          key={String(active)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.20, ease: 'easeOut' }}
          className="space-y-3"
        >
          {filtered.map((save, i) => (
            <motion.div
              key={save.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.28), duration: 0.22, ease: 'easeOut' }}
            >
              <SaveCard save={save} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
