import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import { getUserInitials, getUserColor } from '@/lib/utils/identity'
import type { SaveWithRecommenders } from '@/lib/data/saves'

/**
 * Pills showing who in the household saved this — distinct from external
 * recommenders (Sprint 2). For now: the unique users from this save's
 * captures, each rendered as a small initials chip in their own color.
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
    <div className="flex items-center gap-1">
      {savers.slice(0, 3).map(u => {
        const initials = getUserInitials(u)
        const color = getUserColor(u)
        return (
          <span
            key={u.id}
            title={u.display_name ?? u.email}
            className="inline-flex items-center justify-center font-mono text-[9px] tracking-wider tabular-nums w-5 h-5 rounded-full"
            style={{
              background: `linear-gradient(180deg, ${color}cc 0%, ${color}88 100%)`,
              border: `1px solid ${color}`,
              color: 'oklch(0.10 0.09 262)',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.32), 0 1px 0 rgba(0,0,0,0.5)`,
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
  const label  = CATEGORY_LABELS[save.category]  ?? save.category
  const color  = CATEGORY_COLORS[save.category]  ?? '#888'

  return (
    <Link
      href={`/saves/${save.id}`}
      className="group flex items-start gap-4 py-5 -mx-4 px-4 rounded-2xl transition-all duration-200 hover:bg-white/[0.045]"
    >
      {/* Jewel accent bar */}
      <div className="absolute left-0 w-0.5 self-stretch rounded-full my-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
           style={{ backgroundColor: color }} />

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Category */}
        <p className="font-mono text-[10px] font-semibold tracking-wider"
           style={{ color }}>
          {label}
        </p>

        {/* Title */}
        <p className="font-serif text-[17px] leading-snug text-white/90 line-clamp-2">
          {save.visibility === 'private' && (
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.32)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              className="inline-block mr-1.5 align-baseline relative -top-px"
              aria-label="Private save"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          )}
          {save.title}
        </p>

        {/* Subtitle */}
        {save.subtitle && (
          <p className="text-sm text-white/45 line-clamp-1 leading-snug">
            {save.subtitle}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 pt-0.5">
          <SaverPills captures={save.captures} />
          {save.capture_count >= 2 && (
            <span className="font-mono text-[10px] text-white/30 tabular-nums">
              {save.capture_count}×
            </span>
          )}
          {save.last_captured_at && (
            <span className="font-mono text-[10px] text-white/25 ml-auto">
              {formatRelativeTime(save.last_captured_at)}
            </span>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      {save.hero_image_url && (
        <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden ring-1 ring-white/[0.10] bg-white/10">
          <Image src={save.hero_image_url} alt="" width={64} height={64}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />
        </div>
      )}
    </Link>
  )
}
