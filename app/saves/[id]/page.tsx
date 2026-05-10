import { notFound } from 'next/navigation'
import { Nav } from '@/components/nav'
import { getSaveById } from '@/lib/data/saves'
import { getHouseholdId } from '@/lib/data/household'
import { CATEGORY_LABELS, formatRelativeTime } from '@/lib/utils/time'
import type { Metadata } from 'next'
import Image from 'next/image'

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

  // RLS handles access, but confirm the save belongs to this household
  if (!householdId || save.household_id !== householdId) notFound()

  const category = CATEGORY_LABELS[save.category] ?? save.category

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        {save.hero_image_url && (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-stone-100">
            <Image
              src={save.hero_image_url}
              alt={save.title}
              width={672}
              height={378}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 border border-stone-200 rounded-full px-2.5 py-0.5">{category}</span>
            {save.capture_count >= 2 && (
              <span className="text-xs text-stone-500">{save.capture_count}× saved</span>
            )}
          </div>
          <h1 className="font-serif text-2xl text-stone-900 leading-snug">{save.title}</h1>
          {save.subtitle && (
            <p className="text-sm text-stone-500">{save.subtitle}</p>
          )}
          {save.description && (
            <p className="text-sm text-stone-600 leading-relaxed pt-1">{save.description}</p>
          )}
          {save.canonical_url && (
            <a
              href={save.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 truncate max-w-full"
            >
              {new URL(save.canonical_url).hostname}
            </a>
          )}
        </div>

        {/* Captures timeline */}
        {save.captures && save.captures.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Captures</h2>
            <div className="space-y-3">
              {save.captures.map((capture) => (
                <div key={capture.id} className="flex gap-3">
                  {capture.recommenders?.color && (
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: capture.recommenders.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {capture.recommenders && (
                        <span className="text-sm text-stone-700">
                          {capture.recommenders.display_name}
                        </span>
                      )}
                      {capture.sources && (
                        <span className="text-xs text-stone-400">via {capture.sources.display_name}</span>
                      )}
                      <span className="text-xs text-stone-400 ml-auto">{formatRelativeTime(capture.captured_at)}</span>
                    </div>
                    {capture.note && (
                      <p className="text-sm text-stone-600 mt-0.5 leading-relaxed">{capture.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Variations */}
        {save.variations && save.variations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Variations</h2>
            <div className="space-y-2">
              {save.variations.map((v) => (
                <div key={v.id} className="border border-stone-100 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-stone-700">{v.label}</p>
                  {v.notes && <p className="text-xs text-stone-500">{v.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </>
  )
}
