import { LoginForm } from './login-form'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'oklch(0.10 0.005 240)' }}
    >
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-2">
          <h1 className="font-display text-white text-[44px]">
            Finds<span className="font-serif italic font-normal">.</span>
          </h1>
          <p className="text-[15px] text-white/55 leading-snug">
            The things you find, kept.
          </p>
        </div>
        <LoginForm searchParams={searchParams} />
      </div>
    </div>
  )
}
