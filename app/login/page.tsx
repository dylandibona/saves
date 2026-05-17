import { Sigil } from '@/components/wordmark'
import { LoginForm } from './login-form'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    message?: string
    next?: string
    invite?: string
  }>
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm flex flex-col">
        {/* Brand block — the mark stands alone, italic-serif tagline below.
            "Finds" wordmark removed: the logomark is recognizable enough on
            its own, and the dual mark+word felt redundant once both were
            sized for visibility. */}
        <div className="flex flex-col items-center text-center" style={{ gap: 18 }}>
          <Sigil size={64} />
          <p
            style={{
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: 22,
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--color-paper)',
              maxWidth: 260,
            }}
          >
            <span style={{ fontWeight: 400 }}>The things you </span>
            <span className="font-serif-display" style={{ fontSize: 22 }}>
              find
            </span>
            <span style={{ fontWeight: 400 }}>, kept</span>
            <span style={{ color: 'var(--color-mute)' }}>.</span>
          </p>
        </div>

        <div style={{ marginTop: 36 }}>
          <LoginForm searchParams={searchParams} />
        </div>
      </div>
    </div>
  )
}
