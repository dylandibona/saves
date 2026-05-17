/**
 * Image persistence — fetch + resize + upload to Supabase Storage.
 *
 * The "hero-images" bucket is public; objects are reachable at
 *   {SUPABASE_URL}/storage/v1/object/public/hero-images/{path}
 *
 * Storage path format: `{saveId}.webp` (single canonical file per save).
 * Re-uploading the same path overwrites in place — that's intentional so
 * the Refresh action can replace a stale image without orphaning bytes.
 *
 * Server-only: imports sharp, the Supabase service-role client, and the
 * Slackbot-style fetch headers. Do not import this from a client file.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import type { Database } from '@/lib/types/supabase'

const BUCKET = 'hero-images'

// Same UA strategy as fetchAndParse — most hosts whitelist Slackbot for
// link-preview thumbnails. Instagram CDN URLs work under the FB-bot UA;
// Google's lh3.googleusercontent.com photos work under either.
function pickFetchUa(url: string): string {
  if (url.includes('instagram.com') || url.includes('cdninstagram.com')) {
    return 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  }
  return 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'
}

type PersistResult =
  | { ok: true;  path: string }
  | { ok: false; reason: 'no-url' | 'fetch-failed' | 'process-failed' | 'upload-failed'; detail?: string }

/**
 * Fetch a remote image, resize/encode as webp (~800px wide), upload to
 * Supabase Storage at `{saveId}.webp`. Returns the storage path on
 * success (always `{saveId}.webp`) or a structured failure reason so
 * callers can decide whether to log + fall back.
 *
 * Time budget: ~3-4s total in the common case (1.5s fetch + 0.5s resize +
 * 0.5s upload). Hard 8s timeout on the fetch.
 */
export async function persistHeroImage(
  saveId: string,
  remoteUrl: string | null,
): Promise<PersistResult> {
  if (!remoteUrl || !remoteUrl.startsWith('http')) {
    return { ok: false, reason: 'no-url' }
  }

  // ── 1. Fetch the source image
  let buf: ArrayBuffer
  try {
    const res = await fetch(remoteUrl, {
      headers: {
        'User-Agent': pickFetchUa(remoteUrl),
        Accept: 'image/webp,image/avif,image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok) {
      return { ok: false, reason: 'fetch-failed', detail: `HTTP ${res.status}` }
    }
    buf = await res.arrayBuffer()
    // Sanity check — under 1KB is almost always an error page disguised as 200
    if (buf.byteLength < 1024) {
      return { ok: false, reason: 'fetch-failed', detail: `body too small (${buf.byteLength}B)` }
    }
  } catch (e) {
    return {
      ok: false,
      reason: 'fetch-failed',
      detail: e instanceof Error ? e.message : 'unknown',
    }
  }

  // ── 2. Resize + re-encode as webp
  let webp: Buffer
  try {
    webp = await sharp(Buffer.from(buf))
      .rotate()  // honor EXIF
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer()
  } catch (e) {
    return {
      ok: false,
      reason: 'process-failed',
      detail: e instanceof Error ? e.message : 'unknown',
    }
  }

  // ── 3. Upload via service-role
  const supabase = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const path = `${saveId}.webp`
  const { error } = await supabase
    .storage
    .from(BUCKET)
    .upload(path, webp, {
      contentType: 'image/webp',
      upsert: true,  // Refresh overwrites cleanly
      cacheControl: '31536000',  // 1y — content is immutable per save_id; Refresh writes a new save_id-ext combo never happens
    })

  if (error) {
    return { ok: false, reason: 'upload-failed', detail: error.message }
  }

  return { ok: true, path }
}

/**
 * Build a public URL for a hero-images Storage path. Use in renderers
 * once `hero_image_storage_path` is set. Falls back to `hero_image_url`
 * if the storage path is null.
 */
export function publicHeroImageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`
}
