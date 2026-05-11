import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import { getUserInitials, getUserColor } from '@/lib/utils/identity'
import type { SaveWithRecommenders } from '@/lib/data/saves'

/**
 * Pills showing who in the household saved this. One per unique user
 * from this save's captures, rendered as a small initials chip in their
 * own color. Distinct from external recommenders (Sprint 2).
 */
function SaverPills({ captures }: { captures: SaveWithRecommenders['captures'] }) {
  const seen = new Set<string>()
  const savers = captures
    .map(c => c.users)
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .filter(u => {
      if (seen.has(u.id)) return false
      seen.add(u.id)
      return true
    })

  if (savers.length === 0) return null

  return (
    <div className="flex items-center -space-x-1">
      {savers.slice(0, 3).map(u => {
        const initials = getUserInitials(u)
        const color = getUserColor(u)
        return (
          <span
            key={u.id}
            title={u.display_name ?? u.email}
            className="inline-flex items-center justify-center text-[10px] font-semibold tabular-nums w-6 h-6 rounded-full"
            style={{
              background: color,
              color: 'oklch(0.10 0.005 240)',
              border: `2px solid oklch(0.10 0.005 240)`,
            }}
          >
            {initials}
          </span>
        )
      })}
    </div>
  )
}

export function SaveCard({ save }: { save: SaveWithRecommenders }) {
  const label = CATEGORY_LABELS[save.category] ?? save.category
  const color = CATEGORY_COLORS[save.category] ?? '#888'

  return (
    <Link
      href={`/saves/${save.id}`}
      className="group block rounded-2xl transition-all duration-200"
      style={{
        background: 'oklch(0.13 0.006 240)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-stretch gap-0 p-4 group-hover:bg-white/[0.015] rounded-2xl transition-colors duration-200">
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Category — solid color chip, more confident than the old colored-text-only treatment */}
          <div className="flex items-center gap-2">
            <span
              className="inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md"
              style={{
                background: `${color}22`,
                color,
              }}
            >
              {label}
            </span>
            {save.visibility === 'private' && (
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.38)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                aria-label="Private save"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </div>

          {/* Title — bold sans, larger, higher contrast */}
          <h3
            className="text-[17px] leading-tight text-white line-clamp-2"
            style={{ fontWeight: 600, letterSpacing: '-0.01em' }}
          >
            {save.title}
          </h3>

          {/* Subtitle */}
          {save.subtitle && (
            <p className="text-[13px] text-white/55 line-clamp-2 leading-relaxed">
              {save.subtitle}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 pt-1">
            <SaverPills captures={save.captures} />
            {save.capture_count >= 2 && (
              <span className="text-[11px] text-white/45 tabular-nums font-medium">
                {save.capture_count}×
              </span>
            )}
            {save.last_captured_at && (
              <span className="text-[11px] text-white/35 ml-auto font-medium">
                {formatRelativeTime(save.last_captured_at)}
              </span>
            )}
          </div>
        </div>

        {/* Hero thumbnail — larger and more confident than the old 16×16 chip */}
        {save.hero_image_url && (
          <div
            className="shrink-0 w-20 h-20 ml-4 rounded-xl overflow-hidden bg-white/[0.04]"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Image
              src={save.hero_image_url}
              alt=""
              width={80}
              height={80}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
      </div>
    </Link>
  )
}
