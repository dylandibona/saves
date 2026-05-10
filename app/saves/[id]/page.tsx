import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Nav } from '@/components/nav'
import { getSaveById } from '@/lib/data/saves'
import { getHouseholdId } from '@/lib/data/household'
import { CATEGORY_LABELS, CATEGORY_COLORS, formatRelativeTime } from '@/lib/utils/time'
import { getUserInitials, getUserColor } from '@/lib/utils/identity'
import { DeleteButton } from './delete-button'
import type { Metadata } from 'next'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    const save = await getSaveById(id)
    return { title: save.title }
  } catch {
    return { title: 'Save' }
  }
}

export default async function SaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const householdId = await getHouseholdId()

  let save
  try {
    save = await getSaveById(id)
  } catch {
    notFound()
  }

  if (!householdId || save.household_id !== householdId) notFound()

  const cat = save.category as SaveCategory
  const label = CATEGORY_LABELS[cat] ?? cat
  const color = CATEGORY_COLORS[cat] ?? '#888'

  // Coordinates from canonical_data
  const cd = save.canonical_data as { coords?: { lat: number; lng: number } } | null
  const coords = cd?.coords

  // Hostname for the URL chip
  let hostname: string | null = null
  if (save.canonical_url) {
    try { hostname = new URL(save.canonical_url).hostname.replace(/^www\./, '') } catch {}
  }

  return (
    <>
      <Nav />
      <main className="max-w-lg mx-auto px-6 py-8 space-y-8">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-white/30 hover:text-white/60 transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All Saves
        </Link>

        {/* Hero */}
        {save.hero_image_url && (
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-white/[0.08]">
            <Image
              src={save.hero_image_url}
              alt={save.title}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.10_0.08_262)] via-transparent to-transparent opacity-70" />
            {/* Color tint at bottom */}
            <div
              className="absolute inset-x-0 bottom-0 h-24"
              style={{ background: `linear-gradient(to top, ${color}28, transparent)` }}
            />
          </div>
        )}

        {/* Header block */}
        <header className="space-y-3">
          {/* Category + capture count */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-full"
              style={{
                background: `linear-gradient(180deg, ${color}f0 0%, ${color}cc 100%)`,
                border: `1px solid ${color}`,
                color: 'oklch(0.10 0.09 262)',
                boxShadow: `0 2px 0 rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.36)`,
              }}
            >
              {label}
            </span>
            {save.capture_count >= 2 && (
              <span className="font-mono text-[10px] text-white/35 tabular-nums">
                Saved {save.capture_count}×
              </span>
            )}
            {save.last_captured_at && (
              <span className="font-mono text-[10px] text-white/25 ml-auto">
                {formatRelativeTime(save.last_captured_at)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl text-white/92 leading-tight tracking-tight">
            {save.title}
          </h1>

          {/* Subtitle / address */}
          {(save.subtitle || save.location_address) && (
            <p className="text-sm text-white/45 leading-relaxed">
              {save.subtitle ?? save.location_address}
            </p>
          )}

          {/* Description (if richer text exists) */}
          {save.description && (
            <p className="text-[15px] text-white/65 leading-relaxed pt-1 max-w-prose">
              {save.description}
            </p>
          )}

          {/* Source URL */}
          {save.canonical_url && hostname && (
            <a
              href={save.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/35 hover:text-white/65 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              {hostname}
            </a>
          )}
        </header>

        {/* Action row */}
        <div className="flex gap-2 flex-wrap">
          {save.canonical_url && (
            <a
              href={save.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="chip chip-off font-mono text-[11px] px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:!text-white"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <path d="M15 3h6v6M10 14 21 3"/>
              </svg>
              Open
            </a>
          )}

          {coords && (
            <a
              href={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="chip chip-off font-mono text-[11px] px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:!text-white"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Open in Maps
            </a>
          )}

          <Link
            href="/map"
            className="chip chip-off font-mono text-[11px] px-4 py-2 rounded-full inline-flex items-center gap-1.5 hover:!text-white"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            View on Map
          </Link>

          {/* Delete — visually de-emphasized, opens confirmation modal */}
          <DeleteButton saveId={save.id} saveTitle={save.title} />
        </div>

        {/* Coordinates pill (subtle, informational) */}
        {coords && (
          <div className="font-mono text-[10px] text-white/25 tracking-wider tabular-nums">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </div>
        )}

        {/* Captures timeline */}
        {save.captures && save.captures.length > 0 && (
          <section className="space-y-4 pt-2">
            <h2 className="font-mono text-[10px] tracking-widest text-white/30">
              Captures
            </h2>
            <ol className="relative space-y-4">
              {/* Vertical thread */}
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/[0.07]" aria-hidden />

              {save.captures.map((capture) => {
                // Self captures: show user initials in user's color.
                // External recommenders (future): show recommender display_name + their color.
                const isSelf = capture.recommenders?.kind === 'self' || !capture.recommenders
                const user = capture.users
                const userInitials = user ? getUserInitials(user) : null
                const userColor = user ? getUserColor(user) : color
                const dotColor = isSelf ? userColor : (capture.recommenders?.color ?? color)
                const displayName = isSelf
                  ? (user?.display_name ?? userInitials ?? 'You')
                  : (capture.recommenders?.display_name ?? 'Unknown')

                return (
                  <li key={capture.id} className="relative pl-7">
                    {/* Initials chip OR dot */}
                    {isSelf && userInitials ? (
                      <span
                        className="absolute left-0 top-[2px] inline-flex items-center justify-center w-[22px] h-[22px] rounded-full font-mono text-[9px] tracking-wider tabular-nums"
                        style={{
                          background: `linear-gradient(180deg, ${userColor}cc 0%, ${userColor}88 100%)`,
                          border: `1px solid ${userColor}`,
                          color: 'oklch(0.10 0.09 262)',
                          boxShadow: `0 0 0 2px oklch(0.10 0.08 262), inset 0 1px 0 rgba(255,255,255,0.32), 0 2px 6px ${userColor}33`,
                        }}
                      >
                        {userInitials}
                      </span>
                    ) : (
                      <span
                        className="absolute left-[5px] top-[8px] w-[11px] h-[11px] rounded-full"
                        style={{
                          background: dotColor,
                          boxShadow: `0 0 0 2px oklch(0.10 0.08 262), 0 2px 6px ${dotColor}55`,
                        }}
                      />
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm text-white/82">{displayName}</span>
                        {capture.sources && (
                          <span className="font-mono text-[10px] text-white/30">
                            via {capture.sources.display_name}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-white/22 ml-auto">
                          {formatRelativeTime(capture.captured_at)}
                        </span>
                      </div>
                      {capture.note && (
                        <p className="text-[13px] text-white/55 leading-relaxed pt-1">
                          {capture.note}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* Variations (alt versions / cuts of a recipe etc.) */}
        {save.variations && save.variations.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="font-mono text-[10px] tracking-widest text-white/30">
              Variations
            </h2>
            <div className="space-y-2">
              {save.variations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl px-4 py-3 space-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <p className="font-serif text-base text-white/85">{v.label}</p>
                  {v.notes && (
                    <p className="text-[13px] text-white/45 leading-relaxed">{v.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </>
  )
}
