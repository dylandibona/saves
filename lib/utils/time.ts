export function formatRelativeTime(date: string | null): string {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export const CATEGORY_LABELS: Record<string, string> = {
  recipe:     'Recipe',
  tv:         'TV',
  movie:      'Movie',
  restaurant: 'Restaurant',
  hotel:      'Hotel',
  place:      'Place',
  event:      'Event',
  book:       'Book',
  podcast:    'Podcast',
  music:      'Music',
  article:    'Article',
  product:    'Product',
  workout:    'Workout',
  noted:      'Note',
}

/**
 * Stratum v2 category tones (2026-05-17).
 *
 * All tuned to oklch L≈0.7 C≈0.14 so the per-category accents harmonize
 * with each other on the sapphire background. Used as leading edges,
 * dots, single-line accent rules — never as fills.
 *
 * Mirrored in app/globals.css (`--color-cat-*`) so the values are
 * available both as CSS variables and as JS strings.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  recipe:     'oklch(0.72 0.16 38)',
  restaurant: 'oklch(0.74 0.14 75)',
  hotel:      'oklch(0.66 0.13 195)',
  place:      'oklch(0.70 0.13 155)',
  movie:      'oklch(0.62 0.14 25)',
  tv:         'oklch(0.68 0.15 270)',
  book:       'oklch(0.60 0.13 60)',
  article:    'oklch(0.75 0.04 90)',
  podcast:    'oklch(0.68 0.15 295)',
  music:      'oklch(0.70 0.13 215)',
  workout:    'oklch(0.72 0.18 132)',
  product:    'oklch(0.70 0.12 50)',
  event:      'oklch(0.70 0.14 340)',
  noted:      'oklch(0.78 0.02 100)',
}
