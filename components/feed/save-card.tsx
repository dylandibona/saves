import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, CATEGORY_LABELS } from '@/lib/utils/time'
import { getUserInitials, getUserColor } from '@/lib/utils/identity'
import type { SaveWithRecommenders } from '@/lib/data/saves'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Save card — photo-led, full-bleed image, bookplate fallback when no image.
 * See docs/component-specs.md §1 and docs/design-direction.md §4.
 *
 * The save IS the card — no chrome. Category appears as a 6px dot beside the
 * title, never as a left-border accent strip (huashu anti-slop §6.2). The
 * recommender identity pill sits in the top-right corner of the image, with
 * dark text on saturated color (component-specs §11 "120% detail").
 */

function categoryDotVar(cat: SaveCategory): string {
  return `var(--color-cat-${cat})`
}

function SaverPill({ users }: { users: NonNullable<SaveWithRecommenders['captures'][number]['users']>[] }) {
  if (users.length === 0) return null
  const visible = users.slice(0, 2)

  return (
    <div className="flex -space-x-1.5">
      {visible.map(u => {
        const initials = getUserInitials(u)
        const color = getUserColor(u)
        return (
          <span
            key={u.id}
            title={u.display_name ?? u.email}
            className="grid place-items-center text-[10px] font-semibold tabular-nums tracking-wide rounded-full"
            style={{
              width: '24px',
              height: '24px',
              background: color,
              color: 'var(--color-bg)',
              border: '2px solid var(--color-surface)',
              fontFamily: 'var(--font-sans)',
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

  return (
    <Link
      href={`/saves/${save.id}`}
      aria-label={save.title}
      className="group relative block overflow-hidden transition-transform duration-300 ease-out hover:scale-[1.005] active:scale-[0.995]"
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Image region — full bleed, OR bookplate fallback */}
      {hasImage ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 11' }}>
          <Image
            src={save.hero_image_url!}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 760px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />

          {/* Identity pill — top right */}
          {savers.length > 0 && (
            <div className="absolute top-3 right-3">
              <SaverPill users={savers} />
            </div>
          )}

          {/* Capture-count badge — top left when 2+ */}
          {save.capture_count >= 2 && (
            <span
              className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums backdrop-blur-md"
              style={{
                background: 'oklch(0.14 0.005 95 / 0.70)',
                color: 'var(--color-bone)',
              }}
            >
              {save.capture_count}×
            </span>
          )}

          {/* Private lock — bottom right of image */}
          {save.visibility === 'private' && (
            <span
              className="absolute bottom-3 right-3 grid place-items-center rounded-full backdrop-blur-md"
              style={{
                width: '24px',
                height: '24px',
                background: 'oklch(0.14 0.005 95 / 0.70)',
              }}
              aria-label="Private save"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-bone)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          )}
        </div>
      ) : (
        /* Bookplate fallback — typographic treatment, no stock photo, no SVG fallback illustration */
        <div
          className="relative w-full flex flex-col justify-between p-5"
          style={{
            aspectRatio: '16 / 11',
            background: 'var(--color-surface-2)',
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.18em] text-[10px]"
            style={{ color: 'var(--color-mute)' }}
          >
            {label}
          </span>
          <h3
            className="font-display"
            style={{
              fontSize: '24px',
              color: 'var(--color-paper)',
              lineHeight: 1.1,
            }}
          >
            {save.title}
          </h3>
          {savers.length > 0 && (
            <div className="absolute top-3 right-3">
              <SaverPill users={savers} />
            </div>
          )}
          {save.visibility === 'private' && (
            <span
              className="absolute bottom-3 right-3 grid place-items-center rounded-full"
              style={{
                width: '24px',
                height: '24px',
                background: 'oklch(0.14 0.005 95 / 0.50)',
              }}
              aria-label="Private save"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-bone)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          )}
        </div>
      )}

      {/* Text region (only when there's an image — bookplate has its own copy) */}
      {hasImage && (
        <div className="px-4 py-3">
          <h3
            className="text-[17px] leading-[1.25] line-clamp-2"
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

          {save.subtitle && (
            <p
              className="text-[13px] line-clamp-1 mt-1"
              style={{ color: 'var(--color-mute)' }}
            >
              {save.subtitle}
            </p>
          )}

          {/* Meta row — category dot + label + relative time */}
          <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-mute)' }}>
            <span
              aria-hidden
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '999px',
                background: categoryDotVar(category),
                flexShrink: 0,
              }}
            />
            <span className="uppercase tracking-[0.08em] text-[11px] font-medium">
              {label}
            </span>
            {save.last_captured_at && (
              <span className="ml-auto">{formatRelativeTime(save.last_captured_at)}</span>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}
