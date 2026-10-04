import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ariasAuth } from '../../../core/auth/authService'

export default function LoginPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    ariasAuth.getSession().then(({ data }) => {
      if (active && data) {
        navigate('/', { replace: true })
      }
    })

    return () => {
      active = false
    }
  }, [navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setError('')
    setBusy(true)

    const { error: signInError } = await ariasAuth.signIn(identifier.trim(), password)

    if (signInError) {
      setError('No se ha podido iniciar sesión. Comprueba el usuario y la contraseña.')
      setBusy(false)
      return
    }

    window.location.replace('/')
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
          <div className="mb-8 text-center">
            <img
              src="/logo.png"
              alt="Arias Suite"
              className="mx-auto h-16 w-auto object-contain"
            />
            <h1 className="mt-5 text-xl font-semibold text-slate-800">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Accede a Arias Suite
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
            <label className="block" htmlFor="login-identifier">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Correo o identificador de acceso
              </span>
              <input
                id="login-identifier"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
              />
            </label>

            <label className="block" htmlFor="login-password">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Contraseña
              </span>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
              />
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-b from-sky-100 to-sky-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_5px_12px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(15,23,42,0.12)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                ¿Has olvidado tu contraseña?
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
