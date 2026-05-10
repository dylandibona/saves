'use client'

import { useState, useEffect, useRef } from 'react'

// Three pixel fonts — each has a distinct character
// CSS variables set by next/font in layout.tsx
const FONTS = [
  { family: 'var(--font-pixel-b)', size: '26px', letterSpacing: '0.04em' },   // Pixelify Sans — clean, modern pixel
  { family: 'var(--font-pixel-a)', size: '34px', letterSpacing: '-0.01em' },  // VT323 — terminal, condensed, needs larger size
  { family: 'var(--font-pixel-c)', size: '22px', letterSpacing: '0.06em' },   // Silkscreen — sharp, thicker stroke
] as const

const LETTERS = ['S', 'a', 'v', 'e', 's'] as const

// Each letter gets an independent timer offset so changes feel organic
const LETTER_CONFIG = [
  { interval: 3100, delay: 0 },
  { interval: 4200, delay: 700 },
  { interval: 2800, delay: 1400 },
  { interval: 3700, delay: 300 },
  { interval: 4600, delay: 1100 },
]

function AnimLetter({
  char,
  initialFont,
  interval,
  delay,
}: {
  char: string
  initialFont: number
  interval: number
  delay: number
}) {
  const [fontIdx, setFontIdx] = useState(initialFont)
  const [opacity, setOpacity] = useState(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        // Fade out
        setOpacity(0)
        // After fade, switch font and fade back in
        setTimeout(() => {
          setFontIdx(prev => (prev + 1) % FONTS.length)
          setOpacity(1)
          // Schedule next change
          schedule()
        }, 130)
      }, interval)
    }

    // Initial stagger delay
    const init = setTimeout(schedule, delay)
    return () => {
      clearTimeout(init)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [interval, delay])

  const font = FONTS[fontIdx]

  return (
    <span
      style={{
        fontFamily: font.family,
        fontSize: font.size,
        letterSpacing: font.letterSpacing,
        opacity,
        transition: 'opacity 0.13s ease-in-out',
        display: 'inline-block',
        // Fixed width so layout doesn't shift as fonts change
        minWidth: char === 'S' ? '0.65em' : char === 'a' ? '0.62em' : char === 'v' ? '0.62em' : char === 'e' ? '0.58em' : '0.50em',
        textAlign: 'center',
        lineHeight: 1,
        verticalAlign: 'baseline',
        // Normalize visual baseline across fonts
        position: 'relative',
        top: fontIdx === 1 ? '2px' : '0px', // VT323 sits slightly lower
      }}
    >
      {char}
    </span>
  )
}

export function AnimatedWordmark() {
  // Start each letter at a different font so the word looks varied immediately
  const initialFonts = [0, 1, 2, 0, 1]

  return (
    <span
      className="text-white/90 select-none"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        height: '34px',
        gap: '0px',
      }}
    >
      {LETTERS.map((char, i) => (
        <AnimLetter
          key={i}
          char={char}
          initialFont={initialFonts[i]}
          interval={LETTER_CONFIG[i].interval}
          delay={LETTER_CONFIG[i].delay}
        />
      ))}
    </span>
  )
}
