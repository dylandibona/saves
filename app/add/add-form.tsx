'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { addSave } from './actions'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import { BuildPreview, EMPTY_BUILD_STATE, type BuildState } from '@/components/add/build-preview'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

const categories = Object.keys(CATEGORY_LABELS) as SaveCategory[]

const field =
  'w-full bg-transparent border-0 border-b border-white/15 focus:border-white/45 focus:outline-none py-3 text-white/90 placeholder:text-white/22 transition-colors duration-200 text-base'

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

  // Show category disambiguation when AI was uncertain
  const showDisambig =
    snapshot &&
    snapshot.alternativeCategories &&
    snapshot.alternativeCategories.length > 0 &&
    snapshot.confidence !== 'high' &&
    categoryAuto

  // ─── Stream-based enrichment ───────────────────────────────────────
  const runEnrichmentStream = useCallback(async (rawUrl: string) => {
    if (!rawUrl.startsWith('http')) return

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

    // Auto-select category if confident
    if (snap.category && (snap.confidence === 'high' || snap.confidence === 'medium')) {
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

  return (
    <form ref={formRef} action={addSave} className="space-y-8">

      {/* URL field */}
      <div className="space-y-1.5">
        <label htmlFor="url" className="font-mono text-[10px] tracking-widest text-white/30">
          Url — Optional
        </label>
        <input
          id="url"
          name="url"
          type="url"
          placeholder="https://"
          autoFocus
          value={url}
          className={field}
          onBlur={(e) => runEnrichmentStream(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            handleUrlChange(pasted)
          }}
          onChange={(e) => handleUrlChange(e.target.value)}
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
      <div className="space-y-1.5">
        <label htmlFor="title" className="font-mono text-[10px] tracking-widest text-white/30">
          Title
        </label>
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
          className={`${field} font-serif text-xl`}
        />
      </div>

      {/* Category */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] tracking-widest text-white/30">Category</p>
          {categoryAuto && (
            <p className="font-mono text-[9px] tracking-wider text-white/20">auto-detected</p>
          )}
        </div>

        {/* Disambiguation prompt — shows when AI was uncertain */}
        {showDisambig && (
          <div
            className="rounded-xl px-3 py-2.5 space-y-2"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="font-mono text-[10px] text-white/45">
              Not 100% sure — is it a {CATEGORY_LABELS[selectedCategory]}, or one of these?
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {snapshot!.alternativeCategories!.map(cat => {
                const color = CATEGORY_COLORS[cat] ?? '#888'
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-full transition-colors duration-150"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${color}66`,
                      color: color,
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const color = CATEGORY_COLORS[cat]
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
                  className="chip chip-off block font-mono text-[11px] px-3 py-1.5 rounded-full"
                  style={
                    checked
                      ? {
                          background: `linear-gradient(180deg, ${color}f0 0%, ${color}cc 55%, ${color}e0 100%)`,
                          borderColor: color,
                          color: 'oklch(0.10 0.09 262)',
                          boxShadow: `0 3px 0 rgba(0,0,0,0.55), 0 5px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(0,0,0,0.18)`,
                        }
                      : { ['--chip-color' as string]: color }
                  }
                >
                  {CATEGORY_LABELS[cat]}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Note field */}
      <div className="space-y-1.5">
        <label htmlFor="note" className="font-mono text-[10px] tracking-widest text-white/30">
          Note — Optional
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder={suggestedNote ?? 'Why are you saving this?'}
          value={note}
          onChange={(e) => {
            noteTouched.current = true
            setSuggestedNote(null)
            setNote(e.target.value)
          }}
          className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white/45 focus:outline-none py-3 text-white/90 placeholder:text-white/22 transition-colors duration-200 text-base resize-none"
        />
        {suggestedNote && !note && (
          <p className="font-mono text-[10px] text-white/25 italic leading-relaxed">
            Suggested: {suggestedNote}
          </p>
        )}
      </div>

      {/* Visibility — Shared with household / Just me */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] tracking-widest text-white/30">Visibility</p>
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
                  className="chip chip-off block font-mono text-[11px] px-4 py-2.5 rounded-full text-center inline-flex items-center justify-center gap-1.5"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.06) 100%)',
                          borderColor: 'rgba(255,255,255,0.40)',
                          color: 'rgba(255,255,255,0.95)',
                          boxShadow: '0 3px 0 rgba(0,0,0,0.55), 0 5px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.32)',
                        }
                      : undefined
                  }
                >
                  {opt.icon === 'shared' ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      <div className="pt-2 flex justify-center">
        <button
          type="submit"
          className="chip chip-off font-mono text-[12px] tracking-wider px-10 py-3 rounded-full hover:!text-white active:scale-95 transition-transform"
        >
          Keep
        </button>
      </div>

    </form>
  )
}
