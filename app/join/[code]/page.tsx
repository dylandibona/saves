import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Sigil } from '@/components/wordmark'
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
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Sigil size={28} />
            <span
              className="font-semibold-ui"
              style={{ fontSize: 22, color: 'var(--color-paper)', fontWeight: 500 }}
            >
              Finds
            </span>
          </div>

          {previewError || !preview.valid ? (
            <div
              className="rounded-[4px] px-4 py-3"
              style={{
                background: 'rgba(244,63,94,0.08)',
                border: '0.5px solid rgba(244,63,94,0.32)',
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  color: '#fb7185',
                  lineHeight: 1.5,
                  letterSpacing: '-0.005em',
                }}
              >
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
                fontSize: 17,
                color: 'var(--color-mute)',
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
              }}
            >
              <span style={{ color: 'var(--color-paper)' }}>{inviterName}</span>{' '}
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
              className="block w-full h-12 inline-flex items-center justify-center"
              style={{
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 500,
                background:
                  'linear-gradient(180deg, var(--color-bone) 0%, oklch(0.92 0.01 80) 100%)',
                color: 'var(--color-bg)',
                transition: 'all var(--dur-hover) ease',
              }}
            >
              Sign in to accept
            </Link>
            <p
              className="font-mono text-center"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--color-faint)',
              }}
            >
              {isHousehold ? 'household invite' : 'beta invite'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
