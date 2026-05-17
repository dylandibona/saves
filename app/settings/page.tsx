import { headers } from 'next/headers'
import { Nav } from '@/components/nav'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/require-user'
import { TokenSection } from './token-section'
import { InvitesSection } from './invites-section'
import { TestersSection } from './testers-section'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  await requireUser('/settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Read existing token (if any) so we can show it without forcing a regenerate
  const { data: profile } = await supabase
    .from('users')
    .select('share_token')
    .eq('id', user!.id)
    .single()

  const { data: codes } = await supabase
    .from('invite_codes')
    .select('code, kind, uses_count, max_uses, expires_at, notes, created_at')
    .order('created_at', { ascending: false })

  // Tester accounts you've onboarded (app codes redeemed by someone).
  // Sorted by closest-to-expiry first. Powers the "Testers" panel where
  // you organize the conversion moment as paid plans approach.
  const { data: testers } = await supabase.rpc('list_acquired_users')

  // Resolve absolute origin for share links. Vercel sets x-forwarded-host /
  // x-forwarded-proto; locally we fall back to NEXT_PUBLIC_SITE_URL or
  // finds.dylandibona.com to keep links shareable from any environment.
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host  = h.get('x-forwarded-host') ?? h.get('host')
  const origin = host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://finds.dylandibona.com')

  return (
    <>
      <Nav />
      <main
        className="max-w-[640px] mx-auto px-5 space-y-12"
        style={{
          paddingTop: '72px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)',
        }}
      >

        <header className="space-y-1 mt-4">
          <p
            className="font-mono uppercase"
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              color: 'var(--color-mute)',
            }}
          >
            Settings
          </p>
          <h1
            className="font-display mt-2"
            style={{
              fontSize: '48px',
              color: 'var(--color-bone)',
            }}
          >
            Your <span className="font-serif italic font-normal">place</span>.
          </h1>
        </header>

        <InvitesSection
          initialCodes={(codes ?? []).filter(
            (c): c is typeof c & { kind: 'app' | 'household' } =>
              c.kind === 'app' || c.kind === 'household'
          )}
          origin={origin}
        />

        <TestersSection rows={testers ?? []} />

        <TokenSection initialToken={profile?.share_token ?? null} />

        {/* iOS Shortcut setup instructions */}
        <section className="space-y-4">
          <header className="space-y-1.5">
            <p className="font-mono text-[10px] tracking-widest text-white/30">iOS Shortcut</p>
            <p className="text-[13px] text-white/55 leading-relaxed max-w-prose">
              Send a find from any app — Instagram, Safari, Mail — without leaving it.
              The Shortcut posts the URL to Finds in the background and shows
              a brief confirmation notification.
            </p>
          </header>

          <ol className="space-y-3 text-[13px] text-white/65 leading-relaxed">
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">1</span>
              <span>Open <strong className="text-white/85">Shortcuts</strong> app, tap <strong className="text-white/85">+</strong>, name it <em>Send to Finds</em>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">2</span>
              <span>Tap the <strong className="text-white/85">i</strong> icon → toggle <strong className="text-white/85">Use with Share Sheet</strong> on. Set Share Sheet Types to <strong className="text-white/85">URLs only</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">3</span>
              <span>Add action: <strong className="text-white/85">Get Contents of URL</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">4</span>
              <span>Configure that action:
                <ul className="mt-2 space-y-1 pl-4 list-disc list-outside marker:text-white/20">
                  <li>URL: <code className="font-mono text-[11px] text-white/80">https://finds.dylandibona.com/api/share-save</code></li>
                  <li>Method: <strong className="text-white/85">POST</strong></li>
                  <li>Headers: add one — Key: <code className="font-mono text-[11px] text-white/80">Authorization</code>, Value: <code className="font-mono text-[11px] text-white/80">Bearer YOUR_TOKEN</code> (paste the token from above where it says YOUR_TOKEN)</li>
                  <li>Request Body: <strong className="text-white/85">JSON</strong></li>
                  <li>Add field — Key: <code className="font-mono text-[11px] text-white/80">url</code>, type: <strong className="text-white/85">Text</strong>, value: <em>Shortcut Input</em> (magic variable)</li>
                </ul>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">5</span>
              <span>Add action: <strong className="text-white/85">Show Notification</strong>. Set the body to <em>Saved to Finds</em>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[10px] text-white/30 mt-0.5">6</span>
              <span>Done. Test from Safari → tap share → Send to Finds → notification fires, you stay in the app you came from.</span>
            </li>
          </ol>

          <div
            className="rounded-xl px-4 py-3 mt-2"
            style={{
              background: 'rgba(0,229,160,0.05)',
              border: '1px solid rgba(0,229,160,0.18)',
            }}
          >
            <p className="font-mono text-[10px] text-white/50 leading-relaxed">
              <span className="text-[#00e5a0]">Tip:</span>{' '}
              Anything saved this way uses auto-detected category and visibility = Shared.
              Open the save from your feed to change category, mark private, or edit the title.
            </p>
          </div>
        </section>

      </main>
    </>
  )
}
