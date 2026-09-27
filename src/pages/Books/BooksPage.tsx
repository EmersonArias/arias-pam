import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CircleHelp,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import BrandLogo from '../../shared/components/branding/BrandLogo'
import { useAuth } from '../../features/auth/context/AuthProvider'
import { ariasAuth } from '../../core/auth/authService'
import { supabase } from '../../lib/supabase'

type MaintenanceAlert = {
  id: string
  alert_type: 'UPCOMING_REVIEW' | 'DUE_TODAY' | 'OVERDUE_REVIEW' | 'OUT_OF_RANGE'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  due_date: string | null
  triggered_at: string
}

const registers = [
  { icon: '📋', name: 'PAM', path: '/pam' },
  { icon: '⚙️', name: 'Equipos e instalaciones', path: '/apparatusregistry' },
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
]

export default function BooksPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

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

  function alertSeverityClass(severity: MaintenanceAlert['severity']) {
    if (severity === 'CRITICAL') return 'border-rose-200 bg-rose-50 text-rose-800'
    if (severity === 'WARNING') return 'border-amber-200 bg-amber-50 text-amber-800'
    return 'border-slate-200 bg-slate-50 text-slate-700'
  }

  function alertTypeLabel(type: MaintenanceAlert['alert_type']) {
    if (type === 'OUT_OF_RANGE') return 'Fuera de rango'
    if (type === 'OVERDUE_REVIEW') return 'Vencido'
    if (type === 'DUE_TODAY') return 'Vence hoy'
    return 'Próximo'
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
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto w-full">
        <div className="mb-3 flex justify-center px-1 sm:mb-4">
          <BrandLogo
            onActivate={() => window.location.reload()}
            label="Actualizar Arias Suite"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </div>

        <div className="mx-auto w-full px-2 sm:px-3 md:px-5 lg:px-[clamp(48px,5.5vw,90px)]">
          <header className="mb-5 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-4">
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </label>

            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen((open) => !open)
                    setUserMenuOpen(false)
                    setAdminMenuOpen(false)
                    if (!notificationOpen) void refreshNotifications()
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  title="Notificaciones"
                  aria-label="Notificaciones"
                  aria-expanded={notificationOpen}
                  aria-haspopup="dialog"
                >
                  <Bell size={18} />
                  {maintenanceAlerts.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold leading-3 text-white">
                      {maintenanceAlerts.length > 9 ? '9+' : maintenanceAlerts.length}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div
                    className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                    role="dialog"
                    aria-label="Notificaciones"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Notificaciones</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          Alertas activas de mantenimiento
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void refreshNotifications()}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Actualizar
                      </button>
                    </div>

                    <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
                      {notificationsLoading ? (
                        <div className="px-2 py-6 text-center text-sm text-slate-500">
                          Cargando alertas…
                        </div>
                      ) : maintenanceAlerts.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-slate-500">
                          No hay alertas activas.
                        </div>
                      ) : (
                        maintenanceAlerts.map((alert) => (
                          <button
                            key={alert.id}
                            type="button"
                            onClick={() => navigate('/maintenance')}
                            className="w-full rounded-xl border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <div className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${alertSeverityClass(alert.severity)}`}>
                              {alertTypeLabel(alert.alert_type)}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-slate-800">
                              {alert.title}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-600">
                              {alert.message}
                            </div>
                            {alert.due_date && (
                              <div className="mt-2 text-[10px] text-slate-400">
                                Fecha prevista: {new Date(alert.due_date + 'T12:00:00').toLocaleDateString('es-ES')}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
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
          <div className="mx-auto grid w-full grid-cols-3 justify-center gap-2 px-2 sm:grid-cols-4 sm:px-3 md:grid-cols-5 md:px-5 lg:grid-cols-7 lg:gap-3 lg:px-[clamp(48px,5.5vw,90px)]">
            {filteredRegisters.map((register) => (
              <button
                key={register.name}
                type="button"
                onClick={() => navigate(register.path)}
                className="group flex min-h-[98px] flex-col items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-2 hover:scale-[1.025] hover:border-slate-300 hover:shadow-[0_18px_32px_rgba(15,23,42,0.18)] active:translate-y-0 active:scale-[0.99]"
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
                  Abrir módulo
                </div>
              </button>
            ))}
          </div>

          {filteredRegisters.length === 0 && (
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No se encontraron módulos para «{search}».
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
