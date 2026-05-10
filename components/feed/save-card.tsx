import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils/time'
import type { SaveWithRecommenders } from '@/lib/data/saves'

function RecommenderDots({ captures }: { captures: SaveWithRecommenders['captures'] }) {
  const seen = new Set<string>()
  const recs = captures
    .flatMap(c => (c.recommenders ? [c.recommenders] : []))
    .filter(r => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return r.kind !== 'self' && r.color
    })
  if (recs.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {recs.slice(0, 5).map(r => (
        <span key={r.id} title={r.display_name}
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: r.color ?? '#666' }} />
      ))}
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
          <RecommenderDots captures={save.captures} />
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
