import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import GridToolbar from '../../../shared/components/grid/GridToolbar'
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
      setErrorMessage(`Error cargando la relación de aparatos: ${error.message}`)
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

  async function handleDelete() {
    if (!selected) {
      setErrorMessage('Selecciona un registro.')
      return
    }

    const confirmed = window.confirm(
      `¿Eliminar el registro ${selected.code}? Esta acción no se puede deshacer.`,
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('apparatus_registry')
      .delete()
      .eq('id', selected.id)

    if (error) {
      setErrorMessage(`Error eliminando el registro: ${error.message}`)
      return
    }

    await loadRecords()
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/logo.png"
                alt="Arias Suite"
                className="h-11 w-auto shrink-0 object-contain sm:h-13"
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Relación de Aparatos
                </h1>
                <p className="text-sm text-slate-500">
                  Registro de equipos e instalaciones
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <BackButton onBack={() => navigate('/')} />
              <HomeButton onHome={() => navigate('/')} />
              <GridToolbar
                actions={[
                  { key: 'new', label: 'Nuevo', icon: Plus, tone: 'primary', onClick: openNew },
                  { key: 'modify', label: 'Modificar', icon: Pencil, tone: 'warning', onClick: openModify, disabled: !selected },
                  { key: 'delete', label: 'Eliminar', icon: Trash2, tone: 'danger', onClick: () => void handleDelete(), disabled: !selected },
                  { key: 'report', label: 'PDF', icon: FileText, tone: 'dark', onClick: openReport },
                ]}
              />
            </div>
          </div>
        </div>

        {(errorMessage || loading) && (
          <div className="mb-4 rounded-xl border bg-white p-3 text-sm shadow-sm">
            {loading ? 'Cargando registros…' : errorMessage}
          </div>
        )}

        <div className="mb-4 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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

            <button
              type="button"
              onClick={() => void loadRecords(selectedId)}
              title="Actualizar"
              className="inline-flex items-center justify-center rounded-lg bg-white p-2.5 text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <RefreshCw size={18} />
            </button>
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Planta</th>
                  <th className="px-4 py-3 font-semibold">Ubicación</th>
                  <th className="px-4 py-3 font-semibold">Mantenimiento</th>
                  <th className="px-4 py-3 font-semibold">                  <th className="px-4 py-3 font-semibold">                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => {
                  const isSelected = item.id === selectedId
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id)
                        navigate(`/apparatusregistry/${item.id}`)
                      }}
                      className={`cursor-pointer border-b transition ${
                        isSelected
                          ? 'bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        {item.code}
                      </td>
                      <td className="px-4 py-3 text-slate-800">{item.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {item.plant || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.location || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
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
          </div>
        </div>
      </div>
    </div>
  )
}
