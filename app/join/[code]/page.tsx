import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redeemInviteCode } from './actions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ code: string }> }

export default async function JoinPage({ params }: Props) {
  const { code: rawCode } = await params
  const code = rawCode.toUpperCase()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Peek at the invite first to decide what to render. This RPC is anon-callable.
  const { data: previewData, error: previewError } = await supabase.rpc(
    'preview_invite_code',
    { p_code: code },
  )

  type Preview = {
    valid: boolean
    reason?: 'invalid' | 'expired' | 'used'
    kind?: 'app' | 'household'
    inviter_name?: string
    household_name?: string
  }
  const preview = (previewData ?? {}) as Preview

  // Authenticated user landing on /join/<code>: redeem and bounce to home.
  if (user && preview.valid) {
    try {
      await redeemInviteCode(code)
    } catch {
      // Surfaces below; we still render the page in that case.
    }
    redirect('/')
  }

  const inviterName = preview.inviter_name ?? 'A friend'
  const isHousehold = preview.kind === 'household'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'oklch(0.10 0.005 240)' }}
    >
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-3">
          <h1
            className="font-display"
            style={{ fontSize: '56px', color: 'var(--color-bone)' }}
          >
            Finds<span className="font-serif italic font-normal">.</span>
          </h1>

          {previewError || !preview.valid ? (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: 'rgba(244,63,94,0.08)',
                border: '1px solid rgba(244,63,94,0.22)',
              }}
            >
              <p className="text-[14px] text-rose-200/90 leading-relaxed">
                {preview.reason === 'expired'
                  ? 'This invite has expired. Ask for a fresh link.'
                  : preview.reason === 'used'
                  ? 'This invite has already been used.'
                  : 'This invite link is not valid.'}
              </p>
            </div>
          ) : (
            <p
              style={{
                fontSize: '17px',
                color: 'var(--color-mute)',
                lineHeight: 1.5,
              }}
            >
              <span className="text-white/90">{inviterName}</span>{' '}
              {isHousehold
                ? 'is sharing their library with you.'
                : 'invited you to Finds.'}
            </p>
          )}
        </div>

        {preview.valid && (
          <div className="space-y-3">
            <Link
              href={`/login?invite=${encodeURIComponent(code)}`}
              className="block w-full h-12 rounded-xl text-[14px] font-semibold transition-all duration-150 inline-flex items-center justify-center"
              style={{
                background: 'oklch(0.96 0.005 80)',
                color: 'oklch(0.10 0.005 240)',
              }}
            >
              Sign in to accept
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 text-center">
              {isHousehold ? 'household invite' : 'beta invite'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
