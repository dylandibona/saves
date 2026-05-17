'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addSave } from './actions'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import {
  EMPTY_BUILD_STATE,
  HeroSlot,
  TitleSlot,
  FieldLog,
  EnrichedCallout,
  type BuildState,
} from '@/components/add/build-preview'
import { Wordmark } from '@/components/wordmark'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

// Snapshot of the complete enrichment payload. Drives hidden form fields
// that get submitted with addSave.
type EnrichedSnapshot = {
  title: string | null
  subtitle: string | null
  category: SaveCategory | null
  imageUrl: string | null
  canonicalUrl: string
  coords: { lat: number; lng: number } | null
  note: string | null
  confidence: 'high' | 'medium' | 'low'
  alternativeCategories?: SaveCategory[]
  extracted?: Record<string, unknown>
}

type Props = {
  initialUrl?: string
  /**
   * Member count of the user's household. When 1 (solo user), the
   * MY FAMILY / JUST ME tabs are hidden — saves default to 'household'
   * silently. When >1, tabs render.
   */
  memberCount: number
}

export function AddForm({ initialUrl = '', memberCount }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  // ─── Build state (drives the live preview) ─────────────────────────
  const [buildState, setBuildState] = useState<BuildState>(EMPTY_BUILD_STATE)

  // ─── Enriched snapshot (drives hidden form inputs) ─────────────────
  const [snapshot, setSnapshot] = useState<EnrichedSnapshot | null>(null)

  // ─── Form fields (user-editable) ───────────────────────────────────
  const [url, setUrl] = useState(initialUrl)
  const [visibility, setVisibility] = useState<'household' | 'private'>('household')
  // `kept` is a discrete user action — only flips when the user actually
  // taps Keep. Enrichment completing does NOT flip this.
  const [kept, setKept] = useState(false)

  // ─── Refs to control re-enrichment ─────────────────────────────────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamControllerRef = useRef<AbortController | null>(null)
  // Guards against re-running enrichment when the URL hasn't actually
  // changed (e.g. when the user clicks Keep, the URL input loses focus
  // and previously fired a duplicate enrichment via onBlur).
  const lastEnrichedRef = useRef<string>('')

  // ─── Stream-based enrichment ───────────────────────────────────────
  const runEnrichmentStream = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim()
    if (!trimmed.startsWith('http')) return
    // Skip if this exact URL was just enriched.
    if (trimmed === lastEnrichedRef.current) return
    lastEnrichedRef.current = trimmed

    // Cancel any in-flight enrichment
    streamControllerRef.current?.abort()
    const controller = new AbortController()
    streamControllerRef.current = controller

    // Reset build state to starting
    setBuildState({ ...EMPTY_BUILD_STATE, status: 'starting', phase: 'starting' })
    setSnapshot(null)

    try {
      const response = await fetch('/api/enrich-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error('Enrichment endpoint returned no body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const eventStr of events) {
          const line = eventStr.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            handleStreamEvent(event.phase, event.data)
          } catch {
            // bad event, skip
          }
        }
      }
    } catch (err) {
      const e = err as Error
      if (e.name === 'AbortError') return // expected — new enrichment started
      console.warn('[enrich-stream] client error', e.message)
      setBuildState(s => ({ ...s, status: 'error', phase: 'error', errorMessage: e.message }))
    }
    // handleStreamEvent closes over `url` via setUrl but is stable for our
    // purposes — it always reads the latest state via setBuildState's updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleStreamEvent(phase: string, data: any) {
    setBuildState(s => {
      switch (phase) {
        case 'detected':
          return { ...s, status: 'fetching', phase, urlType: data.urlType }
        case 'fetching':
          return { ...s, status: 'fetching', phase }
        case 'og_parsed':
          // If the URL resolved to a longer form (shortened maps), update input.
          if (data.resolvedUrl && data.resolvedUrl !== url) {
            setUrl(data.resolvedUrl)
          }
          return {
            ...s,
            status: 'classifying',
            phase: 'og_parsed',
            siteName: data.siteName,
            imageUrl: data.imageUrl,
            // Title from OG is provisional — Claude may improve it
            title: s.title ?? data.title,
          }
        case 'classifying':
          return { ...s, status: 'classifying', phase }
        case 'classified':
          return {
            ...s,
            status: 'building',
            phase: 'classified',
            category: data.category,
            confidence: data.confidence,
          }
        case 'titled':
          return { ...s, phase: 'titled', title: data.title }
        case 'subtitled':
          return { ...s, phase: 'subtitled', subtitle: data.subtitle }
        case 'noted':
          return { ...s, phase: 'noted', note: data.note }
        case 'ingredient':
          return { ...s, phase: 'ingredient', ingredients: [...s.ingredients, data.ingredient] }
        case 'instruction':
          return { ...s, phase: 'instruction', instructions: [...s.instructions, data.instruction] }
        case 'exercise':
          return { ...s, phase: 'exercise', exercises: [...s.exercises, data] }
        case 'recipe_meta':
          return { ...s, phase: 'recipe_meta', recipeMeta: { ...s.recipeMeta, ...data } }
        case 'workout_meta':
          return { ...s, phase: 'workout_meta', workoutMeta: { ...s.workoutMeta, ...data } }
        case 'place_detail':
          return { ...s, phase: 'place_detail', placeDetail: { ...s.placeDetail, ...data } }
        case 'article_detail':
          return { ...s, phase: 'article_detail', articleDetail: { ...s.articleDetail, ...data } }
        case 'movie_detail':
          return { ...s, phase: 'movie_detail', movieDetail: { ...s.movieDetail, ...data } }
        case 'product_detail':
          return { ...s, phase: 'product_detail', productDetail: { ...s.productDetail, ...data } }
        case 'media_detail':
          return { ...s, phase: 'media_detail', mediaDetail: { ...s.mediaDetail, ...data } }
        case 'coords':
          return { ...s, phase: 'coords', coords: data }
        case 'complete':
          applyComplete(data)
          return { ...s, status: 'complete', phase: 'complete' }
        case 'error':
          return { ...s, status: 'error', phase: 'error', errorMessage: data?.message }
      }
      return s
    })
  }

  // Final payload → snapshot + form pre-fills
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyComplete(data: any) {
    const snap: EnrichedSnapshot = {
      title: data.title ?? null,
      subtitle: data.subtitle ?? null,
      category: data.category ?? null,
      imageUrl: data.imageUrl ?? null,
      canonicalUrl: data.canonicalUrl ?? url,
      coords: data.coords ?? null,
      note: data.note ?? null,
      confidence: data.confidence ?? 'low',
      alternativeCategories: data.alternativeCategories,
      extracted: data.extracted,
    }
    setSnapshot(snap)

    // Update URL if it resolved to a different canonical form
    if (snap.canonicalUrl && snap.canonicalUrl !== url) {
      setUrl(snap.canonicalUrl)
    }
  }

  const handleUrlChange = useCallback(
    (next: string) => {
      setUrl(next)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => runEnrichmentStream(next), 300)
    },
    [runEnrichmentStream]
  )

  // Auto-enrich on mount when ?url=... arrives (PWA share / iOS shortcut)
  useEffect(() => {
    if (initialUrl && initialUrl.startsWith('http')) {
      runEnrichmentStream(initialUrl)
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Derived presentation values ───────────────────────────────────
  const category = buildState.category ?? null
  const tone = category ? CATEGORY_COLORS[category] : null
  const catSet = Boolean(category)
  const titleResolved = Boolean(buildState.title) && buildState.status !== 'starting'
  const phaseComplete = buildState.phase === 'complete'

  // Resolved snapshot drives the form submission. We still want to allow
  // submission once we have at least a title — degrade gracefully.
  const submitTitle = snapshot?.title ?? buildState.title ?? ''
  const submitCategory: SaveCategory =
    snapshot?.category ?? buildState.category ?? ('noted' as SaveCategory)
  const submitNote = snapshot?.note ?? buildState.note ?? ''

  // ─── Handlers ──────────────────────────────────────────────────────
  function handleCancel() {
    // Best-effort: history-aware back, with fallback to Library.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  // Keep is locked out until the SSE stream finishes. Without this gate
  // the user could fire mid-stream — title arrives at phase 'titled'
  // but ingredients / hours / extracted facts are still landing, and
  // the form would save a half-enriched Find. We accept submission on
  // both `complete` and `error` so a hung remote source doesn't trap
  // the user; on error they get whatever OG/heuristic we managed.
  const isBuilding =
    buildState.status === 'starting' ||
    buildState.status === 'fetching' ||
    buildState.status === 'classifying' ||
    buildState.status === 'building'
  const canKeep =
    !isBuilding &&
    (buildState.status === 'complete' || buildState.status === 'error' || !!submitTitle)

  function handleKeep() {
    if (!submitTitle) return
    if (!canKeep) return
    setKept(true)
    // Submit on the next tick so the visual "Kept ↵" state can paint
    // before navigation. The form action fires the Server Action.
    requestAnimationFrame(() => {
      formRef.current?.requestSubmit()
    })
  }

  // ─── Styles ────────────────────────────────────────────────────────
  const monoCaption: React.CSSProperties = {
    fontFamily: 'var(--font-mono), ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  }

  return (
    <form
      ref={formRef}
      action={addSave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        color: 'var(--color-paper)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        fontSize: 13,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{ padding: '14px 20px 6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Wordmark size={22} />
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: 'var(--color-mute)',
              ...monoCaption,
              fontSize: 10,
              letterSpacing: '0.16em',
            }}
            aria-label="Cancel"
          >
            CANCEL
          </button>
        </div>

        {/* ── Masthead: NEW · ENTRY → ■ RECIPE ▾ ──────────────────── */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 9.5,
            letterSpacing: '0.16em',
          }}
        >
          <span
            style={{
              color: catSet && tone ? tone : 'var(--color-mute)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'color 0.5s var(--ease-strat, ease)',
            }}
          >
            <span>
              {catSet && category
                ? `■ ${(CATEGORY_LABELS[category] ?? category).toUpperCase()}`
                : 'NEW · ENTRY'}
            </span>
            {catSet && (
              <svg
                width="8"
                height="6"
                viewBox="0 0 8 6"
                fill="none"
                style={{ opacity: 0.85 }}
                aria-hidden
              >
                <path
                  d="M1 1.5L4 4.5L7 1.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </div>
      </header>

      {/* ── URL input row ──────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid var(--color-hairline)',
            borderRadius: 4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M6 8L8 6m-2 2l-1.5 1.5a2.5 2.5 0 11-3.5-3.5L2.5 4.5M8 6l1.5-1.5a2.5 2.5 0 113.5 3.5L11.5 9.5"
              stroke="var(--color-mute)"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            id="url"
            name="url"
            type="url"
            placeholder="paste a link"
            autoFocus
            value={url}
            onPaste={e => {
              const pasted = e.clipboardData.getData('text')
              handleUrlChange(pasted)
            }}
            onChange={e => handleUrlChange(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              color: 'var(--color-paper)',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 11,
              padding: 0,
            }}
            className="placeholder:text-[var(--color-mute)]"
          />
        </div>
      </div>

      {/* ── Build surface (hero + title + extracted + enriched) ────── */}
      <div style={{ flex: 1, padding: '16px 20px 0' }}>
        <HeroSlot
          imageUrl={buildState.imageUrl ?? null}
          category={category}
          phase={buildState.phase}
        />

        <TitleSlot
          title={buildState.title ?? null}
          phase={buildState.phase}
          category={category}
        />

        {/* Source subtitle line — mono caps, only when subtitle arrives */}
        {buildState.subtitle && (
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 9.5,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: 'var(--color-mute)',
            }}
          >
            {buildState.subtitle}
          </div>
        )}

        <FieldLog state={buildState} />

        {phaseComplete && <EnrichedCallout category={category} />}
      </div>

      {/* ── Hidden form inputs ─────────────────────────────────────── */}
      <input type="hidden" name="title" value={submitTitle} />
      <input type="hidden" name="category" value={submitCategory} />
      <input type="hidden" name="note" value={submitNote} />
      <input type="hidden" name="visibility" value={visibility} />
      <input
        type="hidden"
        name="coords"
        value={snapshot?.coords ? JSON.stringify(snapshot.coords) : ''}
      />
      <input type="hidden" name="subtitle" value={snapshot?.subtitle ?? ''} />
      <input type="hidden" name="hero_image_url" value={snapshot?.imageUrl ?? ''} />
      <input type="hidden" name="location_address" value={snapshot?.subtitle ?? ''} />
      <input
        type="hidden"
        name="extracted"
        value={snapshot?.extracted ? JSON.stringify(snapshot.extracted) : ''}
      />

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 26px' }}>
        {/* Visibility tabs — hidden for solo users */}
        {memberCount > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderTop: '1px solid var(--color-hairline)',
              marginTop: 14,
            }}
          >
            {(
              [
                { v: 'household', label: 'MY FAMILY' },
                { v: 'private', label: 'JUST ME' },
              ] as const
            ).map(({ v, label }) => {
              const active = visibility === v
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVisibility(v)}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    background: 'transparent',
                    border: 0,
                    borderBottom: active
                      ? '1px solid var(--color-paper)'
                      : '1px solid transparent',
                    color: active ? 'var(--color-paper)' : 'var(--color-mute)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono), ui-monospace, monospace',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    fontWeight: 500,
                    transition: 'all 0.24s var(--ease-strat, ease)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Keep button — three states:
              • idle / no-URL  → disabled, "Keep", neutral cream
              • building       → disabled, "Building…" with animating dots,
                                 prevents the race where mid-stream taps
                                 saved half-enriched Finds
              • complete (or error fallback) → enabled, "Keep"
              • user tapped    → tone fill + "Kept ↵" */}
        <button
          type="button"
          onClick={handleKeep}
          disabled={!canKeep || kept}
          style={{
            width: '100%',
            padding: '15px 0',
            marginTop: memberCount > 1 ? 14 : 18,
            background: kept && tone
              ? tone
              : 'linear-gradient(180deg, #f4f3ef 0%, oklch(0.92 0.01 80) 100%)',
            color: '#08080b',
            border: 0,
            borderTop:
              catSet && tone ? `2px solid ${tone}` : '2px solid transparent',
            borderRadius: 4,
            cursor: canKeep && !kept ? 'pointer' : 'default',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '-0.005em',
            opacity: canKeep || kept ? 1 : (isBuilding ? 0.65 : 0.45),
            boxShadow:
              catSet && tone
                ? `0 -10px 20px -10px ${tone}, 0 0 0 0.5px rgba(255,255,255,0.06) inset`
                : 'none',
            transition: 'all 0.36s var(--ease-strat, ease)',
          }}
        >
          {kept ? 'Kept ↵' : isBuilding ? (
            <span>
              Building<span aria-hidden style={{ display: 'inline-block', minWidth: '1.2em', textAlign: 'left' }}>
                <span className="build-ellipsis-1">.</span>
                <span className="build-ellipsis-2">.</span>
                <span className="build-ellipsis-3">.</span>
              </span>
            </span>
          ) : 'Keep'}
        </button>
        <style>{`
          @keyframes keep-build-dot {
            0%, 20%   { opacity: 0.25 }
            50%       { opacity: 1    }
            100%      { opacity: 0.25 }
          }
          .build-ellipsis-1 { animation: keep-build-dot 1.2s ease-in-out infinite; animation-delay: 0s; }
          .build-ellipsis-2 { animation: keep-build-dot 1.2s ease-in-out infinite; animation-delay: 0.2s; }
          .build-ellipsis-3 { animation: keep-build-dot 1.2s ease-in-out infinite; animation-delay: 0.4s; }
        `}</style>
      </div>
    </form>
  )
}
