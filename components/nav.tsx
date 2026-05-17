/**
 * Nav — back-compat shim.
 *
 * Stratum v2 removed the always-visible top header and bottom tab bar.
 * Each surface now renders its own header chrome; the bottom dock is
 * global (rendered in app/layout.tsx via <Dock />).
 *
 * This component still exists because the older page files import it
 * by name. It renders nothing. Step 7's in-spirit pass will delete the
 * imports + this file.
 */
export function Nav() {
  return null
}
