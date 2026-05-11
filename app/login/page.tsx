import { LoginForm } from './login-form'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl text-stone-900">Finds</h1>
          <p className="text-sm text-stone-500">The things you find, kept.</p>
        </div>
        <LoginForm searchParams={searchParams} />
      </div>
    </div>
  )
}
