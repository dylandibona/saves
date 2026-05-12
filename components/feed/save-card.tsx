import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, CATEGORY_LABELS } from '@/lib/utils/time'
import { getUserInitials, getUserColor } from '@/lib/utils/identity'
import type { SaveWithRecommenders } from '@/lib/data/saves'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Save card — compact horizontal row, 88px tall.
 *
 * Layout: square thumbnail on the left (88×88), text block on the right.
 * Title is the loudest element; below it sits a quiet meta row with a 6px
 * category dot, the category label, and the last-captured relative time.
 *
 * When no hero image exists, the thumbnail becomes a typographic bookplate
 * (surface-2 ground + mono category label + tiny initial of the title).
 *
 * Recommender identity, capture count, and the private-lock state all live
 * on the thumbnail as small badges so the text region stays calm.
 */

const ROW_H = 88
const THUMB = 88

function SaverPill({ users }: { users: NonNullable<SaveWithRecommenders['captures'][number]['users']>[] }) {
  if (users.length === 0) return null
  const visible = users.slice(0, 2)
  return (
    <div className="flex -space-x-1">
      {visible.map(u => {
        const initials = getUserInitials(u)
        const color = getUserColor(u)
        return (
          <span
            key={u.id}
            title={u.display_name ?? u.email}
            className="grid place-items-center text-[9px] font-semibold tabular-nums rounded-full"
            style={{
              width: '18px',
              height: '18px',
              background: color,
              color: 'var(--color-bg)',
              border: '1.5px solid var(--color-surface)',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.01em',
            }}
          >
            {initials}
          </span>
        )
      })}
    </div>
  )
}

function uniqueSavers(captures: SaveWithRecommenders['captures']) {
  const seen = new Set<string>()
  return captures
    .map(c => c.users)
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .filter(u => {
      if (seen.has(u.id)) return false
      seen.add(u.id)
      return true
    })
}

export function SaveCard({ save }: { save: SaveWithRecommenders }) {
  const category = save.category as SaveCategory
  const label = CATEGORY_LABELS[category] ?? category
  const savers = uniqueSavers(save.captures)
  const hasImage = Boolean(save.hero_image_url)
  const isPrivate = save.visibility === 'private'

  return (
    <Link
      href={`/saves/${save.id}`}
      aria-label={save.title}
      className="group relative flex items-stretch overflow-hidden transition-colors duration-150"
      style={{
        height: `${ROW_H}px`,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Thumbnail — image or bookplate */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: `${THUMB}px`,
          height: `${THUMB}px`,
          background: hasImage ? 'var(--color-bg)' : 'var(--color-surface-2)',
        }}
      >
        {hasImage ? (
          <Image
            src={save.hero_image_url!}
            alt=""
            fill
            sizes="88px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span
              className="font-serif italic"
              style={{
                fontSize: '32px',
                color: `var(--color-cat-${category})`,
                lineHeight: 1,
              }}
            >
              {save.title.trim().charAt(0).toUpperCase() || '◎'}
            </span>
          </div>
        )}

        {/* Capture count — top left, only when 2+ */}
        {save.capture_count >= 2 && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 rounded-full text-[9px] font-mono tabular-nums backdrop-blur-md leading-[14px]"
            style={{
              background: 'oklch(0.14 0.005 95 / 0.78)',
              color: 'var(--color-bone)',
              height: '14px',
            }}
          >
            {save.capture_count}×
          </span>
        )}

        {/* Private lock — bottom right of thumb */}
        {isPrivate && (
          <span
            className="absolute bottom-1.5 right-1.5 grid place-items-center rounded-full backdrop-blur-md"
            style={{
              width: '18px',
              height: '18px',
              background: 'oklch(0.14 0.005 95 / 0.72)',
            }}
            aria-label="Private save"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-bone)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
        )}
      </div>

      {/* Text region */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-4 py-2.5">
        <h3
          className="text-[15px] leading-[1.25] line-clamp-2"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--color-paper)',
            textWrap: 'pretty',
          }}
        >
          {save.title}
        </h3>

        {/* Meta row — category dot + label, then time + savers on the right */}
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-mute)' }}>
          <span
            aria-hidden
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '999px',
              background: `var(--color-cat-${category})`,
              flexShrink: 0,
            }}
          />
          <span className="uppercase tracking-[0.09em] font-medium truncate">
            {label}
          </span>
          {save.last_captured_at && (
            <>
              <span aria-hidden style={{ opacity: 0.5 }}>·</span>
              <span className="shrink-0">{formatRelativeTime(save.last_captured_at)}</span>
            </>
          )}
          {savers.length > 0 && (
            <span className="ml-auto pl-2 shrink-0">
              <SaverPill users={savers} />
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
