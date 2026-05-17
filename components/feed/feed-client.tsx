'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SaveCard } from './save-card'
import { Wordmark } from '@/components/wordmark'
import { CATEGORY_LABELS } from '@/lib/utils/time'
import type { SaveWithRecommenders } from '@/lib/data/saves'
import type { Database } from '@/lib/types/supabase'

type Cat = Database['public']['Enums']['save_category']
type Filter = 'all' | Cat

const ALL_CATS = Object.keys(CATEGORY_LABELS) as Cat[]

/**
 * Library — Stratum v2.
 *
 * Header (wordmark + YOUR LIBRARY + count), single-row drag-scroll
 * category strip with chromatic underlines, and a vertical list of
 * Stratum cards. No search field, no Near Me — those will return
 * later via a ⌘K command bar.
 *
 * Italic serif is reserved for single-Find moments (Capture +
 * Detail) — the Library uses Instrument Sans and Martian Mono only.
 */

const EASE = [0.2, 0.8, 0.2, 1] as const

export function FeedClient({
  saves,
  initialCategory,
}: {
  saves: SaveWithRecommenders[]
  initialCategory?: string
}) {
  const initial: Filter =
    initialCategory && (ALL_CATS as string[]).includes(initialCategory)
      ? (initialCategory as Cat)
      : 'all'
  const [active, setActive] = useState<Filter>(initial)

  // Only show category words for categories that actually have saves.
  const availableCats = useMemo(() => {
    const present = new Set(saves.map(s => s.category as Cat))
    return ALL_CATS.filter(c => present.has(c))
  }, [saves])

  const filtered = useMemo(() => {
    if (active === 'all') return saves
    return saves.filter(s => s.category === active)
  }, [saves, active])

  const total = saves.length
  const filteredCount = filtered.length
  const activeLabel = active === 'all' ? null : CATEGORY_LABELS[active] ?? active
  const activeTone =
    active === 'all' ? 'var(--color-paper)' : `var(--color-cat-${active})`

  return (
    <div className="relative">
      {/* ── Header (single-row top-right-title pattern) ──────────────── */}
      <header
        style={{
          padding: '14px 20px 8px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Wordmark size={22} onReset={() => setActive('all')} />
        <div
          style={{
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: 22,
            lineHeight: 1.0,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            textWrap: 'pretty',
            textAlign: 'right',
          }}
        >
          {active === 'all' ? (
            <>
              <span style={{ fontWeight: 400 }}>{total} </span>
              <span className="font-serif-display" style={{ fontSize: 22 }}>
                kept
              </span>
              <span style={{ color: 'var(--color-mute)' }}>.</span>
            </>
          ) : (
            <>
              <span style={{ color: activeTone, fontWeight: 400 }}>
                {filteredCount}
              </span>{' '}
              <span className="font-serif-display" style={{ fontSize: 22 }}>
                {(activeLabel ?? '').toLowerCase()}
                {filteredCount === 1 ? '' : 's'}
              </span>
              <span style={{ color: 'var(--color-mute)' }}>.</span>
            </>
          )}
        </div>
      </header>

      {/* ── Category strip ──────────────────────────────────────────── */}
      <CategoryRow
        active={active}
        setActive={setActive}
        saves={saves}
        availableCats={availableCats}
      />

      {/* ── Card list ───────────────────────────────────────────────── */}
      <div style={{ padding: '4px 14px 100px' }}>
        {filtered.length === 0 ? (
          <EmptyState filtered={active !== 'all'} />
        ) : (
          filtered.map((save, i) => (
            <motion.div
              key={save.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: Math.min(i * 0.035, 0.5),
                duration: 0.42,
                ease: EASE,
              }}
            >
              <SaveCard save={save} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────
   CategoryRow — single-row horizontal scroll, mouse-drag enabled.
   Plain typeset words with a 1.5px tinted underline on the active item.
   ────────────────────────────────────────────────────────────────────── */

function CategoryRow({
  active,
  setActive,
  saves,
  availableCats,
}: {
  active: Filter
  setActive: (f: Filter) => void
  saves: SaveWithRecommenders[]
  availableCats: Cat[]
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false })

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    drag.current = {
      down: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    }
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // some browsers throw if the pointer isn't capturable; ignore.
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.down || !ref.current) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 3) d.moved = true
    ref.current.scrollLeft = d.startScroll - dx
  }
  const onPointerUp = () => {
    drag.current.down = false
  }

  const pick = (next: Filter) => (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault()
      return
    }
    setActive(next)
  }

  const counts = useMemo(() => {
    const by = new Map<string, number>()
    for (const s of saves) by.set(s.category as string, (by.get(s.category as string) ?? 0) + 1)
    return by
  }, [saves])

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="no-scrollbar"
      style={{
        padding: '8px 0 12px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {/* Hide the scrollbar in WebKit too. Inline so we don't touch globals.css. */}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
      <div
        style={{
          display: 'inline-flex',
          gap: 16,
          padding: '0 20px',
          alignItems: 'baseline',
        }}
      >
        <CategoryWord
          active={active === 'all'}
          onClick={pick('all')}
          tone="var(--color-paper)"
          label="all"
          count={saves.length}
        />
        {availableCats.map(cat => (
          <CategoryWord
            key={cat}
            active={active === cat}
            onClick={pick(cat)}
            tone={`var(--color-cat-${cat})`}
            label={(CATEGORY_LABELS[cat] ?? cat).toLowerCase()}
            count={counts.get(cat) ?? 0}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryWord({
  active,
  onClick,
  tone,
  label,
  count,
}: {
  active: boolean
  onClick: (e: React.MouseEvent) => void
  tone: string
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 0,
        padding: '4px 0',
        margin: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        color: active ? 'var(--color-paper)' : 'var(--color-mute)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        letterSpacing: '-0.005em',
        borderBottom: `1.5px solid ${active ? tone : 'transparent'}`,
        boxShadow: active ? `0 6px 12px -6px ${tone}` : 'none',
        transition: 'all 0.28s ease',
      }}
    >
      {label}
      <sup
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 8.5,
          color: active ? tone : 'rgba(244,243,239,0.4)',
          letterSpacing: '0.04em',
          marginLeft: 1,
          transition: 'color 0.24s',
        }}
      >
        {count}
      </sup>
    </button>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div
      className="mx-auto flex flex-col items-center text-center"
      style={{
        maxWidth: 360,
        padding: '40px 24px',
      }}
    >
      <span
        aria-hidden
        style={{ fontSize: 20, color: 'var(--color-mute)', marginBottom: 14 }}
      >
        ◎
      </span>
      <h2
        style={{
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          fontSize: 16,
          fontWeight: 500,
          color: 'var(--color-paper)',
          marginBottom: 6,
          lineHeight: 1.25,
          letterSpacing: '-0.01em',
        }}
      >
        {filtered ? 'Nothing here yet.' : 'Send your first link.'}
      </h2>
      {!filtered && (
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--color-mute)',
            lineHeight: 1.5,
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
          }}
        >
          Tap the + dock below to keep something.
        </p>
      )}
    </div>
  )
}
