import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, FilterX, Lock, RefreshCw, Unlock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'
import ActionButton from '../../../shared/components/buttons/ActionButton'
import GridViewport from '../../../shared/components/grid/GridViewport'
import { useGridKeyboardNavigation } from '../../../shared/components/grid/useGridKeyboardNavigation'
import { useHotelScope } from '../../../shared/context/HotelScopeContext'
import { supabase } from '../../../lib/supabase'

type PendingItem = {
  id: string
  hotel_id: string
  location: string | null
  category: string | null
  pending: string
  status: 'PENDING' | 'COMPLETED'
  source_status: string | null
  assigned_to: string | null
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  source_priority: string | null
  observation: string | null
  source_date: string | null
  source_file: string
  source_row: number
}

const statusLabels = {
  PENDING: 'Pendiente',
  COMPLETED: 'Terminado',
} as const

const priorityLabels = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
} as const

function priorityClass(priority: PendingItem['priority']) {
  if (priority === 'HIGH' || priority === 'CRITICAL') return 'bg-rose-100 text-rose-700'
  return priority === 'NORMAL' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'
}

function statusClass(status: PendingItem['status']) {
  return status === 'COMPLETED'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-700'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value + 'T12:00:00').toLocaleDateString('es-ES')
}

function isRoomLocation(value: string | null) {
  return !!value && /^\\d{3,4}$/.test(value.trim())
}

export default function MaintenancePendingPage() {
  const navigate = useNavigate()
  const { hotel } = useHotelScope()
  const [items, setItems] = useState<PendingItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [priority, setPriority] = useState<'ALL' | PendingItem['priority']>('ALL')
  const [assigned, setAssigned] = useState('ALL')
  const [status, setStatus] = useState<'ALL' | PendingItem['status']>('PENDING')
  const [blockedFilter, setBlockedFilter] = useState<'ALL' | 'BLOCKED' | 'UNBLOCKED'>('ALL')
  const [blockedRooms, setBlockedRooms] = useState<Set<string>>(new Set())
  const [updatingRoom, setUpdatingRoom] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadItems() {
    if (!hotel?.id) {
      setItems([])
      setSelectedId('')
      setLoading(false)
      setError('No se ha seleccionado un hotel de trabajo.')
      return
    }

    setLoading(true)
    setError('')

    const [result, blockedResult] = await Promise.all([
      supabase
        .from('maintenance_pending_items')
        .select('id, hotel_id, location, category, pending, status, source_status, assigned_to, priority, source_priority, observation, source_date, source_file, source_row')
        .eq('hotel_id', hotel.id)
        .eq('active', true)
        .order('source_date', { ascending: true, nullsFirst: false })
        .order('source_row', { ascending: true }),
      supabase
        .from('maintenance_blocked_rooms')
        .select('room_number')
        .eq('hotel_id', hotel.id)
        .order('room_number', { ascending: true }),
    ])

    if (result.error) {
      setItems([])
      setSelectedId('')
      setError(result.error.message)
      setLoading(false)
      return
    }

    if (blockedResult.error) {
      setItems([])
      setSelectedId('')
      setError(blockedResult.error.message)
      setLoading(false)
      return
    }

    const loaded = (result.data ?? []) as PendingItem[]
    const blocked = new Set(
      ((blockedResult.data ?? []) as Array<{ room_number: string }>).map((item) => item.room_number.trim()),
    )

    setItems(loaded)
    setBlockedRooms(blocked)
    setSelectedId((current) => loaded.some((item) => item.id === current) ? current : (loaded[0]?.id ?? ''))
    setLoading(false)
  }

  useEffect(() => {
    void loadItems()
  }, [hotel?.id])

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'es')),
    [items],
  )

  const assignees = useMemo(
    () => Array.from(new Set(items.map((item) => item.assigned_to).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'es')),
    [items],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')

    return items.filter((item) => {
      if (status !== 'ALL' && item.status !== status) return false
      if (category !== 'ALL' && item.category !== category) return false
      if (priority !== 'ALL' && item.priority !== priority) return false
      if (assigned !== 'ALL' && (item.assigned_to ?? 'UNASSIGNED') !== assigned) return false

      const roomLocation = item.location?.trim() ?? ''
      const roomIsBlocked = isRoomLocation(roomLocation) && blockedRooms.has(roomLocation)
      if (blockedFilter === 'BLOCKED' && !roomIsBlocked) return false
      if (blockedFilter === 'UNBLOCKED' && (!isRoomLocation(roomLocation) || roomIsBlocked)) return false

      if (!query) return true

      return [
        item.location,
        item.category,
        item.pending,
        item.assigned_to,
        item.observation,
        item.source_status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')
        .includes(query)
    })
  }, [items, status, category, priority, assigned, blockedFilter, blockedRooms, search])

  const counts = useMemo(() => ({
    pending: items.filter((item) => item.status === 'PENDING').length,
    high: items.filter((item) => item.status === 'PENDING' && (item.priority === 'HIGH' || item.priority === 'CRITICAL')).length,
    completed: items.filter((item) => item.status === 'COMPLETED').length,
    blockedRooms: blockedRooms.size,
  }), [items, blockedRooms])

  const selected = filtered.find((item) => item.id === selectedId) ?? null

  const gridIds = useMemo(() => filtered.map((item) => item.id), [filtered])

  const { currentIndex, moveSelection, getGridProps, getRowProps } = useGridKeyboardNavigation({
    ids: gridIds,
    selectedId,
    onSelectedIdChange: setSelectedId,
    onOpen: () => {},
    autoFocusFirst: true,
  })

  function clearFilters() {
    setSearch('')
    setCategory('ALL')
    setPriority('ALL')
    setAssigned('ALL')
    setStatus('PENDING')
    setBlockedFilter('ALL')
  }

  function applySummaryFilter(kind: 'PENDING' | 'HIGH' | 'COMPLETED' | 'BLOCKED') {
    setSearch('')
    setCategory('ALL')
    setAssigned('ALL')

    if (kind === 'PENDING') {
      setStatus('PENDING')
      setPriority('ALL')
      setBlockedFilter('ALL')
      return
    }

    if (kind === 'HIGH') {
      setStatus('PENDING')
      setPriority('HIGH')
      setBlockedFilter('ALL')
      return
    }

    if (kind === 'COMPLETED') {
      setStatus('COMPLETED')
      setPriority('ALL')
      setBlockedFilter('ALL')
      return
    }

    setStatus('PENDING')
    setPriority('ALL')
    setBlockedFilter('BLOCKED')
  }

  async function toggleRoomBlocked(location: string) {
    if (!hotel?.id || !isRoomLocation(location)) return

    const roomNumber = location.trim()
    const isBlocked = blockedRooms.has(roomNumber)
    setUpdatingRoom(roomNumber)
    setError('')

    if (isBlocked) {
      const result = await supabase
        .from('maintenance_blocked_rooms')
        .delete()
        .eq('hotel_id', hotel.id)
        .eq('room_number', roomNumber)

      if (result.error) {
        setError(result.error.message)
      } else {
        setBlockedRooms((current) => {
          const next = new Set(current)
          next.delete(roomNumber)
          return next
        })
      }
    } else {
      const result = await supabase
        .from('maintenance_blocked_rooms')
        .insert({ hotel_id: hotel.id, room_number: roomNumber })

      if (result.error) {
        setError(result.error.message)
      } else {
        setBlockedRooms((current) => {
          const next = new Set(current)
          next.add(roomNumber)
          return next
        })
      }
    }

    setUpdatingRoom(null)
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight sm:text-2xl">Pendientes</h1>
                <p className="text-xs text-slate-500 sm:text-sm">Backlog operativo de mantenimiento del hotel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton icon={RefreshCw} label="Actualizar" title="Actualizar" onClick={() => void loadItems()} disabled={loading} />
              <BackButton onBack={() => navigate('/maintenance')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => applySummaryFilter('PENDING')}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendientes</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{counts.pending}</div>
          </button>
          <button
            type="button"
            onClick={() => applySummaryFilter('HIGH')}
            className="rounded-2xl border border-rose-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">Prioridad alta</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{counts.high}</div>
          </button>
          <button
            type="button"
            onClick={() => applySummaryFilter('COMPLETED')}
            className="rounded-2xl border border-emerald-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Terminados</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{counts.completed}</div>
          </button>
          <button
            type="button"
            onClick={() => applySummaryFilter('BLOCKED')}
            className="rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Habitaciones bloqueadas</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{counts.blockedRooms}</div>
          </button>
        </section>

        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_170px_190px_180px_180px]">
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ubicación, pendiente, categoría, proveedor…" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="PENDING">Pendientes</option>
                <option value="COMPLETED">Terminados</option>
                <option value="ALL">Todos</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Categoría</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="ALL">Todas</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridad</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="ALL">Todas</option>
                <option value="CRITICAL">Crítica</option>
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baja</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Asignado</span>
              <select value={assigned} onChange={(event) => setAssigned(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="ALL">Todos</option>
                <option value="UNASSIGNED">Sin asignar</option>
                {assignees.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Habitación</span>
              <select value={blockedFilter} onChange={(event) => setBlockedFilter(event.target.value as typeof blockedFilter)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="ALL">Todas</option>
                <option value="BLOCKED">Bloqueadas</option>
                <option value="UNBLOCKED">No bloqueadas</option>
              </select>
            </label>
          </div>

          {(search || category !== 'ALL' || priority !== 'ALL' || assigned !== 'ALL' || blockedFilter !== 'ALL' || status !== 'PENDING') && (
            <div className="mt-3 flex justify-end">
              <ActionButton icon={FilterX} label="Limpiar filtros" onClick={clearFilters} className="min-h-9 px-3 py-1.5 text-xs" />
            </div>
          )}
        </section>

        <main className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.5fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Listado de pendientes</div>
                <div className="text-xs text-slate-400">Importado del registro PENDIENTES</div>
              </div>
              <span className="text-xs text-slate-500">{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</span>
            </div>

            <GridViewport className="max-h-[calc(100vh-400px)]">
              <div {...getGridProps()} className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-200">
              <table className="min-w-[1080px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5">Ubicación</th>
                    <th className="px-3 py-2.5">Categoría</th>
                    <th className="px-3 py-2.5">Pendiente</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5">Asignado a</th>
                    <th className="px-3 py-2.5">Prioridad</th>
                    <th className="px-3 py-2.5">Bloqueada</th>
                    <th className="px-3 py-2.5">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const selectedRow = item.id === selectedId
                    const rowProps = getRowProps(item.id)
                    return (
                      <tr key={item.id} {...rowProps} onClick={() => setSelectedId(item.id)} className={`border-b last:border-b-0 ${selectedRow ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-3 font-semibold text-slate-800">{item.location ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{item.category ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-800">
                          <div className="font-semibold">{item.pending}</div>
                          {item.observation && <div className="mt-0.5 max-w-[360px] truncate text-xs text-slate-400">{item.observation}</div>}
                        </td>
                        <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{statusLabels[item.status]}</span></td>
                        <td className="px-3 py-3 text-slate-600">{item.assigned_to ?? 'Sin asignar'}</td>
                        <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(item.priority)}`}>{priorityLabels[item.priority]}</span></td>
                        <td className="px-3 py-3">
                          {isRoomLocation(item.location) ? (
                            <div className="flex items-center gap-2">
                              <IconButton
                                icon={blockedRooms.has(item.location!.trim()) ? Lock : Unlock}
                                label={blockedRooms.has(item.location!.trim()) ? 'Desbloquear habitación' : 'Bloquear habitación'}
                                title={blockedRooms.has(item.location!.trim()) ? 'Desbloquear habitación' : 'Bloquear habitación'}
                                onClick={() => void toggleRoomBlocked(item.location!)}
                                disabled={updatingRoom === item.location!.trim()}
                                className={`h-9 w-9 ${blockedRooms.has(item.location!.trim()) ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}`}
                              />
                              <span className={`text-xs font-semibold ${blockedRooms.has(item.location!.trim()) ? 'text-amber-700' : 'text-slate-400'}`}>
                                {blockedRooms.has(item.location!.trim()) ? 'Sí' : 'No'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{formatDate(item.source_date)}</td>
                      </tr>
                    )
                  })}
                  {!loading && filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">No hay pendientes para estos filtros.</td></tr>}
                </tbody>
              </table>
              </div>
            </GridViewport>

            <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
              <span className="text-[11px] text-slate-500">{filtered.length === 0 ? 'Sin pendientes' : `${currentIndex + 1} / ${filtered.length}`}</span>
              <div className="flex items-center gap-1">
                <IconButton icon={ChevronUp} label="Pendiente anterior" title="Pendiente anterior" onClick={() => moveSelection(currentIndex - 1)} disabled={filtered.length === 0 || currentIndex === 0} className="h-9 w-9" />
                <IconButton icon={ChevronDown} label="Pendiente siguiente" title="Pendiente siguiente" onClick={() => moveSelection(currentIndex + 1)} disabled={filtered.length === 0 || currentIndex === filtered.length - 1} className="h-9 w-9" />
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b px-4 py-3 text-sm font-semibold">Detalle del pendiente</div>
            {selected ? (
              <div className="space-y-4 p-4">
                <div>
                  <div className="text-xl font-bold text-slate-900">{selected.pending}</div>
                  <div className="mt-1 text-sm text-slate-500">{selected.category ?? 'Sin categoría'} · {selected.location ?? 'Sin ubicación'}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(selected.status)}`}>{statusLabels[selected.status]}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(selected.priority)}`}>{priorityLabels[selected.priority]}</span>
                  </div>
                </div>
                <div className="grid gap-2 rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
                  <div><strong>Asignado a:</strong> {selected.assigned_to ?? 'Sin asignar'}</div>
                  <div><strong>Fecha:</strong> {formatDate(selected.source_date)}</div>
                  {isRoomLocation(selected.location) && (
                    <div className="flex items-center gap-2">
                      <strong>Habitación:</strong>
                      <span className={`font-semibold ${blockedRooms.has(selected.location!.trim()) ? 'text-amber-700' : 'text-slate-500'}`}>
                        {blockedRooms.has(selected.location!.trim()) ? 'Bloqueada' : 'No bloqueada'}
                      </span>
                    </div>
                  )}
                  {selected.observation && <div><strong>Observación:</strong> {selected.observation}</div>}
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">Selecciona un pendiente.</div>
            )}
          </aside>
        </main>
      </div>
    </div>
  )
}
