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

/** Vivid jewel-tone accents — max saturation, designed to glow on deep dark */
export const CATEGORY_COLORS: Record<string, string> = {
  recipe:     '#10ffa0', // electric emerald
  tv:         '#bf7fff', // vivid violet
  movie:      '#ff4d6d', // vivid ruby
  restaurant: '#ffb800', // saturated gold-amber
  hotel:      '#00e5ff', // electric cyan
  place:      '#4d9fff', // bright sapphire
  event:      '#ff7a2f', // vivid tangerine
  book:       '#ffe566', // bright gold
  podcast:    '#7b7fff', // electric indigo
  music:      '#ff5fae', // vivid rose
  article:    '#8eb4d4', // steel blue
  product:    '#f5e642', // electric yellow
  workout:    '#39ff7a', // neon lime
  noted:      '#c9c4c0', // warm neutral
}
