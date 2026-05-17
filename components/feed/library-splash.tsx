'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sigil } from '@/components/wordmark'

/**
 * Library splash — a one-beat "Here come your Finds." moment that
 * plays the first time the user lands on /  in a given session. The
 * goal is to make the library feel like arriving at a place rather
 * than refreshing a page.
 *
 * Mechanics:
 *   • Read sessionStorage on mount. If the flag is set, render null
 *     (no splash, no flicker).
 *   • If unset, set the flag, show the overlay, and dismiss after
 *     ~1.4s with a fade. The flag means: rest of this tab session
 *     is splash-free.
 *   • The flag does NOT persist across browser sessions — a fresh
 *     visit (or a closed tab) plays the splash again, which is the
 *     intent of "arriving."
 *
 * Visual: black-out the screen with the sapphire wash gradient, render
 * the sigil + italic-serif tagline centered, fade out cleanly.
 */
const SESSION_FLAG = 'finds:library-splash-played'

export function LibrarySplash() {
  // Default to visible so the splash renders from SSR onward. Previously
  // we defaulted to false and flipped to true in useEffect, which caused
  // a flash: Library paints first → splash appears over it → 1.4s later
  // splash fades. With visible=true the splash renders BEFORE Library
  // becomes visible, and useEffect either dismisses it instantly (for a
  // returning user in this session) or schedules the 1.4s fade-out.
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(SESSION_FLAG)) {
      // Returning user this session — dismiss without the hold.
      setVisible(false)
      return
    }
    window.sessionStorage.setItem(SESSION_FLAG, '1')
    const t = window.setTimeout(() => setVisible(false), 1400)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="library-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.42, ease: [0.2, 0.8, 0.2, 1] } }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[80] flex items-center justify-center px-6"
          style={{
            // Same wash as the body background so the splash composes with the
            // page underneath if a sliver shows during the fade-out.
            background:
              'radial-gradient(140% 90% at 50% -20%, oklch(0.22 0.08 260) 0%, #08080b 60%)',
          }}
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.08 }}
            className="flex flex-col items-center text-center"
            style={{ gap: 14 }}
          >
            <Sigil size={44} />
            <p
              style={{
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                fontSize: 26,
                fontWeight: 300,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--color-paper)',
              }}
            >
              <span style={{ fontWeight: 400 }}>Here come your </span>
              <span className="font-serif-display" style={{ fontSize: 26 }}>
                Finds
              </span>
              <span style={{ color: 'var(--color-mute)' }}>.</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
