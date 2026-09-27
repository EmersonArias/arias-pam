import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import ActionButton from '../../../shared/components/buttons/ActionButton'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'

type Profile = { id: string; full_name: string | null; email: string | null; active: boolean }
type Hotel = { id: string; name: string; code: string }
type Role = { id: string; name: string; code: string }
type UserHotelRole = { user_id: string; hotel_id: string; role_id: string; active: boolean }
type UserRow = Profile & { assignments: Array<{ hotelName: string; hotelCode: string; roleName: string; roleCode: string; active: boolean }> }

export default function UsersPage() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userHotelRoles, setUserHotelRoles] = useState<UserHotelRole[]>([])
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    const [profilesResult, hotelsResult, rolesResult, assignmentsResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, active').order('full_name', { ascending: true }),
      supabase.from('hotels').select('id, name, code').order('name', { ascending: true }),
      supabase.from('roles').select('id, name, code').order('name', { ascending: true }),
      supabase.from('user_hotel_roles').select('user_id, hotel_id, role_id, active'),
    ])
    const firstError = profilesResult.error ?? hotelsResult.error ?? rolesResult.error ?? assignmentsResult.error
    if (firstError) { setError('No se han podido cargar los usuarios.'); setLoading(false); return }
    setProfiles(profilesResult.data ?? [])
    setHotels(hotelsResult.data ?? [])
    setRoles(rolesResult.data ?? [])
    setUserHotelRoles(assignmentsResult.data ?? [])
    setLoading(false)
  }

  useEffect(() => { void loadData() }, [])

  const rows = useMemo<UserRow[]>(() => {
    const hotelById = new Map(hotels.map((hotel) => [hotel.id, hotel]))
    const roleById = new Map(roles.map((role) => [role.id, role]))
    return profiles.map((profile) => ({
      ...profile,
      assignments: userHotelRoles
        .filter((assignment) => assignment.user_id === profile.id)
        .map((assignment) => {
          const hotel = hotelById.get(assignment.hotel_id)
          const role = roleById.get(assignment.role_id)
          return {
            hotelName: hotel?.name ?? 'Hotel no disponible',
            hotelCode: hotel?.code ?? '—',
            roleName: role?.name ?? 'Rol no disponible',
            roleCode: role?.code ?? '—',
            active: assignment.active,
          }
        }),
    }))
  }, [hotels, profiles, roles, userHotelRoles])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    if (!query) return rows
    return rows.filter((row) => {
      const haystack = [row.full_name ?? '', row.email ?? '', ...row.assignments.flatMap((assignment) => [assignment.hotelName, assignment.hotelCode, assignment.roleName, assignment.roleCode])].join(' ').toLocaleLowerCase('es')
      return haystack.includes(query)
    })
  }, [rows, search])

  const selectedUser = rows.find((row) => row.id === selectedUserId) ?? null

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-3 flex items-center justify-between px-1 sm:mb-4">
          <BrandLogo label="Inicio Arias Suite" onActivate={() => navigate('/')} className="h-14 w-auto object-contain sm:h-16" />
          <div className="flex items-center gap-2">
            <BackButton onBack={() => navigate(-1)} />
            <HomeButton onHome={() => navigate('/')} />
          </div>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UsersRound size={21} className="text-slate-500" />
                <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
              </div>
              <p className="mt-1 text-sm text-slate-500">Usuarios y accesos a hoteles de Arias Suite.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[240px]">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white" />
              </label>
              <ActionButton icon={UserPlus} label="Nuevo usuario" onClick={() => setError('La creación de la cuenta se conectará al servicio seguro de administración de usuarios.')} />
            </div>
          </div>
        </header>

        <main className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? <div className="p-8 text-center text-sm text-slate-500">Cargando usuarios…</div> : error ? <div className="p-8 text-center text-sm text-slate-600">{error}<div className="mt-4"><ActionButton label="Reintentar" onClick={() => void loadData()} /></div></div> : filteredRows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No se encontraron usuarios.</div> : (
              <div className="overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Usuario</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Hoteles</th><th className="px-4 py-3 font-semibold">Rol</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => {
                      const activeAssignments = row.assignments.filter((assignment) => assignment.active)
                      return <tr key={row.id} onClick={() => setSelectedUserId(row.id)} className={['cursor-pointer transition hover:bg-slate-50', selectedUserId === row.id ? 'bg-blue-50/60' : ''].join(' ')}>
                        <td className="px-4 py-3"><div className="font-medium text-slate-800">{row.full_name || 'Sin nombre'}</div><div className="mt-0.5 text-xs text-slate-500">{row.email || 'Sin correo'}</div></td>
                        <td className="px-4 py-3"><span className={row.active ? 'text-slate-700' : 'text-slate-400'}>{row.active ? 'Activo' : 'Inactivo'}</span></td>
                        <td className="px-4 py-3 text-slate-700">{activeAssignments.length}</td>
                        <td className="px-4 py-3 text-slate-700">{activeAssignments.length === 0 ? 'Sin asignación' : activeAssignments.length === 1 ? activeAssignments[0].roleName : activeAssignments.length + ' roles'}</td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedUser ? <div className="flex min-h-[260px] items-center justify-center text-center"><div><UsersRound size={34} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">Selecciona un usuario</p><p className="mt-1 text-xs text-slate-400">Aquí veremos sus hoteles y roles.</p></div></div> : (
              <>
                <div><h2 className="text-lg font-semibold text-slate-900">{selectedUser.full_name || 'Sin nombre'}</h2><p className="mt-1 text-sm text-slate-500">{selectedUser.email || 'Sin correo'}</p><div className="mt-3 text-xs text-slate-500">Estado: {selectedUser.active ? 'Activo' : 'Inactivo'}</div></div>
                <div className="mt-6"><h3 className="text-sm font-semibold text-slate-700">Accesos</h3>{selectedUser.assignments.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Este usuario todavía no tiene hoteles asignados.</p> : <div className="mt-3 space-y-2">{selectedUser.assignments.map((assignment) => <div key={assignment.hotelCode + assignment.roleCode} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"><div className="font-medium text-slate-800">{assignment.hotelName}</div><div className="mt-1 text-xs text-slate-500">{assignment.roleName}{!assignment.active && ' · acceso inactivo'}</div></div>)}</div>}</div>
              </>
            )}
          </aside>
        </main>
      </div>
    </div>
  )
}