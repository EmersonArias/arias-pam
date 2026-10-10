import { useEffect, useMemo, useState } from 'react'
import { Archive, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, CornerUpLeft, FilterX, House, Lock, Pencil, Plus, RefreshCw, RotateCcw, Search, SlidersHorizontal, Trash2, Unlock, X } from 'lucide-react'
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
  active: boolean
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
  return !!value && /^[0-9]{3,4}$/.test(value.trim())
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
  const [showHistory, setShowHistory] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingCreate, setSavingCreate] = useState(false)
  const emptyForm = {
    location: '',
    category: '',
    pending: '',
    priority: 'NORMAL' as PendingItem['priority'],
    assigned_to: '',
    observation: '',
  }
  const [editForm, setEditForm] = useState({
    location: '',
    category: '',
    pending: '',
    priority: 'NORMAL' as PendingItem['priority'],
    assigned_to: '',
    observation: '',
  })
  const [newForm, setNewForm] = useState(emptyForm)
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
        .select('id, hotel_id, location, category, pending, status, source_status, assigned_to, priority, source_priority, observation, source_date, source_file, source_row, active')
        .eq('hotel_id', hotel.id)
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
      if (item.active === showHistory) return false
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
  }, [items, showHistory, status, category, priority, assigned, blockedFilter, blockedRooms, search])

  const counts = useMemo(() => ({
    pending: items.filter((item) => item.active && item.status === 'PENDING').length,
    high: items.filter((item) => item.active && item.status === 'PENDING' && (item.priority === 'HIGH' || item.priority === 'CRITICAL')).length,
    completed: items.filter((item) => item.active && item.status === 'COMPLETED').length,
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

  function openEdit(item: PendingItem) {
    setSelectedId(item.id)
    setEditForm({
      location: item.location ?? '',
      category: item.category ?? '',
      pending: item.pending,
      priority: item.priority,
      assigned_to: item.assigned_to ?? '',
      observation: item.observation ?? '',
    })
    setEditing(true)
  }

  function openNew() {
    setNewForm(emptyForm)
    setError('')
    setCreating(true)
  }

  async function saveNew() {
    if (!hotel?.id || savingCreate) return

    if (!newForm.pending.trim()) {
      setError('El pendiente es obligatorio.')
      return
    }

    setSavingCreate(true)
    setError('')

    const result = await supabase
      .from('maintenance_pending_items')
      .insert({
        hotel_id: hotel.id,
        location: newForm.location.trim() || null,
        category: newForm.category.trim() || null,
        pending: newForm.pending.trim(),
        status: 'PENDING',
        source_status: 'Pendiente',
        assigned_to: newForm.assigned_to.trim() || null,
        priority: newForm.priority,
        source_priority: null,
        observation: newForm.observation.trim() || null,
        source_date: new Date().toISOString().slice(0, 10),
        source_file: 'ARIAS_SUITE',
        source_row: Date.now(),
        active: true,
      })
      .select('id')
      .single()

    if (result.error) {
      setError(result.error.message)
    } else {
      const createdId = result.data?.id as string | undefined
      setCreating(false)
      await loadItems()
      if (createdId) setSelectedId(createdId)
    }

    setSavingCreate(false)
  }

  async function saveEdit() {
    if (!selected || !hotel?.id || savingEdit) return

    if (!editForm.pending.trim()) {
      setError('El pendiente es obligatorio.')
      return
    }

    setSavingEdit(true)
    setError('')

    const result = await supabase
      .from('maintenance_pending_items')
      .update({
        location: editForm.location.trim() || null,
        category: editForm.category.trim() || null,
        pending: editForm.pending.trim(),
        priority: editForm.priority,
        assigned_to: editForm.assigned_to.trim() || null,
        observation: editForm.observation.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)
      .eq('hotel_id', hotel.id)

    if (result.error) {
      setError(result.error.message)
    } else {
      setEditing(false)
      await loadItems()
    }

    setSavingEdit(false)
  }

  async function deactivateItem(item: PendingItem) {
    if (!hotel?.id || !item.active) return

    const confirmed = window.confirm(
      '¿Quieres eliminar este pendiente del listado operativo? Se desactivará y quedará conservado en el histórico.',
    )
    if (!confirmed) return

    const result = await supabase
      .from('maintenance_pending_items')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .eq('hotel_id', hotel.id)

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadItems()
  }

  async function restoreItem(item: PendingItem) {
    if (!hotel?.id || item.active) return

    const result = await supabase
      .from('maintenance_pending_items')
      .update({
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .eq('hotel_id', hotel.id)

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadItems()
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
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-100 px-3 py-3 text-slate-900 sm:min-h-screen sm:h-auto sm:overflow-visible sm:px-5 sm:py-5 2xl:h-[100dvh] 2xl:min-h-0 2xl:overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col sm:block sm:flex-none 2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col">
        <header className="mb-3 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight sm:text-2xl">Pendientes</h1>
                <p className="text-xs text-slate-500 sm:text-sm">Backlog operativo de mantenimiento<span className="hidden sm:inline"> del hotel</span></p>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex sm:justify-end">
              {!showHistory && (
                <ActionButton
                  icon={Plus}
                  label="Nuevo pendiente"
                  onClick={openNew}
                />
              )}
              <ActionButton
                icon={showHistory ? RotateCcw : Archive}
                label={showHistory ? 'Pendientes activos' : 'Histórico'}
                onClick={() => setShowHistory((current) => !current)}
              />
              <IconButton icon={RefreshCw} label="Actualizar" title="Actualizar" onClick={() => void loadItems()} disabled={loading} />
              <BackButton onBack={() => navigate('/maintenance')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
            <div className="flex w-full items-center justify-between gap-1 sm:hidden">
              {!showHistory && (
                <IconButton
                  icon={Plus}
                  label="Nuevo pendiente"
                  title="Nuevo pendiente"
                  onClick={openNew}
                  className="h-10 w-10"
                />
              )}
              <IconButton
                icon={showHistory ? RotateCcw : Archive}
                label={showHistory ? 'Pendientes activos' : 'Histórico'}
                title={showHistory ? 'Pendientes activos' : 'Histórico'}
                onClick={() => setShowHistory((current) => !current)}
                className="h-10 w-10"
              />
              <IconButton icon={RefreshCw} label="Actualizar" title="Actualizar" onClick={() => void loadItems()} disabled={loading} className="h-10 w-10" />
              <IconButton icon={CornerUpLeft} label="Volver" title="Volver" onClick={() => navigate('/maintenance')} className="h-10 w-10" />
              <IconButton icon={House} label="Inicio" title="Inicio" onClick={() => navigate('/')} className="h-10 w-10" />
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-3 shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="mb-2 shrink-0 grid grid-cols-2 gap-1.5 sm:mb-3 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => applySummaryFilter('PENDING')}
            title="Ver pendientes"
            aria-label="Ver pendientes"
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl sm:p-3"
          >
            <div className="flex items-center justify-between gap-1 sm:block"><div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Pendientes</div><div className="shrink-0 text-base font-bold leading-none text-slate-900 sm:mt-0.5 sm:text-xl">{counts.pending}</div></div>
          </button>
          <button
            type="button"
            onClick={() => applySummaryFilter('HIGH')}
            title="Ver pendientes de prioridad alta"
            aria-label="Ver pendientes de prioridad alta"
            className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl sm:p-3"
          >
            <div className="flex items-center justify-between gap-1 sm:block"><div className="truncate text-[10px] font-semibold uppercase tracking-wide text-rose-600 sm:text-xs">Prioridad alta</div><div className="shrink-0 text-base font-bold leading-none text-slate-900 sm:mt-0.5 sm:text-xl">{counts.high}</div></div>
          </button>
          <button
            type="button"
            onClick={() => applySummaryFilter('COMPLETED')}
            title="Ver terminados"
            aria-label="Ver terminados"
            className="cursor-pointer rounded-lg border border-emerald-200 bg-white px-2 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl sm:p-3"
          >
            <div className="flex items-center justify-between gap-1 sm:block"><div className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">Terminados</div><div className="shrink-0 text-base font-bold leading-none text-slate-900 sm:mt-0.5 sm:text-xl">{counts.completed}</div></div>
          </button>
          <button
            type="button"
            onClick={() => applySummaryFilter('BLOCKED')}
            title="Ver pendientes de habitaciones bloqueadas"
            aria-label="Ver pendientes de habitaciones bloqueadas"
            className="cursor-pointer rounded-lg border border-amber-200 bg-white px-2 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl sm:p-3"
          >
            <div className="flex items-center justify-between gap-1 sm:block"><div className="truncate text-[10px] font-semibold uppercase tracking-wide text-amber-700 sm:text-xs">Bloqueadas</div><div className="shrink-0 text-base font-bold leading-none text-slate-900 sm:mt-0.5 sm:text-xl">{counts.blockedRooms}</div></div>
          </button>
        </section>

        <section className="mb-2 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:mb-3 sm:rounded-2xl sm:p-3">
          <div className="mb-1.5 flex items-center gap-2 lg:hidden">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Buscar pendientes</span>
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="Buscar pendiente o ubicación…"
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <IconButton
              icon={SlidersHorizontal}
              label={showMobileFilters ? "Ocultar filtros" : "Mostrar filtros"}
              title={showMobileFilters ? "Ocultar filtros" : "Mostrar filtros"}
              onClick={() => setShowMobileFilters((current) => !current)}
              className={`h-10 w-10 ${showMobileFilters ? 'border-blue-300 bg-blue-100' : ''}`}
            />
            {(search || category !== 'ALL' || priority !== 'ALL' || assigned !== 'ALL' || blockedFilter !== 'ALL' || status !== 'PENDING') && (
              <IconButton
                icon={FilterX}
                label="Limpiar filtros"
                title="Limpiar filtros"
                onClick={clearFilters}
                className="h-10 w-10"
              />
            )}
          </div>

          <div className={`${showMobileFilters ? 'grid' : 'hidden'} grid-cols-2 gap-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_150px_150px_160px_150px_160px] sm:gap-3`}>
            <label className="hidden lg:block lg:col-span-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="Ubicación, pendiente, categoría, proveedor…"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 sm:rounded-xl sm:px-3"
              />
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:rounded-xl sm:px-3">
                <option value="PENDING">Pendientes</option>
                <option value="COMPLETED">Terminados</option>
                <option value="ALL">Todos</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Categoría</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:rounded-xl sm:px-3">
                <option value="ALL">Todas</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Prioridad</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:rounded-xl sm:px-3">
                <option value="ALL">Todas</option>
                <option value="CRITICAL">Crítica</option>
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baja</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Asignado</span>
              <select value={assigned} onChange={(event) => setAssigned(event.target.value)} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:rounded-xl sm:px-3">
                <option value="ALL">Todos</option>
                <option value="UNASSIGNED">Sin asignar</option>
                {assignees.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">Habitación</span>
              <select value={blockedFilter} onChange={(event) => setBlockedFilter(event.target.value as typeof blockedFilter)} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm sm:rounded-xl sm:px-3">
                <option value="ALL">Todas</option>
                <option value="BLOCKED">Bloqueadas</option>
                <option value="UNBLOCKED">No bloqueadas</option>
              </select>
            </label>
          </div>

          {(search || category !== 'ALL' || priority !== 'ALL' || assigned !== 'ALL' || blockedFilter !== 'ALL' || status !== 'PENDING') && (
            <div className="mt-3 hidden justify-end lg:flex">
              <ActionButton icon={FilterX} label="Limpiar filtros" onClick={clearFilters} className="min-h-9 px-3 py-1.5 text-xs" />
            </div>
          )}
        </section>

        <main className="flex min-h-0 flex-1 flex-col gap-4 2xl:grid 2xl:min-h-0 2xl:grid-rows-[minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.5fr)]">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm 2xl:h-full">
            <div className="flex items-center justify-between gap-1 border-b px-3 py-2 sm:px-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{showHistory ? 'Histórico de pendientes' : 'Listado de pendientes'}</div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                  {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0">
                <span className="mr-1 shrink-0 text-[10px] font-medium tabular-nums text-slate-500 sm:mr-2 sm:text-xs" aria-live="polite">
                  {filtered.length === 0 ? '0 / 0' : `${currentIndex + 1} / ${filtered.length}`}
                </span>
                <IconButton icon={ChevronsUp} size="compact" variant="flat" label="Ir al primer pendiente" title="Ir al inicio" onClick={() => moveSelection(0)} disabled={filtered.length === 0 || currentIndex === 0} />
                <IconButton icon={ChevronUp} size="compact" variant="flat" label="Pendiente anterior" title="Anterior" onClick={() => moveSelection(currentIndex - 1)} disabled={filtered.length === 0 || currentIndex === 0} />
                <IconButton icon={ChevronDown} size="compact" variant="flat" label="Pendiente siguiente" title="Siguiente" onClick={() => moveSelection(currentIndex + 1)} disabled={filtered.length === 0 || currentIndex === filtered.length - 1} />
                <IconButton icon={ChevronsDown} size="compact" variant="flat" label="Ir al último pendiente" title="Ir al final" onClick={() => moveSelection(filtered.length - 1)} disabled={filtered.length === 0 || currentIndex === filtered.length - 1} />
              </div>
            </div>

            <div className="hidden min-h-0 2xl:flex 2xl:flex-1 2xl:flex-col">
            <GridViewport className="min-h-0 max-h-none flex-1" style={{ minHeight: 0, maxHeight: "none", flex: "1 1 0%" }}>
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
                    <th className="px-3 py-2.5 text-right">Acciones</th>
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
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {showHistory ? (
                              <IconButton
                                icon={RotateCcw}
                                label="Restaurar pendiente"
                                title="Restaurar"
                                onClick={() => void restoreItem(item)}
                                className="h-9 w-9"
                              />
                            ) : (
                              <>
                                <IconButton
                                  icon={Pencil}
                                  label="Modificar pendiente"
                                  title="Modificar"
                                  onClick={() => openEdit(item)}
                                  className="h-9 w-9"
                                />
                                <IconButton
                                  icon={Trash2}
                                  label="Eliminar pendiente"
                                  title="Eliminar (desactivar)"
                                  onClick={() => void deactivateItem(item)}
                                  className="h-9 w-9"
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-500">No hay pendientes para estos filtros.</td></tr>}
                </tbody>
              </table>
              </div>
            </GridViewport>
            </div>

            <GridViewport className="min-h-0 max-h-none flex-1 2xl:hidden" style={{ minHeight: 0, maxHeight: "none", flex: "1 1 0%" }}>
              <div className="divide-y divide-slate-200">
                {filtered.map((item) => {
                  const roomLocation = item.location?.trim() ?? ''
                  const roomIsBlocked = isRoomLocation(roomLocation) && blockedRooms.has(roomLocation)
                  const statusShort = item.status === 'COMPLETED' ? 'Fin.' : 'Pend.'
                  const priorityShort = item.priority === 'NORMAL' ? 'Norm.' : priorityLabels[item.priority]
                  const accessibleSummary = [
                    item.location ?? 'Sin ubicación',
                    item.category ?? 'Sin categoría',
                    item.pending,
                    statusLabels[item.status],
                    priorityLabels[item.priority],
                    item.assigned_to ?? 'Sin asignar',
                    formatDate(item.source_date),
                    item.observation ?? '',
                  ].filter(Boolean).join(' · ')
                  return (
                    <div
                      key={item.id}
                      role="group"
                      aria-label={accessibleSummary}
                      className={`flex min-w-0 items-center gap-1 px-1.5 py-1.5 ${item.id === selectedId ? 'bg-blue-50' : 'bg-white'}`}
                    >
                      <div className="w-8 shrink-0 truncate text-[11px] font-bold text-slate-700" title={item.location ?? 'Sin ubicación'}>
                        {item.location ?? '—'}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(item.id); setMobileDetailOpen(true) }}
                        title={accessibleSummary}
                        aria-label={`Ver detalle de ${item.pending}`}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-xs font-semibold leading-tight text-slate-900" title={item.pending}>
                          {item.pending}
                        </div>
                        <div className="truncate text-[10px] leading-tight text-slate-500">
                          {(item.category ?? 'Sin categoría')} · {(item.assigned_to ?? 'Sin asignar')} · {formatDate(item.source_date)}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <span className={`rounded px-1 py-0.5 text-[9px] font-semibold leading-tight ${statusClass(item.status)}`} title={statusLabels[item.status]}>
                          {statusShort}
                        </span>
                        <span className={`rounded px-1 py-0.5 text-[9px] font-semibold leading-tight ${priorityClass(item.priority)}`} title={priorityLabels[item.priority]}>
                          {priorityShort}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-0">
                        {isRoomLocation(item.location) && (
                          <IconButton
                            icon={roomIsBlocked ? Lock : Unlock}
                            label={roomIsBlocked ? 'Desbloquear habitación' : 'Bloquear habitación'}
                            title={roomIsBlocked ? 'Desbloquear habitación' : 'Bloquear habitación'}
                            onClick={() => void toggleRoomBlocked(item.location!)}
                            disabled={updatingRoom === roomLocation}
                            size="compact"
                            className={roomIsBlocked ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}
                          />
                        )}
                        {showHistory ? (
                          <IconButton
                            icon={RotateCcw}
                            label="Restaurar pendiente"
                            title="Restaurar"
                            onClick={() => void restoreItem(item)}
                            size="compact"
                          />
                        ) : (
                          <>
                            <IconButton
                              icon={Pencil}
                              label="Modificar pendiente"
                              title="Modificar"
                              onClick={() => openEdit(item)}
                              size="compact"
                            />
                            <IconButton
                              icon={Trash2}
                              label="Eliminar pendiente"
                              title="Eliminar (desactivar)"
                              onClick={() => void deactivateItem(item)}
                              size="compact"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                {!loading && filtered.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No hay pendientes para estos filtros.
                  </div>
                )}
              </div>
            </GridViewport>

          </section>

          <aside className="hidden 2xl:block rounded-2xl border border-slate-200 bg-white shadow-sm">
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

                <div className="flex flex-wrap gap-2">
                  {showHistory ? (
                    <ActionButton
                      icon={RotateCcw}
                      label="Restaurar"
                      onClick={() => void restoreItem(selected)}
                      className="text-xs"
                    />
                  ) : (
                    <>
                      <ActionButton
                        icon={Pencil}
                        label="Modificar"
                        onClick={() => openEdit(selected)}
                        className="text-xs"
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Eliminar"
                        onClick={() => void deactivateItem(selected)}
                        className="text-xs"
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">Selecciona un pendiente.</div>
            )}
          </aside>
        </main>
      </div>

      {mobileDetailOpen && selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/20 p-3 sm:hidden"
          onClick={() => setMobileDetailOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-pending-detail-title"
            className="w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
            style={{ maxHeight: 'min(62dvh, 30rem)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {selected.location ?? 'Sin ubicación'} · {selected.category ?? 'Sin categoría'}
                </div>
                <h2 id="mobile-pending-detail-title" className="mt-0.5 break-words text-base font-bold leading-snug text-slate-900">
                  {selected.pending}
                </h2>
              </div>
              <IconButton
                icon={X}
                label="Cerrar detalle"
                title="Cerrar"
                onClick={() => setMobileDetailOpen(false)}
                className="h-8 w-8"
              />
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(selected.status)}`}>
                {statusLabels[selected.status]}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass(selected.priority)}`}>
                {priorityLabels[selected.priority]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div><span className="text-slate-500">Asignado: </span><strong className="break-words">{selected.assigned_to ?? 'Sin asignar'}</strong></div>
              <div><span className="text-slate-500">Fecha: </span><strong>{formatDate(selected.source_date)}</strong></div>
              {isRoomLocation(selected.location) && (
                <div className="col-span-2">
                  <span className="text-slate-500">Habitación: </span>
                  <strong className={blockedRooms.has(selected.location!.trim()) ? 'text-amber-700' : 'text-slate-700'}>
                    {blockedRooms.has(selected.location!.trim()) ? 'Bloqueada' : 'No bloqueada'}
                  </strong>
                </div>
              )}
              {selected.observation && (
                <div className="col-span-2 break-words">
                  <span className="text-slate-500">Observación: </span>{selected.observation}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2">
              {isRoomLocation(selected.location) && (
                <IconButton
                  icon={blockedRooms.has(selected.location!.trim()) ? Lock : Unlock}
                  label={blockedRooms.has(selected.location!.trim()) ? 'Desbloquear habitación' : 'Bloquear habitación'}
                  title={blockedRooms.has(selected.location!.trim()) ? 'Desbloquear habitación' : 'Bloquear habitación'}
                  onClick={() => void toggleRoomBlocked(selected.location!)}
                  disabled={updatingRoom === selected.location!.trim()}
                  className="h-9 w-9"
                />
              )}
              {showHistory ? (
                <IconButton
                  icon={RotateCcw}
                  label="Restaurar pendiente"
                  title="Restaurar"
                  onClick={() => { setMobileDetailOpen(false); void restoreItem(selected) }}
                  className="h-9 w-9"
                />
              ) : (
                <>
                  <IconButton
                    icon={Pencil}
                    label="Modificar pendiente"
                    title="Modificar"
                    onClick={() => { setMobileDetailOpen(false); openEdit(selected) }}
                    className="h-9 w-9"
                  />
                  <IconButton
                    icon={Trash2}
                    label="Eliminar pendiente"
                    title="Eliminar (desactivar)"
                    onClick={() => { setMobileDetailOpen(false); void deactivateItem(selected) }}
                    className="h-9 w-9"
                  />
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-3">
          <div className="max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Nuevo pendiente</div>
                <div className="text-xs text-slate-500">Crear un registro operativo de mantenimiento.</div>
              </div>
              <ActionButton
                label="Cerrar"
                onClick={() => !savingCreate && setCreating(false)}
                disabled={savingCreate}
                className="min-h-9 px-3 py-1.5 text-xs"
              />
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicación / habitación</span>
                <input
                  value={newForm.location}
                  onChange={(event) => setNewForm((value) => ({ ...value, location: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Categoría</span>
                <input
                  value={newForm.category}
                  onChange={(event) => setNewForm((value) => ({ ...value, category: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pendiente *</span>
                <input
                  value={newForm.pending}
                  onChange={(event) => setNewForm((value) => ({ ...value, pending: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridad</span>
                <select
                  value={newForm.priority}
                  onChange={(event) => setNewForm((value) => ({ ...value, priority: event.target.value as PendingItem['priority'] }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="CRITICAL">Crítica</option>
                  <option value="HIGH">Alta</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Baja</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Asignado a</span>
                <input
                  value={newForm.assigned_to}
                  onChange={(event) => setNewForm((value) => ({ ...value, assigned_to: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Observación</span>
                <textarea
                  rows={4}
                  value={newForm.observation}
                  onChange={(event) => setNewForm((value) => ({ ...value, observation: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <ActionButton
                label="Cancelar"
                onClick={() => setCreating(false)}
                disabled={savingCreate}
                className="text-xs"
              />
              <ActionButton
                icon={Plus}
                label={savingCreate ? 'Creando…' : 'Crear pendiente'}
                onClick={() => void saveNew()}
                disabled={savingCreate || !newForm.pending.trim()}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {editing && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-3">
          <div className="max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Modificar pendiente</div>
                <div className="text-xs text-slate-500">Editar datos operativos del registro.</div>
              </div>
              <ActionButton
                label="Cerrar"
                onClick={() => !savingEdit && setEditing(false)}
                disabled={savingEdit}
                className="min-h-9 px-3 py-1.5 text-xs"
              />
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicación / habitación</span>
                <input
                  value={editForm.location}
                  onChange={(event) => setEditForm((value) => ({ ...value, location: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Categoría</span>
                <input
                  value={editForm.category}
                  onChange={(event) => setEditForm((value) => ({ ...value, category: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pendiente</span>
                <input
                  value={editForm.pending}
                  onChange={(event) => setEditForm((value) => ({ ...value, pending: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridad</span>
                <select
                  value={editForm.priority}
                  onChange={(event) => setEditForm((value) => ({ ...value, priority: event.target.value as PendingItem['priority'] }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="CRITICAL">Crítica</option>
                  <option value="HIGH">Alta</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Baja</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Asignado a</span>
                <input
                  value={editForm.assigned_to}
                  onChange={(event) => setEditForm((value) => ({ ...value, assigned_to: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Observación</span>
                <textarea
                  rows={4}
                  value={editForm.observation}
                  onChange={(event) => setEditForm((value) => ({ ...value, observation: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <ActionButton
                label="Cancelar"
                onClick={() => setEditing(false)}
                disabled={savingEdit}
                className="text-xs"
              />
              <ActionButton
                label={savingEdit ? 'Guardando…' : 'Guardar cambios'}
                onClick={() => void saveEdit()}
                disabled={savingEdit}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
