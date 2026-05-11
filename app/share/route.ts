import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

/**
 * PWA Share Target endpoint.
 *
 * When the user shares from another app (Instagram, Safari, etc) and picks
 * "Finds" from the share sheet, the OS sends the shared content here as a
 * GET request with `title`, `text`, and/or `url` query params.
 *
 * Different apps put the URL in different fields:
 *   - Safari / Chrome: usually `url`
 *   - Instagram / iMessage: often `text` (the URL embedded in a message)
 *   - Some apps: `title` is "Look at this", `text` contains the URL
 *
 * Strategy: scan all three params, find the first valid http(s) URL, and
 * redirect to /add?url=... with it pre-filled. /add reads the param and
 * triggers enrichment immediately so the form is populated by the time the
 * user sees it.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const candidates = [
    params.get('url'),
    params.get('text'),
    params.get('title'),
  ].filter((v): v is string => Boolean(v))

  let foundUrl: string | null = null
  for (const candidate of candidates) {
    // Direct URL
    if (/^https?:\/\//i.test(candidate.trim())) {
      foundUrl = candidate.trim()
      break
    }
    // URL embedded in a longer string (Instagram pastes captions sometimes)
    const match = candidate.match(/https?:\/\/[^\s]+/i)
    if (match) {
      foundUrl = match[0]
      break
    }
  }

  if (foundUrl) {
    redirect(`/add?url=${encodeURIComponent(foundUrl)}`)
  }

  // No URL found — fall through to /add empty
  redirect('/add')
}
