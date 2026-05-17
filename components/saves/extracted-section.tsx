import type { ExtractedData } from '@/lib/enrichment/enrich'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Stratum v2 extracted display.
 *
 * Two visual zones:
 *   1. The EXTRACTED summary row — a left-bordered block with inline
 *      mono pairs (e.g. `25 MIN · 50g PROTEIN · 4 SERVES`). 2-4 keys per
 *      category, chosen for at-a-glance recall.
 *   2. Per-category structured lists below (ingredients, instructions,
 *      exercises, place details, article summary, etc.).
 *
 * Both zones are independently optional. If `summaryItems` is empty the
 * top block hides; if no list applies the bottom hides.
 */

// ─── Summary pairs per category ───────────────────────────────────────────────

type Pair = { value: string; label: string }

function asString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  return null
}

function pickSummary(category: SaveCategory, e: ExtractedData): Pair[] {
  const out: Pair[] = []

  const push = (value: string | null | undefined, label: string) => {
    const v = asString(value)
    if (v) out.push({ value: v, label })
  }

  switch (category) {
    case 'recipe': {
      if (e.totalTime) push(e.totalTime, 'TIME')
      if (e.servings) push(String(e.servings), 'SERVES')
      if (e.ingredients?.length) push(String(e.ingredients.length), 'INGREDIENTS')
      break
    }
    case 'workout': {
      if (e.duration) push(e.duration, 'DURATION')
      if (e.exercises?.length) push(String(e.exercises.length), 'EXERCISES')
      if (e.equipment?.[0]) push(`WITH ${e.equipment[0].toUpperCase()}`, '')
      break
    }
    case 'article':
    case 'book': {
      if (e.readTime) push(e.readTime, 'READ')
      if (e.author) push(`BY ${e.author.toUpperCase()}`, '')
      if (e.publishedAt) push(e.publishedAt, '')
      break
    }
    case 'movie':
    case 'tv': {
      if (e.year) push(String(e.year), '')
      if (e.runtime) push(e.runtime, 'MIN')
      if (e.director) push(`BY ${e.director.toUpperCase()}`, '')
      break
    }
    case 'restaurant':
    case 'hotel':
    case 'place': {
      if (e.priceLevel) push(e.priceLevel, '')
      if (e.hours) push(e.hours, '')
      if (e.phone) push(e.phone, '')
      break
    }
    case 'product': {
      if (e.brand) push(e.brand, '')
      if (e.price) push(e.price, '')
      break
    }
    case 'podcast':
    case 'music': {
      if (e.showName) push(e.showName, '')
      if (e.episodeNumber) push(`#${e.episodeNumber}`, '')
      if (e.artist) push(e.artist, '')
      break
    }
    default:
      break
  }

  return out
}

function countExtractedItems(e: ExtractedData): number {
  let n = 0
  for (const v of Object.values(e)) {
    if (v == null || v === '') continue
    if (Array.isArray(v)) n += v.length
    else n += 1
  }
  return n
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono"
      style={{
        fontSize: 9,
        color: 'var(--color-mute)',
        letterSpacing: '0.16em',
        paddingBottom: 6,
        borderBottom: '1px solid var(--color-hairline)',
      }}
    >
      {children}
    </div>
  )
}

function NumberedRow({
  i,
  total,
  children,
}: {
  i: number
  total: number
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr',
        padding: '10px 0',
        borderBottom:
          i < total - 1 ? '1px solid var(--color-hairline)' : 'none',
        alignItems: 'baseline',
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 9,
          color: 'var(--color-faint)',
          letterSpacing: '0.06em',
        }}
      >
        {String(i + 1).padStart(2, '0')}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-paper)', lineHeight: 1.4 }}>
        {children}
      </span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ExtractedSection({
  category,
  extracted,
  tone,
}: {
  category: SaveCategory
  extracted: ExtractedData
  tone: string
}) {
  if (!extracted || Object.keys(extracted).length === 0) return null

  const summary = pickSummary(category, extracted)
  const totalItems = countExtractedItems(extracted)

  return (
    <>
      {/* Summary row */}
      {(summary.length > 0 || totalItems > 0) && (
        <div
          className="relative"
          style={{
            margin: '22px 18px 0',
            paddingLeft: 14,
            borderLeft: `1px solid ${tone}`,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: -1,
              top: 0,
              width: 1,
              height: 18,
              background: tone,
              boxShadow: `0 0 8px ${tone}`,
            }}
          />
          <div
            className="font-mono"
            style={{
              fontSize: 9,
              color: tone,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Extracted{totalItems > 0 ? ` · ${totalItems} items` : ''}
          </div>
          {summary.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                gap: 18,
                flexWrap: 'wrap',
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                fontSize: 10,
                color: 'var(--color-mute)',
                letterSpacing: '0.04em',
              }}
            >
              {summary.map((p, i) => (
                <span key={`${p.value}-${p.label}-${i}`}>
                  <span style={{ color: 'var(--color-paper)', fontSize: 11 }}>
                    {p.value}
                  </span>
                  {p.label && ` ${p.label}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per-category structured detail */}

      {/* Recipe — ingredients + instructions */}
      {category === 'recipe' && (
        <>
          {extracted.ingredients && extracted.ingredients.length > 0 && (
            <section style={{ margin: '20px 18px 0' }}>
              <SectionHeader>INGREDIENTS</SectionHeader>
              {extracted.ingredients.map((ing, i) => (
                <NumberedRow key={i} i={i} total={extracted.ingredients!.length}>
                  {ing}
                </NumberedRow>
              ))}
            </section>
          )}
          {extracted.instructions && extracted.instructions.length > 0 && (
            <section style={{ margin: '20px 18px 0' }}>
              <SectionHeader>INSTRUCTIONS</SectionHeader>
              {extracted.instructions.map((step, i) => (
                <NumberedRow key={i} i={i} total={extracted.instructions!.length}>
                  {step}
                </NumberedRow>
              ))}
            </section>
          )}
        </>
      )}

      {/* Workout — exercises */}
      {category === 'workout' &&
        extracted.exercises &&
        extracted.exercises.length > 0 && (
          <section style={{ margin: '20px 18px 0' }}>
            <SectionHeader>EXERCISES</SectionHeader>
            {extracted.exercises.map((ex, i) => {
              const meta = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`]
                .filter(Boolean)
                .join(' · ')
              return (
                <div
                  key={i}
                  style={{
                    padding: '10px 0',
                    borderBottom:
                      i < extracted.exercises!.length - 1
                        ? '1px solid var(--color-hairline)'
                        : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--color-paper)' }}>
                      {ex.name}
                    </span>
                    {meta && (
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--color-mute)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {meta}
                      </span>
                    )}
                  </div>
                  {ex.notes && (
                    <p
                      style={{
                        fontSize: 12.5,
                        color: 'rgba(244,243,239,0.55)',
                        lineHeight: 1.4,
                        marginTop: 4,
                      }}
                    >
                      {ex.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </section>
        )}

      {/* Place / restaurant / hotel — address / website / phone */}
      {(category === 'place' || category === 'restaurant' || category === 'hotel') && (
        <>
          {extracted.address && (
            <section style={{ margin: '20px 18px 0' }}>
              <SectionHeader>ADDRESS</SectionHeader>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-paper)',
                  lineHeight: 1.45,
                  paddingTop: 8,
                }}
              >
                {extracted.address}
              </p>
            </section>
          )}
          {extracted.website && (
            <section style={{ margin: '20px 18px 0' }}>
              <SectionHeader>WEBSITE</SectionHeader>
              <a
                href={extracted.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  color: 'var(--color-paper)',
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(244,243,239,0.25)',
                  textUnderlineOffset: 4,
                  display: 'inline-block',
                  paddingTop: 8,
                  wordBreak: 'break-all',
                }}
              >
                {extracted.website.replace(/^https?:\/\//, '')}
              </a>
            </section>
          )}
        </>
      )}

      {/* Article / book — summary */}
      {(category === 'article' || category === 'book') && extracted.summary && (
        <section style={{ margin: '20px 18px 0' }}>
          <SectionHeader>SUMMARY</SectionHeader>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(244,243,239,0.82)',
              lineHeight: 1.5,
              paddingTop: 10,
            }}
          >
            {extracted.summary}
          </p>
        </section>
      )}

      {/* TV / movie — synopsis */}
      {(category === 'tv' || category === 'movie') && extracted.summary && (
        <section style={{ margin: '20px 18px 0' }}>
          <SectionHeader>SYNOPSIS</SectionHeader>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(244,243,239,0.82)',
              lineHeight: 1.5,
              paddingTop: 10,
            }}
          >
            {extracted.summary}
          </p>
        </section>
      )}
    </>
  )
}
