/**
 * Render-side identity helpers — initials and a stable color per user.
 *
 * "Who saved this" attribution is shown as a small pill in the feed and
 * captures timeline. We derive the 2-letter mark from display_name when
 * available, otherwise from the email local-part with a couple of explicit
 * mappings for our known household members.
 */

export type UserLike = {
  email: string
  display_name?: string | null
  capture_color?: string | null
}

const KNOWN_INITIALS: Record<string, string> = {
  // Add explicit overrides as new household members join
  dylan: 'DD',
  keelin: 'KL',
}

const KNOWN_COLORS: Record<string, string> = {
  // Default colors when capture_color isn't set yet on the users row
  dylan: '#4d9fff',   // sapphire
  keelin: '#ff5fae',  // magenta jewel
}

export function getUserInitials(user: UserLike): string {
  // 1. Prefer display_name when present
  if (user.display_name && user.display_name.trim()) {
    const words = user.display_name.trim().split(/\s+/)
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    return words[0].slice(0, 2).toUpperCase()
  }

  // 2. Email local part with known overrides
  const local = user.email.split('@')[0].toLowerCase()
  for (const [key, initials] of Object.entries(KNOWN_INITIALS)) {
    if (local.includes(key)) return initials
  }

  // 3. Generic fallback — first two letters of local part
  return local.slice(0, 2).toUpperCase()
}

export function getUserColor(user: UserLike): string {
  if (user.capture_color) return user.capture_color
  const local = user.email.split('@')[0].toLowerCase()
  for (const [key, color] of Object.entries(KNOWN_COLORS)) {
    if (local.includes(key)) return color
  }
  return '#888888'
}
