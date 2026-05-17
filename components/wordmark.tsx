/**
 * Wordmark — the Finds brand mark.
 *
 * Two paths from public/logo.black.svg, rendered inline so we can tint
 * via the `color` prop (default: paper). Paired with the word "Finds" in
 * Instrument Sans weight 500. Replaces the earlier three-rectangle
 * placeholder Sigil + the pixel-font letter-cycling AnimatedWordmark.
 *
 * Tapping the wordmark is the "go home" gesture in the new design —
 * `onReset` lets the parent surface (typically the Library) reset its
 * filter to `all`. When `onReset` is absent the mark renders as a
 * non-interactive span; callers wrap it in a Link if they want
 * navigation.
 */

const LOGO_VIEWBOX_W = 344.3
const LOGO_VIEWBOX_H = 445.26
const LOGO_ASPECT = LOGO_VIEWBOX_W / LOGO_VIEWBOX_H  // ~0.7733

type Props = {
  size?: number
  showWord?: boolean
  onReset?: () => void
}

export function Wordmark({ size = 22, showWord = true, onReset }: Props) {
  const content = (
    <>
      <Sigil size={size} />
      {showWord && (
        <span
          className="font-semibold-ui"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-paper)',
            letterSpacing: '-0.005em',
          }}
        >
          Finds
        </span>
      )}
    </>
  )

  if (onReset) {
    return (
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2"
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          color: 'inherit',
        }}
        aria-label="Reset view"
      >
        {content}
      </button>
    )
  }

  return <span className="inline-flex items-center gap-2">{content}</span>
}

/**
 * Sigil — the Finds logomark. Two SVG paths sourced from
 * public/logo.black.svg; rendered inline so callers can tint via the
 * `color` prop. `size` controls HEIGHT — width derives from the natural
 * aspect ratio (taller than wide, ~3:4).
 *
 * Background uses fill="currentColor" so the surrounding element can
 * also recolor via CSS `color` if desired.
 */
export function Sigil({ size = 22, color = '#f4f3ef' }: { size?: number; color?: string }) {
  const width = Math.round(size * LOGO_ASPECT)
  return (
    <svg
      width={width}
      height={size}
      viewBox={`0 0 ${LOGO_VIEWBOX_W} ${LOGO_VIEWBOX_H}`}
      aria-hidden
      style={{ flexShrink: 0, color }}
    >
      <g>
        <path
          d="M132.54,251.59c-16.58.77-27.67,10.62-29.81,25.26l-.16,59.34c-.16,57.56-43.85,105.11-102.32,109.08l.49-182.63c.16-58.77,48.13-106.96,107.15-107.11l190.27-.5c-9.09,58.87-56.76,97.78-113.81,97.14l-51.82-.58Z"
          fill="currentColor"
        />
        <path
          d="M114.5,110.4c-52.12-.19-93.19,30.71-113.26,78.28L0,105.66C1.16,50.56,42.51,1.4,100.17,1.13l244.13-1.13c-6.33,62.58-57.19,109.84-119.63,110.04l-110.17.36Z"
          fill="currentColor"
        />
      </g>
    </svg>
  )
}
