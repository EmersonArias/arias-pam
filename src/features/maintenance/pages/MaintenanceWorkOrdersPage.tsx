import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FileText, RefreshCw, UserRound, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'
import { useHotelScope } from '../../../shared/context/HotelScopeContext'
import { supabase } from '../../../lib/supabase'

type WorkOrder = {
  id: string
  hotel_id: string
  scheduled_job_id: string
  maintenance_plan_id: string
  ot_number: string
  title: string
  description: string | null
  work_type: 'PREVENTIVE' | 'CORRECTIVE' | 'ACTUATION'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  assigned_user_id: string | null
  assigned_user_name: string | null
  assigned_user_email: string | null
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  observations: string | null
  maintenance_plan_name: string
  maintenance_type: 'INTERNAL' | 'EXTERNAL'
  apparatus_registry_id: string | null
  apparatus_code: string | null
  apparatus_name: string | null
  plant: string | null
  location: string | null
  plan_year: number
  month_number: number
  week_slot: number
  source_mark_id: string | null
  created_at: string
  updated_at: string
}

const statusLabels: Record<WorkOrder['status'], string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Finalizada',
}

const typeLabels: Record<WorkOrder['work_type'], string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Correctiva',
  ACTUATION: 'Actuación',
}

function statusClass(status: WorkOrder['status']) {
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'IN_PROGRESS') return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

export default function MaintenanceWorkOrdersPage() {
  const navigate = useNavigate()
  const { hotel } = useHotelScope()
  const [records, setRecords] = useState<WorkOrder[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkOrder['status']>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    if (!hotel?.id) {
      setRecords([])
      setSelectedId('')
      setLoading(false)
      setError('No se ha seleccionado un hotel de trabajo.')
      return
    }

    setLoading(true)
    setError('')

    const result = await supabase
      .from('maintenance_work_orders_resolved')
      .select('*')
      .eq('hotel_id', hotel.id)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (result.error) {
      setRecords([])
      setSelectedId('')
      setError(result.error.message)
      setLoading(false)
      return
    }

    const loaded = (result.data ?? []) as WorkOrder[]
    setRecords(loaded)
    setSelectedId((current) => loaded.some((item) => item.id === current) ? current : (loaded[0]?.id ?? ''))
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [hotel?.id])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')

    return records.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (!query) return true

      const haystack = [
        item.ot_number,
        item.title,
        item.description,
        item.maintenance_plan_name,
        item.apparatus_code,
        item.apparatus_name,
        item.assigned_user_name,
        item.plant,
        item.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')

      return haystack.includes(query)
    })
  }, [records, search, statusFilter])

  const selected = records.find((item) => item.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight sm:text-2xl">Órdenes de trabajo</h1>
                <p className="text-xs text-slate-500 sm:text-sm">OT preventivas y operativas de {hotel?.name ?? 'hotel actual'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton icon={RefreshCw} label="Actualizar" title="Actualizar" onClick={() => void loadData()} disabled={loading} />
              <BackButton onBack={() => navigate('/maintenance/operation')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nº OT, equipo, mantenimiento, responsable…"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En curso</option>
                <option value="COMPLETED">Finalizada</option>
              </select>
            </label>
          </div>
        </section>

        <main className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold">OT del hotel</div>
              <span className="text-xs text-slate-500">{filteredRecords.length} resultado{filteredRecords.length === 1 ? '' : 's'}</span>
            </div>

            <div className="p-2 md:hidden">
              <div className="max-h-[calc(100vh-300px)] space-y-2 overflow-auto">
                {filteredRecords.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={'w-full rounded-xl border p-3 text-left ' + (item.id === selectedId ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">{item.ot_number}</div>
                        <div className="mt-1 text-xs font-medium text-slate-600">{item.maintenance_plan_name}</div>
                      </div>
                      <span className={'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ' + statusClass(item.status)}>{statusLabels[item.status]}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500">
                      {item.apparatus_code ?? '—'} · {item.apparatus_name ?? 'Equipo no disponible'}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      Prevista: {item.scheduled_date ? new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}
                    </div>
                  </button>
                ))}
                {!loading && filteredRecords.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No hay OTs para mostrar.</div>
                )}
              </div>
            </div>

            <div className="hidden max-h-[calc(100vh-300px)] overflow-auto md:block">
              <table className="w-full min-w-[960px] border-collapse text-xs">
                <thead>
                  <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 font-semibold">Nº OT</th>
                    <th className="px-3 py-2.5 font-semibold">Mantenimiento</th>
                    <th className="px-3 py-2.5 font-semibold">Equipo</th>
                    <th className="px-3 py-2.5 font-semibold">Fecha prevista</th>
                    <th className="px-3 py-2.5 font-semibold">Asignado</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={'cursor-pointer border-b border-slate-100 transition ' + (item.id === selectedId ? 'bg-blue-50' : 'hover:bg-slate-50')}
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-800">{item.ot_number}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-700">{item.maintenance_plan_name}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{typeLabels[item.work_type]}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-700">{item.apparatus_code ?? '—'}</div>
                        <div className="text-[10px] text-slate-400">{item.apparatus_name ?? '—'}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {item.scheduled_date ? new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{item.assigned_user_name ?? 'Sin asignar'}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ' + statusClass(item.status)}>{statusLabels[item.status]}</span>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredRecords.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">No hay OTs para mostrar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b px-4 py-3 text-sm font-semibold">Ficha de OT</div>
            {selected ? (
              <div className="space-y-4 p-4">
                <div>
                  <div className="text-xl font-bold text-slate-900">{selected.ot_number}</div>
                  <div className="mt-1 text-sm text-slate-600">{selected.maintenance_plan_name}</div>
                  <span className={'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' + statusClass(selected.status)}>{statusLabels[selected.status]}</span>
                </div>

                <div className="grid gap-2 rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="flex items-center gap-2"><Wrench size={16} /><span><strong>Equipo:</strong> {selected.apparatus_code ?? '—'} · {selected.apparatus_name ?? '—'}</span></div>
                  <div className="flex items-center gap-2"><Clock3 size={16} /><span><strong>Fecha prevista:</strong> {selected.scheduled_date ? new Date(selected.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</span></div>
                  <div className="flex items-center gap-2"><UserRound size={16} /><span><strong>Asignado:</strong> {selected.assigned_user_name ?? 'Sin asignar'}</span></div>
                  <div className="flex items-center gap-2"><FileText size={16} /><span><strong>Tipo:</strong> {typeLabels[selected.work_type]}</span></div>
                </div>

                {selected.plant || selected.location ? (
                  <div className="text-sm text-slate-600">
                    <strong>Ubicación:</strong> {[selected.plant, selected.location].filter(Boolean).join(' · ')}
                  </div>
                ) : null}

                {selected.description && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</div>
                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.description}</div>
                  </div>
                )}

                {selected.observations && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Observaciones</div>
                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.observations}</div>
                  </div>
                )}

                <div className="text-xs text-slate-400">
                  Creada: {new Date(selected.created_at).toLocaleString('es-ES')}
                </div>

                {selected.status === 'PENDING' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                    <AlertTriangle className="mb-1 inline-block" size={15} /> Esta OT está pendiente de ejecución.
                  </div>
                )}

                {selected.status === 'COMPLETED' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
                    <CheckCircle2 className="mb-1 inline-block" size={15} /> Ejecución completada.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">Selecciona una OT.</div>
            )}
          </aside>
        </main>
      </div>
    </div>
  )
}
