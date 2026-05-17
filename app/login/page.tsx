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
        {/* Brand block — sigil + wordmark centered, with the italic-serif
            tagline below in the same composition as a Find's title moment.
            Sits above the auth options like a logo over a counter. */}
        <div className="flex flex-col items-center text-center" style={{ gap: 14 }}>
          <Sigil size={48} />
          <h1
            className="font-semibold-ui"
            style={{
              fontSize: 30,
              color: 'var(--color-paper)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.0,
            }}
          >
            Finds
          </h1>
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
