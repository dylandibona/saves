/**
 * AnimatedWordmark — deprecated.
 *
 * Stratum v2 replaces the letter-cycling pixel-font wordmark with a
 * static sigil mark + "Finds" text. This file now delegates to the new
 * Wordmark component so existing nav/bottom-nav callers keep working
 * during the rollout. Both files (and the bottom-nav consumer) will be
 * removed when the floating dock lands in Step 4.
 */

import { Wordmark } from './wordmark'

export function AnimatedWordmark() {
  return <Wordmark />
}
