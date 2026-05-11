'use client'

import { useEffect, useState } from 'react'

/**
 * The Finds wordmark — settled state plus the signature cold-launch animation.
 *
 * Per design-direction.md §6: the wordmark cycle is the signature motion
 * moment of the brand. It plays exactly once per session, on cold launch,
 * cycling through five faces over ~700ms before settling on Fraunces italic.
 *
 *   Pixelify Sans → VT323 → Silkscreen → Space Mono → Fraunces italic
 *
 * Subsequent renders during the same session show the settled Fraunces
 * italic statically. Rare = brand. Always playing = noise.
 *
 * Detection: sessionStorage flag set after the first play.
 */

const STAGES: Array<{ family: string; size: string; letterSpacing: string; weight?: string }> = [
  { family: 'var(--font-pixel-b)', size: '1em',    letterSpacing: '0.04em' },           // Pixelify Sans
  { family: 'var(--font-pixel-a)', size: '1.18em', letterSpacing: '-0.01em' },          // VT323
  { family: 'var(--font-pixel-c)', size: '0.86em', letterSpacing: '0.06em' },           // Silkscreen
  { family: 'var(--font-mono-space)', size: '0.92em', letterSpacing: '-0.01em', weight: '700' }, // Space Mono
  { family: 'var(--font-fraunces)', size: '1.05em', letterSpacing: '-0.02em', weight: '500' },   // Fraunces italic (settled)
]

// Stage durations sum to ~700ms total cycle.
const STAGE_MS = [120, 130, 130, 140, 0]
const SETTLED_STAGE = STAGES.length - 1

const SESSION_FLAG = 'finds:wordmark-played'

export function AnimatedWordmark() {
  const [stage, setStage] = useState(SETTLED_STAGE) // SSR + post-launch renders show settled

  useEffect(() => {
    // Only play the cycle once per session.
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_FLAG)) return

    sessionStorage.setItem(SESSION_FLAG, '1')

    // Start the cycle from stage 0 immediately.
    setStage(0)

    const timers: ReturnType<typeof setTimeout>[] = []
    let cumulative = 0
    for (let i = 1; i < STAGES.length; i++) {
      cumulative += STAGE_MS[i - 1]
      timers.push(
        setTimeout(() => setStage(i), cumulative)
      )
    }

    return () => timers.forEach(clearTimeout)
  }, [])

  const s = STAGES[stage]
  const isSettled = stage === SETTLED_STAGE

  return (
    <span
      className="select-none inline-block"
      style={{
        fontFamily: s.family,
        fontSize: s.size,
        letterSpacing: s.letterSpacing,
        fontWeight: s.weight ?? '400',
        fontStyle: isSettled ? 'italic' : 'normal',
        color: 'var(--color-bone)',
        lineHeight: 1,
        // Keep dimensions stable so the surrounding layout doesn't jitter
        minWidth: '4.2ch',
        textAlign: 'left',
      }}
    >
      Finds<span style={{ fontFamily: 'var(--font-fraunces)', fontStyle: 'italic' }}>.</span>
    </span>
  )
}
