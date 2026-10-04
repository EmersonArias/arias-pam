import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CircleHelp,
  Maximize2,
  Minimize2,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import BrandLogo from '../../shared/components/branding/BrandLogo'
import { useAuth } from '../../features/auth/context/AuthProvider'
import { ariasAuth } from '../../core/auth/authService'
import { supabase } from '../../lib/supabase'

type HomeRegister = {
  icon: string
  name: string
  path: string | null
  comingSoon?: boolean
}

type MaintenanceAlert = {
  id: string
  alert_type: 'UPCOMING_REVIEW' | 'DUE_TODAY' | 'OVERDUE_REVIEW' | 'OUT_OF_RANGE'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  due_date: string | null
  triggered_at: string
}

const registers: HomeRegister[] = [
  { icon: '🛠️', name: 'Mantenimiento', path: '/maintenance' },
  { icon: '🏊', name: 'Piscinas', path: '/pools' },
  { icon: '♨️', name: 'Spa', path: '/spa' },
  { icon: '🦠', name: 'Legionella', path: '/legionella' },
  { icon: '💧', name: 'Bombas', path: '/pumps' },
  { icon: '🌬️', name: 'Climatizadores', path: '/climatizers' },
  { icon: '❄️', name: 'Fancoils', path: '/fancoils' },
  { icon: '⚡', name: 'Cuadros BT', path: '/electricalpanels' },
  { icon: '💡', name: 'Fotoluminiscentes', path: '/photoluminescent' },
  { icon: '🔦', name: 'Emergencia', path: '/emergencylights' },
  { icon: '🚪', name: 'Cortafuegos', path: '/firedoors' },
  { icon: '🧯', name: 'PCI', path: '/fireequipment' },
  { icon: '📏', name: 'Calibraciones', path: '/calibrations' },
  { icon: '🛠️', name: 'Actuaciones', path: '/actions' },
  { icon: '📦', name: 'Stock', path: null, comingSoon: true },
  { icon: '🗓️', name: 'Planificador horario', path: null, comingSoon: true },
  { icon: '🏢', name: 'Proveedores', path: '/providers' },
]

export default function BooksPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([])
  const alertsGridRef = useRef<HTMLElement | null>(null)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === document.documentElement)
    }

    handleFullscreenChange()
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen can be denied by the browser or platform policy.
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadAdministrationAccess() {
      if (!session?.user.id) {
        if (mounted) setIsPlatformAdmin(false)
        return
      }

      const { data, error } = await supabase
        .from('platform_admins')
        .select('active')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!mounted) return
      setIsPlatformAdmin(!error && data?.active === true)
    }

    void loadAdministrationAccess()

    return () => {
      mounted = false
    }
  }, [session?.user.id])

  useEffect(() => {
    let mounted = true

    async function loadNotifications() {
      if (!session?.user.id) {
        if (mounted) setMaintenanceAlerts([])
        return
      }

      setNotificationsLoading(true)

      const { data: assignment, error: assignmentError } = await supabase
        .from('user_hotel_roles')
        .select('hotel_id')
        .eq('user_id', session.user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (assignmentError || !assignment?.hotel_id) {
        if (mounted) {
          setMaintenanceAlerts([])
          setNotificationsLoading(false)
        }
        return
      }

      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select('id')
        .eq('id', assignment.hotel_id)
        .eq('active', true)
        .maybeSingle()

      if (hotelError || !hotel) {
        if (mounted) {
          setMaintenanceAlerts([])
          setNotificationsLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('id, alert_type, severity, title, message, due_date, triggered_at')
        .eq('hotel_id', hotel.id)
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false })
        .limit(20)

      if (!mounted) return

      setMaintenanceAlerts(error ? [] : ((data ?? []) as MaintenanceAlert[]))
      setNotificationsLoading(false)
    }

    void loadNotifications()

    return () => {
      mounted = false
    }
  }, [session?.user.id])

  async function refreshNotifications() {
    if (!session?.user.id) return

    setNotificationsLoading(true)

    const { data: assignment, error: assignmentError } = await supabase
      .from('user_hotel_roles')
      .select('hotel_id')
      .eq('user_id', session.user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (assignmentError || !assignment?.hotel_id) {
      setMaintenanceAlerts([])
      setNotificationsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('maintenance_alerts')
      .select('id, alert_type, severity, title, message, due_date, triggered_at')
      .eq('hotel_id', assignment.hotel_id)
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false })
      .limit(20)

    setMaintenanceAlerts(error ? [] : ((data ?? []) as MaintenanceAlert[]))
    setNotificationsLoading(false)
  }

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)
    const { error } = await ariasAuth.signOut()

    if (error) {
      setSigningOut(false)
      return
    }

    setUserMenuOpen(false)
    navigate('/login', { replace: true })
  }

  const filteredRegisters = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    if (!query) return registers

    return registers.filter((register) => {
      const haystack = [register.name]
        .join(' ')
        .toLocaleLowerCase('es')
      return haystack.includes(query)
    })
  }, [search])

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-2 text-slate-900 sm:px-4 sm:py-3">
      <div className="mx-auto w-full">
        <div className="mb-2 flex justify-center px-1 sm:mb-2">
          <BrandLogo
            onActivate={() => window.location.reload()}
            label="Actualizar Arias Suite"
            className="h-14 w-auto object-contain sm:h-16"
          />
        </div>

        <div className="mx-auto w-full px-2 sm:px-3 md:px-5 lg:px-[clamp(48px,5.5vw,90px)]">
          <header className="mb-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar en Arias Suite..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </label>

            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                <span className="hidden text-xs font-medium sm:inline">
                  {isFullscreen ? 'Salir' : 'Pantalla completa'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  setAdminMenuOpen(false)
                  alertsGridRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                }}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                title="Avisos"
                aria-label="Avisos"
              >
                <Bell size={18} />
                {maintenanceAlerts.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold leading-3 text-white">
                    {maintenanceAlerts.length > 9 ? '9+' : maintenanceAlerts.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                title="Ayuda"
                aria-label="Ayuda"
              >
                <CircleHelp size={18} />
              </button>
              {isPlatformAdmin && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen((open) => !open)
                      setUserMenuOpen(false)
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    title="Administración"
                    aria-label="Administración"
                    aria-expanded={adminMenuOpen}
                    aria-haspopup="menu"
                  >
                    <Settings size={18} />
                  </button>

                  {adminMenuOpen && (
                    <div
                      className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                      role="menu"
                    >
                      <div className="border-b border-slate-100 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-800">
                          Administración
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          Gestión de accesos
                        </div>
                      </div>

                      <div className="p-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAdminMenuOpen(false)
                            navigate('/users')
                          }}
                          className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          Usuarios
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAdminMenuOpen(false)
                            navigate('/roles')
                          }}
                          className="mt-0.5 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          Roles y permisos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((open) => !open)
                    setAdminMenuOpen(false)
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  title="Usuario"
                  aria-label="Usuario"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <UserRound size={18} />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                    role="menu"
                  >
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {session?.user.fullName || 'Usuario'}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {session?.user.email || 'Sin correo'}
                      </div>
                    </div>

                    <div className="p-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false)
                          navigate('/profile')
                        }}
                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        Mi perfil
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleSignOut()}
                        disabled={signingOut}
                        className="mt-0.5 flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </header>
        </div>

        <main>
          <div className="mx-auto grid w-full grid-cols-2 justify-center gap-2 px-2 sm:grid-cols-4 sm:px-3 md:grid-cols-5 md:px-5 lg:grid-cols-7 lg:gap-2.5 lg:px-[clamp(48px,5.5vw,90px)]">
            {filteredRegisters.map((register) => (
              <button
                key={register.name}
                type="button"
                onClick={() => {
                  if (register.path) navigate(register.path)
                }}
                disabled={register.comingSoon}
                className="group flex min-h-[100px] flex-col items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-2 hover:scale-[1.025] hover:border-slate-300 hover:shadow-[0_18px_32px_rgba(15,23,42,0.18)] active:translate-y-0 active:scale-[0.99]"
              >
                <div className="flex min-h-[66px] flex-1 flex-col items-center justify-center px-2 py-1.5">
                  <span className="text-[34px] leading-none transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110">
                    {register.icon}
                  </span>
                  <span className="mt-1.5 text-center text-[10px] font-normal leading-tight text-slate-700">
                    {register.name}
                  </span>
                </div>

                <div className="border-t border-slate-200 px-2.5 py-1.5 text-center text-[9px] text-slate-400">
                  {register.comingSoon ? 'En preparación' : 'Abrir módulo'}
                </div>
              </button>
            ))}
          </div>

          {filteredRegisters.length === 0 && (
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No se encontraron módulos para «{search}».
            </div>
          )}
          <div className="mx-auto mt-2 w-full px-2 sm:mt-3 sm:px-3 md:px-5 lg:px-[clamp(48px,5.5vw,90px)]">
            <section
              ref={alertsGridRef}
              className="w-full scroll-mt-4 rounded-2xl border border-slate-200 bg-white shadow-lg"
              aria-label="Avisos"
            >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Avisos</h2>
                <p className="text-[11px] text-slate-500">
                  Alertas activas de mantenimiento
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshNotifications()}
                disabled={notificationsLoading}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {notificationsLoading ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>

            <div className="h-[220px] overflow-y-auto p-2 md:hidden">
              <div className="space-y-2">
                {maintenanceAlerts.map((alert) => {
                  const statusClass =
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700'
                      : alert.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'

                  const statusLabel =
                    alert.alert_type === 'OUT_OF_RANGE'
                      ? 'Fuera de rango'
                      : alert.alert_type === 'OVERDUE_REVIEW'
                        ? 'Vencido'
                        : alert.alert_type === 'DUE_TODAY'
                          ? 'Vence hoy'
                          : 'Próximo'

                  return (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => navigate('/maintenance')}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-800">{alert.title}</div>
                          <div className="mt-1 line-clamp-2 text-[10px] text-slate-500">{alert.message}</div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${statusClass}`}>{statusLabel}</span>
                      </div>
                      <div className="mt-2 flex gap-3 text-[9px] text-slate-400">
                        <span>Prevista: {alert.due_date ? new Date(alert.due_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</span>
                        <span>Generado: {new Date(alert.triggered_at).toLocaleDateString('es-ES')}</span>
                      </div>
                    </button>
                  )
                })}

                {!notificationsLoading && maintenanceAlerts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
                    No hay avisos activos.
                  </div>
                )}

                {notificationsLoading && (
                  <div className="p-8 text-center text-xs text-slate-400">Cargando avisos…</div>
                )}
              </div>
            </div>

            <div className="hidden md:block h-[220px] overflow-y-auto">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Aviso</th>
                    <th className="px-3 py-2 font-semibold">Fecha prevista</th>
                    <th className="px-3 py-2 font-semibold">Generado</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceAlerts.map((alert) => {
                    const statusClass =
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700'
                        : alert.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'

                    const statusLabel =
                      alert.alert_type === 'OUT_OF_RANGE'
                        ? 'Fuera de rango'
                        : alert.alert_type === 'OVERDUE_REVIEW'
                          ? 'Vencido'
                          : alert.alert_type === 'DUE_TODAY'
                            ? 'Vence hoy'
                            : 'Próximo'

                    return (
                      <tr
                        key={alert.id}
                        onClick={() => navigate('/maintenance')}
                        className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="max-w-[520px] px-3 py-2">
                          <div className="truncate font-semibold text-slate-800">
                            {alert.title}
                          </div>
                          <div className="truncate text-[10px] text-slate-500">
                            {alert.message}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {alert.due_date
                            ? new Date(alert.due_date + 'T12:00:00').toLocaleDateString('es-ES')
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                          {new Date(alert.triggered_at).toLocaleString('es-ES')}
                        </td>
                      </tr>
                    )
                  })}

                  {!notificationsLoading && maintenanceAlerts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-5 text-center text-xs text-slate-400">
                        No hay avisos activos.
                      </td>
                    </tr>
                  )}

                  {notificationsLoading && (
                    <tr>
                      <td colSpan={4} className="px-3 py-5 text-center text-xs text-slate-400">
                        Cargando avisos…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </section>
          </div>

        </main>
      </div>
    </div>
  )
}
