import type { ExtractedData } from '@/lib/actions/enrich-url'
import type { Database } from '@/lib/types/supabase'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * Renders the per-category structured data extracted at enrichment time.
 * The save IS the artifact — these are the fields that make it so the user
 * doesn't need to follow the source link to remember why they saved it.
 *
 * Each category gets a different layout. Sections only render when their
 * fields have data; unused fields stay invisible. The aesthetic matches
 * the rest of the app: Fraunces for content, Space Mono for labels.
 */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] tracking-widest text-white/30">
      {children}
    </p>
  )
}

function Block({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function MetaRow({ items }: { items: Array<{ label: string; value: string | number }> }) {
  if (items.length === 0) return null
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5 min-w-[80px]">
          <dt className="font-mono text-[9px] tracking-widest text-white/30 uppercase">{label}</dt>
          <dd className="font-serif text-base text-white/82 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ExtractedSection({
  category,
  extracted,
}: {
  category: SaveCategory
  extracted: ExtractedData
}) {
  if (!extracted || Object.keys(extracted).length === 0) return null

  return (
    <div className="space-y-8">
      {/* ── Recipe ────────────────────────────────────────────────────── */}
      {category === 'recipe' && (
        <>
          <MetaRow
            items={[
              extracted.totalTime ? { label: 'Time',     value: extracted.totalTime } : null,
              extracted.servings  ? { label: 'Servings', value: extracted.servings }  : null,
            ].filter((x) => x !== null) as Array<{ label: string; value: string | number }>}
          />

          {extracted.ingredients && extracted.ingredients.length > 0 && (
            <Block label="Ingredients">
              <ul className="space-y-1.5">
                {extracted.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className="text-[15px] text-white/80 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[10px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-white/30"
                  >
                    {ing}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {extracted.instructions && extracted.instructions.length > 0 && (
            <Block label="Instructions">
              <ol className="space-y-3 counter-reset-instructions">
                {extracted.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="font-mono text-[11px] tabular-nums shrink-0 mt-1 w-5 h-5 rounded-full inline-flex items-center justify-center"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.55)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[15px] text-white/80 leading-relaxed flex-1">{step}</span>
                  </li>
                ))}
              </ol>
            </Block>
          )}
        </>
      )}

      {/* ── Workout ──────────────────────────────────────────────────── */}
      {category === 'workout' && (
        <>
          <MetaRow
            items={[
              extracted.duration  ? { label: 'Duration',  value: extracted.duration }            : null,
              extracted.equipment ? { label: 'Equipment', value: extracted.equipment.join(', ') } : null,
            ].filter((x) => x !== null) as Array<{ label: string; value: string | number }>}
          />

          {extracted.exercises && extracted.exercises.length > 0 && (
            <Block label="Exercises">
              <ul className="space-y-2.5">
                {extracted.exercises.map((ex, i) => (
                  <li
                    key={i}
                    className="rounded-xl px-4 py-3 space-y-1"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <p className="font-serif text-base text-white/88">{ex.name}</p>
                      <p className="font-mono text-[11px] text-white/45 tabular-nums">
                        {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    {ex.notes && (
                      <p className="text-[13px] text-white/55 leading-relaxed">{ex.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </>
      )}

      {/* ── Place / Restaurant / Hotel ─────────────────────────────── */}
      {(category === 'place' || category === 'restaurant' || category === 'hotel') && (
        <>
          <MetaRow
            items={[
              extracted.priceLevel ? { label: 'Price', value: extracted.priceLevel } : null,
              extracted.hours      ? { label: 'Hours', value: extracted.hours }      : null,
              extracted.phone      ? { label: 'Phone', value: extracted.phone }      : null,
            ].filter((x) => x !== null) as Array<{ label: string; value: string | number }>}
          />

          {extracted.address && (
            <Block label="Address">
              <p className="text-[15px] text-white/80 leading-relaxed">{extracted.address}</p>
            </Block>
          )}

          {extracted.website && (
            <Block label="Website">
              <a
                href={extracted.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-white/70 hover:text-white/90 transition-colors underline underline-offset-4 decoration-white/20 break-all"
              >
                {extracted.website.replace(/^https?:\/\//, '')}
              </a>
            </Block>
          )}
        </>
      )}

      {/* ── Article / Book ──────────────────────────────────────────── */}
      {(category === 'article' || category === 'book') && (
        <>
          <MetaRow
            items={[
              extracted.author      ? { label: 'Author',    value: extracted.author }      : null,
              extracted.readTime    ? { label: 'Read time', value: extracted.readTime }    : null,
              extracted.publishedAt ? { label: 'Published', value: extracted.publishedAt } : null,
            ].filter((x) => x !== null) as Array<{ label: string; value: string | number }>}
          />

          {extracted.summary && (
            <Block label="Summary">
              <p className="text-[15px] text-white/75 leading-relaxed font-serif">
                {extracted.summary}
              </p>
            </Block>
          )}
        </>
      )}

      {/* ── TV / Movie ───────────────────────────────────────────────── */}
      {(category === 'tv' || category === 'movie') && (
        <>
          <MetaRow
            items={[
              extracted.year     ? { label: 'Year',     value: extracted.year }     : null,
              extracted.runtime  ? { label: 'Runtime',  value: extracted.runtime }  : null,
              extracted.director ? { label: 'Director', value: extracted.director } : null,
            ].filter((x) => x !== null) as Array<{ label: string; value: string | number }>}
          />

          {extracted.summary && (
            <Block label="Synopsis">
              <p className="text-[15px] text-white/75 leading-relaxed font-serif">
                {extracted.summary}
              </p>
            </Block>
          )}
        </>
      )}

      {/* ── Product ──────────────────────────────────────────────────── */}
      {category === 'product' && (
        <>
          <MetaRow
            items={[
              extracted.brand ? { label: 'Brand', value: extracted.brand } : null,
              extracted.price ? { label: 'Price', value: extracted.price } : null,
            ].filter((x) => x !== null) as Array<{ label: string; value: string | number }>}
          />
        </>
      )}

      {/* ── Podcast / Music ──────────────────────────────────────────── */}
      {(category === 'podcast' || category === 'music') && (
        <>
          <MetaRow
            items={[
              extracted.showName      ? { label: 'Show',    value: extracted.showName }      : null,
              extracted.episodeNumber ? { label: 'Episode', value: extracted.episodeNumber } : null,
              extracted.artist        ? { label: 'Artist',  value: extracted.artist }        : null,
            ].filter((x) => x !== null) as Array<{ label: string; value: string | number }>}
          />
        </>
      )}
    </div>
  )
}
