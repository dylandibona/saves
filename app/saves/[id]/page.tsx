import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSaveById } from '@/lib/data/saves'
import { getHouseholdId } from '@/lib/data/household'
import { CATEGORY_LABELS, CATEGORY_COLORS, formatRelativeTime } from '@/lib/utils/time'
import { getUserInitials } from '@/lib/utils/identity'
import { ExtractedSection } from '@/components/saves/extracted-section'
import { OptionsPopup } from './options-popup'
import type { ExtractedData } from '@/lib/enrichment/enrich'
import type { Metadata } from 'next'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const save = await getSaveById(id)
    return { title: save.title }
  } catch {
    return { title: 'Save' }
  }
}

function captionFor(method: string | null | undefined): string {
  switch (method) {
    case 'reel':
    case 'instagram':
      return 'kept this from a reel.'
    case 'tiktok':
      return 'kept this from a TikTok.'
    case 'maps':
      return 'kept this from Google Maps.'
    case 'email':
      return 'kept this from an email.'
    case 'sms':
      return 'kept this from a text.'
    case 'shortcut':
      return 'kept this via the iOS Shortcut.'
    case 'share':
    case 'pwa-share':
      return 'kept this from the share sheet.'
    case 'manual':
      return 'kept this manually.'
    default:
      return 'kept this.'
  }
}

export default async function SaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
  const tone = CATEGORY_COLORS[cat] ?? 'oklch(0.78 0.02 100)'

  // canonical_data: coords + per-category structured extracted data
  const cd = save.canonical_data as {
    coords?: { lat: number; lng: number }
    extracted?: ExtractedData
  } | null
  const extracted = cd?.extracted

  // Source hostname (or place subtitle) for the source line
  let sourceLabel: string | null = null
  if (save.canonical_url) {
    try {
      sourceLabel = new URL(save.canonical_url).hostname.replace(/^www\./, '')
    } catch {
      // fall through
    }
  }
  if (!sourceLabel && save.subtitle) sourceLabel = save.subtitle

  // Captures — newest first; the freshest note (with a non-empty text) is the
  // editorial NOTE block; the timeline below shows every capture as a row.
  const captures = (save.captures ?? []).slice().sort((a, b) => {
    return (
      new Date(b.captured_at ?? 0).getTime() - new Date(a.captured_at ?? 0).getTime()
    )
  })
  const headlineCapture = captures.find((c) => c.note && c.note.trim().length > 0)
  const headlineSaverInitials = headlineCapture?.users
    ? getUserInitials(headlineCapture.users)
    : null

  // Saver initials for meta row — most recent capture's user
  const latest = captures[0]
  const latestSaverInitials = latest?.users ? getUserInitials(latest.users) : null

  // Kept time
  const keptLabel = save.last_captured_at
    ? formatRelativeTime(save.last_captured_at).replace(/\s+ago$/i, '').toUpperCase()
    : null

  return (
    <main
      className="relative w-full"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-paper)',
      }}
    >
      {/* Scrollable body. Generous bottom-pad to clear the floating footer. */}
      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 116px)' }}>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: 184,
            background: save.hero_image_url
              ? `center / cover no-repeat url("${save.hero_image_url}")`
              : `linear-gradient(135deg, color-mix(in oklab, ${tone} 22%, var(--color-bg)) 0%, var(--color-bg) 70%)`,
            boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.06)',
          }}
        >
          {/* darkening gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)',
            }}
          />
          {/* Back chip */}
          <Link
            href="/"
            aria-label="Back to library"
            className="inline-flex items-center justify-center"
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: 36,
              height: 36,
              borderRadius: 4,
              background: 'rgba(8,8,11,0.55)',
              backdropFilter: 'blur(20px) saturate(170%)',
              WebkitBackdropFilter: 'blur(20px) saturate(170%)',
              border: '0.5px solid rgba(244,243,239,0.18)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
              color: 'var(--color-paper)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path
                d="M8.5 3L4.5 7L8.5 11"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          {/* KEPT stamp */}
          {keptLabel && (
            <div
              className="font-mono inline-flex items-center gap-1.5"
              style={{
                position: 'absolute',
                right: 14,
                bottom: 12,
                fontSize: 8.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: tone,
                padding: '4px 7px',
                background: `color-mix(in oklab, ${tone} 18%, rgba(0,0,0,0.6))`,
                border: `0.5px solid ${tone}`,
                borderRadius: 4,
              }}
            >
              <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
                <path
                  d="M1.5 4.5L3.5 6.5L7.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {`KEPT ${keptLabel} AGO`}
            </div>
          )}
        </div>

        {/* ── Meta row ────────────────────────────────────────────────────── */}
        <div
          className="font-mono"
          style={{
            padding: '18px 18px 0',
            fontSize: 9.5,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: tone }}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 1,
                background: tone,
                boxShadow: `0 0 8px ${tone}`,
              }}
            />
            {label}
          </span>
          {latestSaverInitials && (
            <>
              <span style={{ color: 'rgba(244,243,239,0.25)' }}>·</span>
              <span style={{ color: 'var(--color-mute)' }}>{latestSaverInitials}</span>
            </>
          )}
          {save.last_captured_at && (
            <>
              <span style={{ color: 'rgba(244,243,239,0.25)' }}>·</span>
              <span style={{ color: 'var(--color-mute)' }}>
                {formatRelativeTime(save.last_captured_at).replace(/\s+ago$/i, '')}
              </span>
            </>
          )}
          {save.visibility === 'private' && (
            <>
              <span style={{ color: 'rgba(244,243,239,0.25)' }}>·</span>
              <span
                style={{ color: 'var(--color-mute)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Private
              </span>
            </>
          )}
        </div>

        {/* ── Title ───────────────────────────────────────────────────────── */}
        <h1
          className="font-serif-display"
          style={{
            margin: '8px 18px 0',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 36,
            lineHeight: 1.0,
            letterSpacing: '-0.025em',
            color: 'var(--color-paper)',
            textWrap: 'balance',
          }}
        >
          {save.title}
        </h1>

        {/* ── Source line ─────────────────────────────────────────────────── */}
        {sourceLabel && (
          <div
            className="font-mono"
            style={{
              margin: '14px 18px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: 'var(--color-mute)',
              letterSpacing: '0.04em',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M5 7l-2 2a2.1 2.1 0 11-3-3l2-2M7 5l2-2a2.1 2.1 0 113 3l-2 2M4 8l4-4"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {save.canonical_url ? (
              <a
                href={save.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit' }}
              >
                {sourceLabel}
              </a>
            ) : (
              <span>{sourceLabel}</span>
            )}
          </div>
        )}

        {/* ── NOTE block ──────────────────────────────────────────────────── */}
        {headlineCapture?.note && (
          <div
            style={{
              margin: '18px 18px 0',
              padding: '12px 14px',
              borderLeft: `2px solid ${tone}`,
              background: `color-mix(in oklab, ${tone} 6%, transparent)`,
              borderRadius: 4,
            }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: 9,
                color: 'var(--color-mute)',
                letterSpacing: '0.14em',
                marginBottom: 4,
                textTransform: 'uppercase',
              }}
            >
              NOTE{headlineSaverInitials ? ` — ${headlineSaverInitials}` : ''}
            </div>
            <div
              className="font-serif-display"
              style={{
                fontStyle: 'italic',
                fontSize: 15,
                lineHeight: 1.3,
                color: 'rgba(244,243,239,0.85)',
              }}
            >
              {`“${headlineCapture.note}”`}
            </div>
          </div>
        )}

        {/* ── EXTRACTED summary + per-category lists ──────────────────────── */}
        {extracted && Object.keys(extracted).length > 0 && (
          <ExtractedSection category={cat} extracted={extracted} tone={tone} />
        )}

        {/* If there's no extracted data but there's a description, surface it
            so the page still has body. */}
        {(!extracted || Object.keys(extracted).length === 0) && save.description && (
          <section style={{ margin: '22px 18px 0' }}>
            <p
              style={{
                fontSize: 13.5,
                color: 'rgba(244,243,239,0.82)',
                lineHeight: 1.55,
              }}
            >
              {save.description}
            </p>
          </section>
        )}

        {/* ── Captures timeline ───────────────────────────────────────────── */}
        {captures.length > 0 && (
          <section style={{ margin: '24px 18px 0' }}>
            <div
              className="font-mono"
              style={{
                fontSize: 9,
                color: 'var(--color-mute)',
                letterSpacing: '0.16em',
                paddingBottom: 8,
                borderBottom: '1px solid var(--color-hairline)',
              }}
            >
              CAPTURED
            </div>
            <ol>
              {captures.map((capture) => {
                const isSelf =
                  capture.recommenders?.kind === 'self' || !capture.recommenders
                const user = capture.users
                const initials = user ? getUserInitials(user) : null
                const displayName = isSelf
                  ? user?.display_name ?? initials ?? 'You'
                  : capture.recommenders?.display_name ?? 'Someone'
                const t = formatRelativeTime(capture.captured_at)
                  .replace(/\s+ago$/i, '')
                  .toUpperCase()
                return (
                  <li
                    key={capture.id}
                    style={{
                      padding: '10px 0',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 10,
                      fontSize: 12.5,
                      color: 'rgba(244,243,239,0.78)',
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: 'var(--color-mute)',
                        letterSpacing: '0.14em',
                        minWidth: 28,
                      }}
                    >
                      {t}
                    </span>
                    <span>
                      <span style={{ color: 'var(--color-paper)', fontWeight: 500 }}>
                        {displayName}
                      </span>{' '}
                      {captionFor(capture.capture_method)}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </div>

      {/* ── Footer (action capsule + Options popup) ───────────────────────── */}
      <OptionsPopup
        saveId={save.id}
        saveTitle={save.title}
        canonicalUrl={save.canonical_url ?? null}
        categoryTone={tone}
      />
    </main>
  )
}
