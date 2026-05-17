/**
 * Wordmark — the Stratum v2 brand mark.
 *
 * Three offset rounded rectangles forming a stylized F, paired with the
 * word "Finds" in Instrument Sans weight 500. Replaces the previous
 * pixel-font letter-cycling AnimatedWordmark.
 *
 * Tapping the wordmark is the "go home" gesture in the new design —
 * `onReset` lets the parent surface (typically the Library) reset its
 * filter to `all`. When `onReset` is absent the mark renders as a
 * non-interactive Link/anchor pattern; callers wrap it in a Link.
 */
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
 * Sigil — three offset rounded rectangles forming a stylized F.
 * Stratum v2 mark; uses a soft vertical gradient. Exported separately
 * so the dock or favicon can use just the sigil without the wordmark.
 */
export function Sigil({ size = 22, color = '#f4f3ef' }: { size?: number; color?: string }) {
  const gid = `sigil-${size}` // unique gradient id per render
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="3" rx="0.5" fill={`url(#${gid})`} />
      <rect x="3" y="9.5" width="13" height="3" rx="0.5" fill={`url(#${gid})`} opacity="0.85" />
      <rect x="3" y="16" width="6" height="3" rx="0.5" fill={`url(#${gid})`} opacity="0.65" />
    </svg>
  )
}
