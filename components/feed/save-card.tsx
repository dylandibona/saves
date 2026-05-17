import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, CATEGORY_LABELS } from '@/lib/utils/time'
import { getUserInitials } from '@/lib/utils/identity'
import type { SaveWithRecommenders } from '@/lib/data/saves'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Save card — Stratum v2.
 *
 * A glyph-shaped pill row: 2px tinted leading edge on the left (full
 * height minus 10px top/bottom), 52×52 thumbnail, then a text column
 * with a mono meta line (CATEGORY · 21H · DD · [lock]), 13.5px sans
 * title (2-line clamp), and a single-line description in 50% paper.
 *
 * No saver avatar pill — identity is part of the mono meta line.
 */

const THUMB = 52

function trimAgo(s: string): string {
  // "21h ago" → "21h", "just now" → "now"
  if (!s) return ''
  if (s === 'just now') return 'now'
  return s.replace(/\s+ago$/, '')
}

function firstSaverInitials(captures: SaveWithRecommenders['captures']): string | null {
  for (const c of captures) {
    if (c.users) return getUserInitials(c.users)
  }
  return null
}

export function SaveCard({ save }: { save: SaveWithRecommenders }) {
  const category = save.category as SaveCategory
  const label = CATEGORY_LABELS[category] ?? category
  const tone = `var(--color-cat-${category})`
  // Prefer our persisted Storage copy; fall back to the original URL while
  // hero_image_storage_path is still null (backfill not yet run for this save,
  // or persistence failed).
  const heroSrc = save.hero_image_storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/hero-images/${save.hero_image_storage_path}`
    : save.hero_image_url
  const hasImage = Boolean(heroSrc)
  const isPrivate = save.visibility === 'private'
  const initials = firstSaverInitials(save.captures)
  const when = save.last_captured_at ? trimAgo(formatRelativeTime(save.last_captured_at)) : ''
  const description = save.description ?? save.subtitle ?? ''

  return (
    <Link
      href={`/saves/${save.id}`}
      aria-label={save.title}
      className="group relative block overflow-hidden"
      style={{
        marginBottom: 6,
        borderRadius: 4,
        padding: '10px 12px 10px 16px',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: '0.5px solid rgba(244,243,239,0.06)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
      }}
    >
      {/* Leading 2px tinted edge — full height minus 10px top/bottom */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: 0,
          top: 10,
          bottom: 10,
          width: 2,
          borderRadius: 999,
          background: tone,
          boxShadow: `0 0 10px ${tone}`,
        }}
      />

      <div className="flex items-center" style={{ gap: 11 }}>
        {/* Thumbnail — 52×52, radius 4 */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: THUMB,
            height: THUMB,
            borderRadius: 4,
            background: hasImage ? 'var(--color-bg)' : 'var(--color-surface-2)',
            boxShadow:
              'inset 0 0 0 0.5px rgba(255,255,255,0.08), 0 4px 10px rgba(0,0,0,0.3)',
          }}
        >
          {hasImage ? (
            <Image
              src={heroSrc!}
              alt=""
              fill
              sizes="52px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span
                style={{
                  fontFamily: 'var(--font-serif), ui-serif, Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: '24px',
                  color: tone,
                  lineHeight: 1,
                }}
              >
                {save.title.trim().charAt(0).toUpperCase() || '·'}
              </span>
            </div>
          )}
          {/* Subtle bottom-darken sheen, matching the reference. */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)',
            }}
          />
        </div>

        {/* Text column */}
        <div className="min-w-0 flex-1">
          {/* Mono meta line — CATEGORY · 21H · DD · [lock] */}
          <div
            className="flex items-center"
            style={{
              gap: 6,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 8.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: tone }}>{label}</span>
            {when && (
              <>
                <span aria-hidden style={{ color: 'rgba(244,243,239,0.25)' }}>·</span>
                <span style={{ color: 'rgba(244,243,239,0.5)' }}>{when}</span>
              </>
            )}
            {initials && (
              <>
                <span aria-hidden style={{ color: 'rgba(244,243,239,0.25)' }}>·</span>
                <span style={{ color: 'rgba(244,243,239,0.5)' }}>{initials}</span>
              </>
            )}
            {isPrivate && (
              <>
                <span aria-hidden style={{ color: 'rgba(244,243,239,0.25)' }}>·</span>
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 9 9"
                  fill="none"
                  style={{ opacity: 0.55 }}
                  aria-label="Private save"
                >
                  <path
                    d="M2 4V3a2.5 2.5 0 015 0v1m-6 0h7v4H1V4z"
                    stroke="rgba(244,243,239,0.8)"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </div>

          {/* Title — Instrument Sans 500, 2-line clamp */}
          <h3
            className="line-clamp-2"
            style={{
              marginTop: 3,
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 13.5,
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: '-0.012em',
              color: 'var(--color-paper)',
              textWrap: 'pretty',
            }}
          >
            {save.title}
          </h3>

          {/* Description — single-line, 50% paper */}
          {description && (
            <div
              className="truncate"
              style={{
                marginTop: 2,
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                fontSize: 11,
                color: 'rgba(244,243,239,0.5)',
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
