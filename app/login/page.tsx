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
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Sigil size={28} />
            <span
              className="font-semibold-ui"
              style={{ fontSize: 22, color: 'var(--color-paper)', fontWeight: 500 }}
            >
              Finds
            </span>
          </div>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--color-mute)',
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
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
