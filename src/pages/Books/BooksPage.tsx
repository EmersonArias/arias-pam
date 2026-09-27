import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CircleHelp,
  Search,
  UserRound,
} from 'lucide-react'
import BrandLogo from '../../shared/components/branding/BrandLogo'
import { useAuth } from '../../features/auth/context/AuthProvider'
import { ariasAuth } from '../../core/auth/authService'

const registers = [
  {
    icon: '📋',
    name: 'PAM',
    path: '/pam',
    info: '18 trabajos hoy',
    detail: '4 vencidos',
  },
  {
    icon: '⚙️',
    name: 'Aparatos',
    path: '/apparatusregistry',
    info: '6 revisiones pendientes',
    detail: '2 vencidas',
  },
  {
    icon: '🏊',
    name: 'Piscinas',
    path: '/pools',
    info: '2 controles pendientes',
    detail: '1 vence hoy',
  },
  {
    icon: '♨️',
    name: 'Spa',
    path: '/spa',
    info: '1 control pendiente',
    detail: 'sin vencidos',
  },
  {
    icon: '🦠',
    name: 'Legionella',
    path: '/legionella',
    info: '1 control pendiente',
    detail: 'vence mañana',
  },
  {
    icon: '💧',
    name: 'Bombas',
    path: '/pumps',
    info: '1 incidencia abierta',
    detail: 'requiere atención',
  },
  {
    icon: '🌬️',
    name: 'Climatizadores',
    path: '/climatizers',
    info: '3 trabajos pendientes',
    detail: '1 vencido',
  },
  {
    icon: '❄️',
    name: 'Fancoils',
    path: '/fancoils',
    info: '2 revisiones pendientes',
    detail: 'próxima: hoy',
  },
  {
    icon: '⚡',
    name: 'Cuadros BT',
    path: '/electricalpanels',
    info: '1 revisión pendiente',
    detail: 'vence en 3 días',
  },
  {
    icon: '💡',
    name: 'Fotoluminiscentes',
    path: '/photoluminescent',
    info: 'sin pendientes',
    detail: 'todo al día',
  },
  {
    icon: '🔦',
    name: 'Emergencia',
    path: '/emergencylights',
    info: '4 revisiones pendientes',
    detail: '1 vencida',
  },
  {
    icon: '🚪',
    name: 'Cortafuegos',
    path: '/firedoors',
    info: '2 revisiones pendientes',
    detail: 'sin vencidos',
  },
  {
    icon: '🧯',
    name: 'PCI',
    path: '/fireequipment',
    info: '3 revisiones pendientes',
    detail: '1 vence hoy',
  },
  {
    icon: '📏',
    name: 'Calibraciones',
    path: '/calibrations',
    info: '1 calibración próxima',
    detail: '02/10',
  },
  {
    icon: '👤',
    name: 'Usuarios',
    path: '/users',
    info: 'Administración de usuarios',
    detail: 'Accesos y roles',
  },
  {
    icon: '🛡️',
    name: 'Roles',
    path: '/roles',
    info: 'Roles y permisos',
    detail: 'Configuración de accesos',
  },
  {
    icon: '📄',
    name: 'Informes',
    path: '/reports',
    info: 'Ver e imprimir informes',
    detail: 'Informes disponibles',
  },
]

export default function BooksPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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
      const haystack = [register.name, register.info, register.detail]
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
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                title="Notificaciones"
                aria-label="Notificaciones"
              >
                <Bell size={18} />
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                title="Ayuda"
                aria-label="Ayuda"
              >
                <CircleHelp size={18} />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
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

                <div className="flex flex-col items-center justify-center border-t border-slate-200 px-2.5 py-1.5 text-center">
                  <div className="w-full truncate text-[10px] font-normal leading-tight text-slate-700 text-center">
                    {register.info}
                  </div>
                  <div className="w-full truncate text-[9px] font-normal leading-tight text-slate-400 text-center">
                    {register.detail}
                  </div>
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
