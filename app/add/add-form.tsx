'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { addSave } from './actions'
import { CATEGORY_LABELS } from '@/lib/utils/time'
import { BuildPreview, EMPTY_BUILD_STATE, type BuildState } from '@/components/add/build-preview'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

const categories = Object.keys(CATEGORY_LABELS) as SaveCategory[]

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

export function AddForm({ initialUrl = '' }: { initialUrl?: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  // ─── Build state (drives the live preview) ─────────────────────────
  const [buildState, setBuildState] = useState<BuildState>(EMPTY_BUILD_STATE)

  // ─── Enriched snapshot (drives hidden form inputs) ─────────────────
  const [snapshot, setSnapshot] = useState<EnrichedSnapshot | null>(null)

  // ─── Form fields (user-editable) ───────────────────────────────────
  const [url, setUrl] = useState(initialUrl)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SaveCategory>(categories[0])
  const [categoryAuto, setCategoryAuto] = useState(false)
  const [suggestedNote, setSuggestedNote] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<'household' | 'private'>('household')

  // ─── Refs to control re-enrichment + touch tracking ────────────────
  const titleTouched = useRef(false)
  const noteTouched = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamControllerRef = useRef<AbortController | null>(null)
  // Guards against re-running enrichment when the URL hasn't actually
  // changed (e.g. when the user clicks Keep, the URL input loses focus
  // and previously fired a duplicate enrichment via onBlur).
  const lastEnrichedRef = useRef<string>('')

  // Show category disambiguation when AI was uncertain
  const showDisambig =
    snapshot &&
    snapshot.alternativeCategories &&
    snapshot.alternativeCategories.length > 0 &&
    snapshot.confidence !== 'high' &&
    categoryAuto

  // ─── Stream-based enrichment ───────────────────────────────────────
  const runEnrichmentStream = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim()
    if (!trimmed.startsWith('http')) return
    // Skip if this exact URL was just enriched. Prevents duplicate work
    // when blur events fire after onChange already triggered enrichment.
    if (trimmed === lastEnrichedRef.current) return
    lastEnrichedRef.current = trimmed

    // Cancel any in-flight enrichment
    streamControllerRef.current?.abort()
    const controller = new AbortController()
    streamControllerRef.current = controller

    // Reset build state to starting
    setBuildState({ ...EMPTY_BUILD_STATE, status: 'starting' })
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
          const trimmed = eventStr.trim()
          if (!trimmed.startsWith('data: ')) continue
          try {
            const event = JSON.parse(trimmed.slice(6))
            handleStreamEvent(event.phase, event.data)
          } catch {
            // bad event, skip
          }
        }
      }
    } catch (err) {
      const e = err as Error
      if (e.name === 'AbortError') return  // expected — new enrichment started
      console.warn('[enrich-stream] client error', e.message)
      setBuildState(s => ({ ...s, status: 'error', errorMessage: e.message }))
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleStreamEvent(phase: string, data: any) {
    setBuildState(s => {
      switch (phase) {
        case 'detected':
          return { ...s, status: 'fetching', urlType: data.urlType }
        case 'fetching':
          return { ...s, status: 'fetching' }
        case 'og_parsed':
          // If the URL resolved to a longer form (shortened maps), update input.
          if (data.resolvedUrl && data.resolvedUrl !== url) {
            setUrl(data.resolvedUrl)
          }
          return {
            ...s,
            status: 'classifying',
            siteName: data.siteName,
            imageUrl: data.imageUrl,
            // Title from OG is provisional — Claude may improve it
            title: s.title ?? data.title,
          }
        case 'classifying':
          return { ...s, status: 'classifying' }
        case 'classified':
          // Sync the form radio to AI's pick the moment it arrives so the
          // preview and the form match. complete will confirm.
          if (data.category) {
            setSelectedCategory(data.category)
            setCategoryAuto(true)
          }
          return {
            ...s,
            status: 'building',
            category: data.category,
            confidence: data.confidence,
          }
        case 'titled':
          return { ...s, title: data.title }
        case 'subtitled':
          return { ...s, subtitle: data.subtitle }
        case 'noted':
          return { ...s, note: data.note }
        case 'ingredient':
          return { ...s, ingredients: [...s.ingredients, data.ingredient] }
        case 'instruction':
          return { ...s, instructions: [...s.instructions, data.instruction] }
        case 'exercise':
          return { ...s, exercises: [...s.exercises, data] }
        case 'recipe_meta':
          return { ...s, recipeMeta: { ...s.recipeMeta, ...data } }
        case 'workout_meta':
          return { ...s, workoutMeta: { ...s.workoutMeta, ...data } }
        case 'place_detail':
          return { ...s, placeDetail: { ...s.placeDetail, ...data } }
        case 'article_detail':
          return { ...s, articleDetail: { ...s.articleDetail, ...data } }
        case 'movie_detail':
          return { ...s, movieDetail: { ...s.movieDetail, ...data } }
        case 'product_detail':
          return { ...s, productDetail: { ...s.productDetail, ...data } }
        case 'media_detail':
          return { ...s, mediaDetail: { ...s.mediaDetail, ...data } }
        case 'coords':
          return { ...s, coords: data }
        case 'complete':
          applyComplete(data)
          return { ...s, status: 'complete' }
        case 'error':
          return { ...s, status: 'error', errorMessage: data?.message }
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

    // Pre-fill title only if user hasn't typed
    if (!titleTouched.current && snap.title) {
      setTitle(snap.title)
    }

    // Always auto-select AI's suggested category when one exists. The
    // disambiguation prompt below the chips surfaces alternatives when
    // confidence is low so the user can override with one tap.
    if (snap.category) {
      setSelectedCategory(snap.category)
      setCategoryAuto(true)
    }

    // Suggested note (ghost text)
    if (!noteTouched.current && snap.note) {
      setSuggestedNote(snap.note)
    }

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

  // Shared input styling — surface-2 background, rounded, focus brightens
  const inputBase = {
    background: 'var(--color-surface-2)',
    color: 'var(--color-paper)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    width: '100%',
    fontFamily: 'var(--font-sans)',
  } as const

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono-space)',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: 'var(--color-mute)',
    display: 'block',
    marginBottom: '8px',
  }

  return (
    <form ref={formRef} action={addSave} className="space-y-6">

      {/* URL field */}
      <div>
        <label htmlFor="url" style={labelStyle}>Url</label>
        <input
          id="url"
          name="url"
          type="url"
          placeholder="https://"
          autoFocus
          value={url}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            handleUrlChange(pasted)
          }}
          onChange={(e) => handleUrlChange(e.target.value)}
          style={{
            ...inputBase,
            height: '48px',
            padding: '0 16px',
            fontSize: '15px',
            outline: 'none',
          }}
          className="placeholder:text-[var(--color-faint)] focus:ring-2 focus:ring-[oklch(0.50_0.04_95_/_0.4)] transition-shadow"
        />
      </div>

      {/* Live build preview — materializes as enrichment streams in */}
      <BuildPreview state={buildState} />

      {/* Hidden enrichment fields forwarded to addSave */}
      <input type="hidden" name="coords" value={snapshot?.coords ? JSON.stringify(snapshot.coords) : ''} />
      <input type="hidden" name="subtitle" value={snapshot?.subtitle ?? ''} />
      <input type="hidden" name="hero_image_url" value={snapshot?.imageUrl ?? ''} />
      <input type="hidden" name="location_address" value={snapshot?.subtitle ?? ''} />
      <input
        type="hidden"
        name="extracted"
        value={snapshot?.extracted ? JSON.stringify(snapshot.extracted) : ''}
      />

      {/* Title field */}
      <div>
        <label htmlFor="title" style={labelStyle}>Title</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="What is this?"
          required
          value={title}
          onChange={(e) => {
            titleTouched.current = true
            setTitle(e.target.value)
          }}
          style={{
            ...inputBase,
            height: '52px',
            padding: '0 16px',
            fontSize: '18px',
            fontWeight: 500,
            outline: 'none',
            letterSpacing: '-0.01em',
          }}
          className="placeholder:text-[var(--color-faint)] focus:ring-2 focus:ring-[oklch(0.50_0.04_95_/_0.4)] transition-shadow"
        />
      </div>

      {/* Category */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p style={labelStyle}>Category</p>
          {categoryAuto && (
            <p
              className="font-mono"
              style={{
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-faint)',
              }}
            >
              auto
            </p>
          )}
        </div>

        {/* Disambiguation prompt — shows when AI was uncertain */}
        {showDisambig && (
          <div
            className="rounded-md px-3 py-2.5 space-y-2"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p
              className="font-mono"
              style={{
                fontSize: '11px',
                color: 'var(--color-mute)',
              }}
            >
              Or one of these?
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {snapshot!.alternativeCategories!.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="inline-flex items-center gap-1.5 transition-colors duration-150"
                  style={{
                    height: '26px',
                    padding: '0 10px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-paper)',
                    fontFamily: 'var(--font-mono-space)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '999px',
                      background: `var(--color-cat-${cat})`,
                    }}
                  />
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const checked = selectedCategory === cat
            return (
              <label key={cat} className="cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  required
                  checked={checked}
                  onChange={() => {
                    setSelectedCategory(cat)
                    setCategoryAuto(false)
                  }}
                  className="sr-only peer"
                />
                <span
                  className="inline-flex items-center gap-1.5 transition-all duration-150"
                  style={{
                    height: '30px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-pill)',
                    background: checked ? 'var(--color-bone)' : 'var(--color-surface-2)',
                    color: checked ? 'var(--color-bg)' : 'var(--color-paper)',
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
                  {CATEGORY_LABELS[cat]}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Note field */}
      <div>
        <label htmlFor="note" style={labelStyle}>Note <span className="opacity-50">— optional</span></label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder={suggestedNote ?? 'Why are you keeping this?'}
          value={note}
          onChange={(e) => {
            noteTouched.current = true
            setSuggestedNote(null)
            setNote(e.target.value)
          }}
          style={{
            ...inputBase,
            padding: '12px 16px',
            fontSize: '15px',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.5,
          }}
          className="placeholder:text-[var(--color-faint)] focus:ring-2 focus:ring-[oklch(0.50_0.04_95_/_0.4)] transition-shadow"
        />
        {suggestedNote && !note && (
          <p
            className="italic mt-2"
            style={{
              fontFamily: 'var(--font-mono-space)',
              fontSize: '11px',
              color: 'var(--color-faint)',
              lineHeight: 1.5,
            }}
          >
            Suggested: {suggestedNote}
          </p>
        )}
      </div>

      {/* Visibility — Shared with household / Just me */}
      <div className="space-y-3">
        <p style={labelStyle}>Visibility</p>
        <div className="flex gap-2">
          {([
            { value: 'household', label: 'Shared', icon: 'shared' },
            { value: 'private',   label: 'Just me', icon: 'lock' },
          ] as const).map(opt => {
            const active = visibility === opt.value
            return (
              <label key={opt.value} className="cursor-pointer flex-1">
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={active}
                  onChange={() => setVisibility(opt.value)}
                  className="sr-only peer"
                />
                <span
                  className="block text-center inline-flex items-center justify-center gap-2 transition-all duration-150"
                  style={{
                    height: '44px',
                    padding: '0 16px',
                    borderRadius: 'var(--radius-md)',
                    background: active ? 'var(--color-bone)' : 'var(--color-surface-2)',
                    color: active ? 'var(--color-bg)' : 'var(--color-paper)',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {opt.icon === 'shared' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  )}
                  {opt.label}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Keep button — white pill primary CTA */}
      <div className="pt-3">
        <button
          type="submit"
          className="w-full transition-all duration-150 active:scale-[0.98]"
          style={{
            height: '52px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-bone)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-sans)',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Keep
        </button>
      </div>

    </form>
  )
}
