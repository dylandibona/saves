'use client'

/**
 * Wordmark — static, confident, sans-serif. No animation.
 *
 * The previous letter-cycling pixel-font version was a fun easter egg but
 * read as "playful side-project" rather than "premium product." Replaced
 * with a single bold mark that puts utility first.
 *
 * If we want a future animation moment, it should be on a deliberate
 * surface (e.g. the loading state of /add) — not on every screen via the
 * nav.
 */

export function AnimatedWordmark() {
  return (
    <span
      className="select-none"
      style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        fontSize: '22px',
        letterSpacing: '-0.025em',
        color: 'rgba(255,255,255,0.96)',
        lineHeight: 1,
      }}
    >
      Finds
    </span>
  )
}
