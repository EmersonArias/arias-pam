import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-7 py-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
          <img src="/logo.png" alt="Arias Suite" className="mx-auto h-14 w-auto object-contain" />
          <p className="mt-5 text-sm text-slate-500">Comprobando sesión…</p>
        </div>
      </main>
    )
  }

  if (!session) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}