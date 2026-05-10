import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'
import { enrichUrl } from '@/lib/actions/enrich-url'

type SaveCategory = Database['public']['Enums']['save_category']

/**
 * POST /api/share-save
 *
 * Background save endpoint for the iOS Shortcut. Stays out of any UI —
 * the Shortcut fires this and the user never leaves Instagram.
 *
 * Auth: Authorization: Bearer <token> where token is the user's
 * share_token from public.users (generated via /settings).
 *
 * Body: { url: string, note?: string }
 *
 * Returns: { ok: true, saveId, title, category } or { ok: false, error }
 *
 * Uses the SUPABASE_SERVICE_ROLE_KEY because the request comes from
 * an unauthenticated Shortcut HTTP request — there's no user session
 * cookie. The token in the Authorization header IS the auth.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract token
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing token' }, { status: 401 })
    }

    // 2. Parse body — accept JSON OR form-encoded (Shortcuts can send either)
    const contentType = request.headers.get('content-type') ?? ''
    let url: string | null = null
    let note: string | null = null
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({})) as { url?: string; note?: string }
      url = body.url?.trim() ?? null
      note = body.note?.trim() ?? null
    } else {
      const form = await request.formData()
      url = (form.get('url') as string | null)?.trim() ?? null
      note = (form.get('note') as string | null)?.trim() ?? null
    }

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ ok: false, error: 'invalid url' }, { status: 400 })
    }

    // 3. Service-role client (no user session — token IS the auth)
    const supabase = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 4. Token lookup → user
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('share_token', token)
      .maybeSingle()

    if (userErr || !userRow) {
      return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 401 })
    }

    const userId = userRow.id

    // 5. User → household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json({ ok: false, error: 'no household' }, { status: 403 })
    }
    const householdId = membership.household_id

    // 6. Self recommender
    const { data: selfRec } = await supabase
      .from('recommenders')
      .select('id')
      .eq('household_id', householdId)
      .eq('kind', 'self')
      .single()

    // 7. Run enrichment
    const enriched = await enrichUrl(url)
    const category: SaveCategory = enriched.category ?? 'noted'

    // 8. Dedup against existing canonical_url within household
    const { data: existing } = await supabase
      .from('saves')
      .select('id')
      .eq('household_id', householdId)
      .eq('canonical_url', enriched.canonicalUrl)
      .eq('status', 'active')
      .maybeSingle()

    let saveId: string
    if (existing) {
      saveId = existing.id
    } else {
      const { data: newSave, error: insertErr } = await supabase
        .from('saves')
        .insert({
          household_id: householdId,
          category,
          title: enriched.title ?? 'Untitled',
          subtitle: enriched.subtitle,
          canonical_url: enriched.canonicalUrl,
          hero_image_url: enriched.imageUrl,
          location_address: enriched.subtitle,
          visibility: 'household',
          created_by: userId,
          ...(enriched.coords ? { canonical_data: { coords: enriched.coords } } : {}),
        })
        .select('id')
        .single()

      if (insertErr || !newSave) {
        return NextResponse.json({ ok: false, error: insertErr?.message ?? 'save failed' }, { status: 500 })
      }
      saveId = newSave.id
    }

    // 9. Always create a capture (so the timeline shows when it was shared)
    await supabase.from('captures').insert({
      save_id: saveId,
      user_id: userId,
      recommender_id: selfRec?.id ?? null,
      note,
      capture_method: 'ios_shortcut',
      captured_at: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      saveId,
      title: enriched.title,
      category,
      hadDuplicate: Boolean(existing),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    )
  }
}
