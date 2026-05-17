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
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'oklch(0.10 0.005 240)' }}
    >
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-3">
          <h1
            className="font-display"
            style={{
              fontSize: '56px',
              color: 'var(--color-bone)',
            }}
          >
            Finds<span className="font-serif italic font-normal">.</span>
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--color-mute)',
              lineHeight: 1.45,
            }}
          >
            The things you find, kept.
          </p>
        </div>
        <LoginForm searchParams={searchParams} />
      </div>
    </div>
  )
}
