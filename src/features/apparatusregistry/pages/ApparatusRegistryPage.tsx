import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Wrench,
} from 'lucide-react'
import IconButton from '../../../shared/components/buttons/IconButton'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import GridToolbar from '../../../shared/components/grid/GridToolbar'
import GridViewport from '../../../shared/components/grid/GridViewport'
import { useGridKeyboardNavigation } from '../../../shared/components/grid/useGridKeyboardNavigation'
import { supabase } from '../../../lib/supabase'
import {
  fromDatabase,
  type ApparatusRegistry,
  type DatabaseApparatusRegistry,
} from '../lib/apparatusRegistry'

export default function ApparatusRegistryPage() {
  const navigate = useNavigate()

  const [records, setRecords] = useState<ApparatusRegistry[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [plantFilter, setPlantFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [reportScope, setReportScope] = useState<'SELECTED' | 'FILTERED' | 'ALL'>('FILTERED')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadRecords(selectId?: string) {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('apparatus_registry')
      .select('*')
      .order('code', { ascending: true })

    if (error) {
      setErrorMessage(`Error cargando equipos e instalaciones: ${error.message}`)
      setLoading(false)
      return
    }

    const loaded = (data ?? []).map((row) =>
      fromDatabase(row as DatabaseApparatusRegistry),
    )

    setRecords(loaded)
    setSelectedId((current) => {
      const preferred = selectId ?? current
      return loaded.some((item) => item.id === preferred)
        ? preferred
        : loaded[0]?.id ?? ''
    })
    setLoading(false)
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  const plants = useMemo(() => {
    const values = records
      .map((item) => item.plant)
      .filter((value): value is string => Boolean(value))

    return Array.from(new Set<string>(values)).sort((a, b) =>
      a.localeCompare(b, 'es'),
    )
  }, [records])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')

    return records.filter((item) => {
      if (query) {
        const haystack = [
          item.code,
          item.name,
          item.plant,
          item.location,
          item.maintenance,
        ]
          .join(' ')
          .toLocaleLowerCase('es')

        if (!haystack.includes(query)) return false
      }

      if (plantFilter !== 'ALL' && item.plant !== plantFilter) return false
      if (activeFilter === 'ACTIVE' && !item.active) return false
      if (activeFilter === 'INACTIVE' && item.active) return false

      return true
    })
  }, [records, search, plantFilter, activeFilter])

  const selected = records.find((item) => item.id === selectedId) ?? null

  const gridIds = useMemo(
    () => filteredRecords.map((item) => item.id),
    [filteredRecords],
  )

  const {
    currentIndex,
    moveSelection,
    getGridProps,
    getRowProps,
  } = useGridKeyboardNavigation({
    ids: gridIds,
    selectedId,
    onSelectedIdChange: setSelectedId,
    onOpen: (id) => navigate(`/apparatusregistry/${id}`),
    autoFocusFirst: true,
  })

  function openNew() {
    navigate('/apparatusregistry/new')
  }

  function openModify() {
    if (!selected) {
      setErrorMessage('Selecciona un registro.')
      return
    }

    navigate(`/apparatusregistry/${selected.id}`)
  }

  function openReport() {
    const params = new URLSearchParams()
    params.set('scope', reportScope)
    params.set('search', search)
    params.set('plant', plantFilter)
    params.set('active', activeFilter)
    if (selectedId) params.set('selectedId', selectedId)

    navigate(`/apparatusregistry/report?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo
                onActivate={() => navigate('/')}
                className="h-9 w-[104px] shrink-0 object-contain sm:h-13 sm:w-auto"
              />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-3xl">
                  Equipos e instalaciones
                </h1>
                <p className="hidden text-sm text-slate-500 sm:block">
                  Mantenimientos, controles y estado de equipos
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center lg:justify-end">
              <BackButton onBack={() => navigate(-1)} />
              <HomeButton onHome={() => navigate('/')} className="justify-self-center" />
              <div className="col-span-2 lg:col-auto">
                <GridToolbar
                  className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:gap-2"
                  actions={[
                    { key: 'new', label: 'Nuevo', icon: Plus, tone: 'primary', onClick: openNew },
                    { key: 'modify', label: 'Modificar', icon: Pencil, tone: 'warning', onClick: openModify, disabled: !selected },
                    { key: 'maintenance', label: 'Mantenimientos', icon: Wrench, onClick: () => navigate('/maintenance') },
                    { key: 'report', label: 'PDF', icon: FileText, tone: 'dark', onClick: openReport },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {(errorMessage || loading) && (
          <div className="mb-4 rounded-xl border bg-white p-3 text-sm shadow-sm">
            {loading ? 'Cargando registros…' : errorMessage}
          </div>
        )}

        <div className="mb-4 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Código, aparato, ubicación…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Planta
              </span>
              <select
                value={plantFilter}
                onChange={(event) => setPlantFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="ALL">Todas</option>
                {plants.map((plant) => (
                  <option key={plant} value={plant}>
                    {plant}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </span>
              <select
                value={activeFilter}
                onChange={(event) =>
                  setActiveFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reporte
              </span>
              <select
                value={reportScope}
                onChange={(event) =>
                  setReportScope(event.target.value as 'SELECTED' | 'FILTERED' | 'ALL')
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="SELECTED">Seleccionado</option>
                <option value="FILTERED">Según filtros</option>
                <option value="ALL">Todos</option>
              </select>
            </label>

            <IconButton
              icon={RefreshCw}
              label="Actualizar"
              onClick={() => void loadRecords(selectedId)}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">
              Registros: {filteredRecords.length} / {records.length}
            </div>
            <div className="text-xs text-slate-500">
              Arias Suite
            </div>
          </div>

          <div className="md:hidden">
            <div className="max-h-[calc(100vh-390px)] min-h-[280px] space-y-2 overflow-auto p-2">
              {filteredRecords.map((item) => {
                const isSelected = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id)
                      navigate(`/apparatusregistry/${item.id}`)
                    }}
                    className={`w-full rounded-xl border p-3 text-left shadow-sm transition ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50'
                        : item.active
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{item.code}</div>
                        <div className="mt-0.5 text-sm text-slate-700">{item.name}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <div><span className="font-semibold text-slate-600">Planta:</span> {item.plant || '—'}</div>
                      <div><span className="font-semibold text-slate-600">Ubicación:</span> {item.location || '—'}</div>
                      <div className="col-span-2"><span className="font-semibold text-slate-600">Mantenimiento:</span> {item.maintenance || '—'}</div>
                    </div>
                  </button>
                )
              })}

              {!loading && filteredRecords.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No hay registros que coincidan con los filtros.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">
                {filteredRecords.length === 0
                  ? 'Sin registros'
                  : `${currentIndex + 1} / ${filteredRecords.length}`}
              </div>
              <div className="flex items-center gap-1" aria-label="Navegación de registros">
                <IconButton
                  icon={ChevronUp}
                  label="Registro anterior"
                  title="Anterior"
                  onClick={() => moveSelection(currentIndex - 1)}
                  disabled={filteredRecords.length === 0 || currentIndex === 0}
                />
                <IconButton
                  icon={ChevronDown}
                  label="Registro siguiente"
                  title="Siguiente"
                  onClick={() => moveSelection(currentIndex + 1)}
                  disabled={filteredRecords.length === 0 || currentIndex === filteredRecords.length - 1}
                />
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div {...getGridProps()} className='outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-200'>
              <GridViewport>
              <table className="w-full min-w-[900px] border-collapse text-sm">

              <thead>
                <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.4)]">
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Planta</th>
                  <th className="px-4 py-3 font-semibold">Ubicación</th>
                  <th className="px-4 py-3 font-semibold">Empresa de mantenimiento</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => {
                  const isSelected = item.id === selectedId
                  return (
                    <tr
                      key={item.id}
                      {...getRowProps(item.id)}
                      onClick={() => {
                        setSelectedId(item.id)
                        navigate(`/apparatusregistry/${item.id}`)
                      }}
                      className={`scroll-mt-12 cursor-pointer border-b transition outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-200 ${
                        isSelected
                          ? 'bg-blue-50'
                          : item.active
                            ? 'hover:bg-slate-50'
                            : 'bg-slate-100 hover:bg-slate-200/70'
                      }`}
                    >
                      <td className={`whitespace-nowrap px-4 py-3 font-semibold ${
                        item.active ? 'text-slate-900' : 'text-slate-500'
                      }`}>
                        {item.code}
                      </td>
                      <td className={`px-4 py-3 ${
                        item.active ? 'text-slate-800' : 'text-slate-500'
                      }`}>{item.name}</td>
                      <td className={`whitespace-nowrap px-4 py-3 ${
                        item.active ? 'text-slate-700' : 'text-slate-500'
                      }`}>
                        {item.plant || '—'}
                      </td>
                      <td className={`px-4 py-3 ${
                        item.active ? 'text-slate-700' : 'text-slate-500'
                      }`}>
                        {item.location || '—'}
                      </td>
                      <td className={`px-4 py-3 ${
                        item.active ? 'text-slate-700' : 'text-slate-500'
                      }`}>
                        {item.maintenance || '—'}
                      </td>
                                            <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {!loading && filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No hay registros que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
              </GridViewport>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <div className="text-xs text-slate-500">
              {filteredRecords.length === 0
                ? 'Sin registros'
                : `Registro ${currentIndex + 1} de ${filteredRecords.length}`}
            </div>

            <div className="flex items-center gap-2" aria-label="Navegación de registros">
              <IconButton
                icon={ChevronsUp}
                label="Ir al primer registro"
                title="Primer registro"
                onClick={() => moveSelection(0)}
                disabled={filteredRecords.length === 0 || currentIndex === 0}
              />
              <IconButton
                icon={ChevronUp}
                label="Registro anterior"
                title="Registro anterior"
                onClick={() => moveSelection(currentIndex - 1)}
                disabled={filteredRecords.length === 0 || currentIndex === 0}
              />
              <IconButton
                icon={ChevronDown}
                label="Registro siguiente"
                title="Registro siguiente"
                onClick={() => moveSelection(currentIndex + 1)}
                disabled={
                  filteredRecords.length === 0 ||
                  currentIndex === filteredRecords.length - 1
                }
              />
              <IconButton
                icon={ChevronsDown}
                label="Ir al último registro"
                title="Último registro"
                onClick={() => moveSelection(filteredRecords.length - 1)}
                disabled={
                  filteredRecords.length === 0 ||
                  currentIndex === filteredRecords.length - 1
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
