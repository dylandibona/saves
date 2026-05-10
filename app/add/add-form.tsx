'use client'

import { useRef, useState, useCallback, useTransition, useEffect } from 'react'
import { addSave } from './actions'
import { enrichUrl, type EnrichedUrl } from '@/lib/actions/enrich-url'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

const categories = Object.keys(CATEGORY_LABELS) as SaveCategory[]

const field =
  'w-full bg-transparent border-0 border-b border-white/15 focus:border-white/45 focus:outline-none py-3 text-white/90 placeholder:text-white/22 transition-colors duration-200 text-base'

// Source badge copy — no emoji, typographic markers only
function detectedBadge(enriched: EnrichedUrl): string {
  const cat = enriched.category ? CATEGORY_LABELS[enriched.category] : null
  const catPart = cat ? `${cat} · ` : ''

  if (enriched.source === 'google_maps') return `◈ ${catPart}Google Maps`
  if (enriched.source === 'ai') return `◎ ${catPart}Classified by AI`
  if (enriched.source === 'og') return `◉ ${catPart}Fetched from page`
  return `○ ${catPart}Detected`
}

export function AddForm({ initialUrl = '' }: { initialUrl?: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  // Enrichment state
  const [isPending, startTransition] = useTransition()
  const [enriched, setEnriched] = useState<EnrichedUrl | null>(null)

  // Track whether the user has manually typed into title / note / url
  const titleTouched = useRef(false)
  const noteTouched = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Controlled inputs so we can pre-fill them
  const [url, setUrl] = useState(initialUrl)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SaveCategory>(categories[0])
  const [categoryAuto, setCategoryAuto] = useState(false)
  const [suggestedNote, setSuggestedNote] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Whether to show the disambiguation prompt for category
  const showDisambig =
    enriched &&
    enriched.alternativeCategories &&
    enriched.alternativeCategories.length > 0 &&
    enriched.confidence !== 'high' &&
    categoryAuto

  const runEnrichment = useCallback((urlToEnrich: string) => {
    if (!urlToEnrich.startsWith('http')) return

    startTransition(async () => {
      try {
        const result = await enrichUrl(urlToEnrich)

        setEnriched(result)
        setCoords(result.coords)

        // If the URL was a shortened maps link that resolved to a longer URL,
        // update the input field so the user sees the canonical form.
        if (result.canonicalUrl && result.canonicalUrl !== urlToEnrich) {
          setUrl(result.canonicalUrl)
        }

        // Pre-fill title only if user hasn't typed
        if (!titleTouched.current && result.title) {
          setTitle(result.title)
        }

        // Pre-select category if confidence is high or medium
        if (result.category && (result.confidence === 'high' || result.confidence === 'medium')) {
          setSelectedCategory(result.category)
          setCategoryAuto(true)
        }

        // Suggested note — ghost text
        if (!noteTouched.current && result.note) {
          setSuggestedNote(result.note)
        }
      } catch {
        // Enrichment is non-blocking — fail silently
      }
    })
  }, [])

  const handleUrlChange = useCallback(
    (next: string) => {
      setUrl(next)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => runEnrichment(next), 300)
    },
    [runEnrichment]
  )

  // If we land on this page with ?url=... (from PWA share / iOS shortcut), enrich immediately
  useEffect(() => {
    if (initialUrl && initialUrl.startsWith('http')) {
      runEnrichment(initialUrl)
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const heroImage = enriched?.imageUrl ?? null
  const subtitle = enriched?.subtitle ?? null

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
          onBlur={(e) => runEnrichment(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            handleUrlChange(pasted)
          }}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
        {/* Status row */}
        {isPending && (
          <p className="font-mono text-[10px] text-white/30 animate-pulse">Detecting…</p>
        )}
        {!isPending && enriched && (
          <p className="font-mono text-[10px] text-white/40">{detectedBadge(enriched)}</p>
        )}
      </div>

      {/* Enrichment preview — hero image + subtitle, surfaces what we pulled */}
      {(heroImage || subtitle) && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {heroImage && (
            <div className="relative aspect-[16/9] overflow-hidden bg-white/[0.03]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.10_0.08_262)]/30 to-transparent" />
            </div>
          )}
          {subtitle && (
            <div className="px-4 py-3">
              <p className="text-[13px] text-white/55 leading-relaxed line-clamp-3">{subtitle}</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden enrichment fields forwarded to addSave */}
      <input type="hidden" name="coords" value={coords ? JSON.stringify(coords) : ''} />
      <input type="hidden" name="subtitle" value={subtitle ?? ''} />
      <input type="hidden" name="hero_image_url" value={heroImage ?? ''} />
      <input type="hidden" name="location_address" value={enriched?.subtitle ?? ''} />

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

        {/* Disambiguation prompt — only shows when enrichment was uncertain */}
        {showDisambig && (
          <div
            className="rounded-xl px-3 py-2.5 space-y-2"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="font-mono text-[10px] text-white/45">
              Not 100% sure — is it a {CATEGORY_LABELS[selectedCategory]}, or one of these?
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {enriched.alternativeCategories!.map(cat => {
                const color = CATEGORY_COLORS[cat] ?? '#888'
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat)
                    }}
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
                    setCategoryAuto(false)  // user override; hide disambig
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

      <div className="pt-2 flex justify-center">
        <button
          type="submit"
          className="chip chip-off font-mono text-[12px] tracking-wider px-10 py-3 rounded-full hover:!text-white active:scale-95 transition-transform"
        >
          Save It
        </button>
      </div>

    </form>
  )
}
