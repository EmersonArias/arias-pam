import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ariasAuth } from '../../../core/auth/authService'
import { useAuth } from '../context/AuthProvider'

export default function ActivateAccountPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setError('')

    if (password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.')
      return
    }

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)

    const passwordResult = await ariasAuth.updatePassword(password)
    if (passwordResult.error) {
      setError(passwordResult.error.message)
      setBusy(false)
      return
    }

    const activationResult = await ariasAuth.activateAccount()
    if (activationResult.error || activationResult.data !== true) {
      await ariasAuth.signOut()
      setError(
        activationResult.error?.message ??
          'No se ha podido activar la cuenta. Ponte en contacto con el administrador de Arias Suite.',
      )
      setBusy(false)
      return
    }

    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">Comprobando invitación…</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <section className="w-full rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <img src="/logo.png" alt="Arias Suite" className="mx-auto h-16 w-auto object-contain" />
            <h1 className="mt-5 text-xl font-semibold text-slate-800">Invitación no válida</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              El enlace de activación ha caducado o ya no es válido. Solicita una nueva invitación al administrador.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Ir al login
            </Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="Arias Suite" className="mx-auto h-16 w-auto object-contain" />
            <h1 className="mt-5 text-xl font-semibold text-slate-800">Activar cuenta</h1>
            <p className="mt-1 text-sm text-slate-500">
              {session.user.email ?? 'Tu correo electrónico'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Nueva contraseña</span>
              <input
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Repetir contraseña</span>
              <input
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
              />
            </label>

            {error && (
              <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {busy ? 'Activando…' : 'Activar cuenta'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
