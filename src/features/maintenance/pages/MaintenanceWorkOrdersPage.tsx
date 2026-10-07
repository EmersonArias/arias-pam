import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Archive, CheckCircle2, ChevronDown, ChevronUp, Clock3, FileText, Image, RefreshCw, UserRound, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'
import ActionButton from '../../../shared/components/buttons/ActionButton'
import GridViewport from '../../../shared/components/grid/GridViewport'
import { useGridKeyboardNavigation } from '../../../shared/components/grid/useGridKeyboardNavigation'
import { useHotelScope } from '../../../shared/context/HotelScopeContext'
import { supabase } from '../../../lib/supabase'

type WorkOrderEvidence = {
  id: string
  storage_path: string
  file_name: string
  mime_type: string
  file_size: number
  uploaded_by: string | null
  uploaded_at: string
  url: string
}

type WorkOrder = {
  id: string
  hotel_id: string
  scheduled_job_id: string
  maintenance_plan_id: string | null
  ot_number: string
  title: string
  description: string | null
  work_type: 'PREVENTIVE' | 'CORRECTIVE' | 'ACTUATION'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  completion_timing: 'ON_TIME' | 'OUT_OF_DATE' | null
  assigned_user_id: string | null
  assigned_user_name: string | null
  assigned_user_email: string | null
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  observations: string | null
  maintenance_plan_name: string | null
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

function isOverdue(item: WorkOrder) {
  return item.status === 'PENDING'
    && Boolean(item.scheduled_date)
    && item.scheduled_date! < new Date().toISOString().slice(0, 10)
}

function displayStatusLabel(item: WorkOrder) {
  if (item.status === 'COMPLETED' && item.completion_timing === 'OUT_OF_DATE') {
    return 'Finalizada · Fuera de fecha'
  }
  return isOverdue(item) ? 'Vencida' : statusLabels[item.status]
}

function displayStatusClass(item: WorkOrder) {
  if (isOverdue(item)) return 'bg-rose-100 text-rose-700'
  if (item.status === 'COMPLETED' && item.completion_timing === 'OUT_OF_DATE') return 'bg-amber-100 text-amber-700'
  if (item.status === 'COMPLETED') return 'bg-emerald-100 text-emerald-700'
  if (item.status === 'IN_PROGRESS') return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

function getMaintenanceDisplay(item: WorkOrder) {
  if (item.work_type === 'PREVENTIVE') {
    const maintenance = item.maintenance_plan_name?.trim() || 'PREVENTIVO'
    const equipment = item.apparatus_name?.trim() || item.apparatus_code?.trim() || ''
    return equipment ? maintenance + ' · ' + equipment : maintenance
  }

  const prefix = item.ot_number + ' — '
  if (item.title.startsWith(prefix)) {
    return item.title.slice(prefix.length).trim() || typeLabels[item.work_type]
  }

  return item.title.trim() || typeLabels[item.work_type]
}

function getWorkDescription(item: WorkOrder) {
  const description = item.description?.trim() ?? ''
  const technicalOrigin = description.startsWith('Origen ')
    || description.includes(' PAM ')
    || description.includes(' Excel ')

  if (technicalOrigin) {
    const maintenanceLabel = item.maintenance_type === 'EXTERNAL'
      ? 'mantenimiento preventivo externo'
      : 'mantenimiento preventivo'
    const equipment = item.apparatus_name ?? item.apparatus_code

    return equipment
      ? `Realizar ${maintenanceLabel} en ${equipment}.`
      : `Realizar ${maintenanceLabel}.`
  }

  return description || null
}


export default function MaintenanceWorkOrdersPage() {
  const navigate = useNavigate()
  const { hotel } = useHotelScope()
  const [records, setRecords] = useState<WorkOrder[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS'>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generationMode, setGenerationMode] = useState<'AUTO' | 'MANUAL'>('MANUAL')
  const [generationLeadDays, setGenerationLeadDays] = useState(0)
  const [evidence, setEvidence] = useState<WorkOrderEvidence[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)

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

    const [result, configResult] = await Promise.all([
      supabase
        .from('maintenance_work_orders_resolved')
        .select('*')
        .eq('hotel_id', hotel.id)
        .neq('status', 'COMPLETED')
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('maintenance_hotel_config')
        .select('ot_generation_mode, ot_generation_lead_days')
        .eq('hotel_id', hotel.id)
        .maybeSingle(),
    ])

    if (result.error) {
      setRecords([])
      setSelectedId('')
      setError(result.error.message)
      setLoading(false)
      return
    }

    setGenerationMode(configResult.data?.ot_generation_mode === 'AUTO' ? 'AUTO' : 'MANUAL')
    setGenerationLeadDays(Number(configResult.data?.ot_generation_lead_days ?? 0))

    const loaded = (result.data ?? []) as WorkOrder[]
    setRecords(loaded)
    setSelectedId((current) => loaded.some((item) => item.id === current) ? current : (loaded[0]?.id ?? ''))
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [hotel?.id])

  async function loadEvidence(workOrderId: string) {
    setEvidenceLoading(true)
    setEvidence([])

    const result = await supabase
      .from('maintenance_work_order_evidence')
      .select('id, storage_path, file_name, mime_type, file_size, uploaded_by, uploaded_at')
      .eq('work_order_id', workOrderId)
      .order('uploaded_at', { ascending: false })

    if (result.error) {
      setError(result.error.message)
      setEvidenceLoading(false)
      return
    }

    const resolved = await Promise.all(
      (result.data ?? []).map(async (item) => {
        const signed = await supabase
          .storage
          .from('maintenance-evidence')
          .createSignedUrl(item.storage_path, 3600)

        if (signed.error || !signed.data?.signedUrl) return null

        return {
          ...item,
          url: signed.data.signedUrl,
        } as WorkOrderEvidence
      }),
    )

    setEvidence(resolved.filter(Boolean) as WorkOrderEvidence[])
    setEvidenceLoading(false)
  }

  useEffect(() => {
    if (!selectedId) {
      setEvidence([])
      return
    }
    void loadEvidence(selectedId)
  }, [selectedId])

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
    onOpen: (id) => navigate('/maintenance/work-orders/' + id),
    autoFocusFirst: true,
  })

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
              <ActionButton icon={Archive} label="Histórico" onClick={() => navigate('/maintenance/history')} />
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

        <div className={
          generationMode === 'AUTO'
            ? 'mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800'
            : 'mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800'
        }>
          {generationMode === 'AUTO'
            ? `Generación automática de OT: activa · anticipación ${generationLeadDays} día${generationLeadDays === 1 ? '' : 's'}.`
            : 'Generación automática de OT: desactivada para este hotel. Las OT preventivas no se crearán automáticamente mientras esté en modo Manual.'}
        </div>

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
                <option value="ALL">Pendientes y en curso</option>
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En curso</option>
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
                    onClick={() => navigate('/maintenance/work-orders/' + item.id)}
                    className={'w-full rounded-xl border p-3 text-left ' + (item.id === selectedId ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">{item.ot_number}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-700">{getMaintenanceDisplay(item)}</div>
                      </div>
                      <span className={'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ' + displayStatusClass(item)}>{displayStatusLabel(item)}</span>
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

            <div className="hidden md:block">
              <div {...getGridProps()} className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-200">
                <GridViewport className="max-h-[calc(100vh-300px)]">
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
                      onClick={() => navigate('/maintenance/work-orders/' + item.id)}
                      className={'cursor-pointer border-b border-slate-100 transition ' + (item.id === selectedId ? 'bg-blue-50' : 'hover:bg-slate-50')}
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-800">{item.ot_number}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-700">{getMaintenanceDisplay(item)}</div>
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
                        <span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ' + displayStatusClass(item)}>{displayStatusLabel(item)}</span>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredRecords.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">No hay OTs para mostrar.</td></tr>
                  )}
                </tbody>
              </table>
                </GridViewport>
                <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
                  <span className="text-[11px] text-slate-500">
                    {filteredRecords.length === 0 ? 'Sin OTs' : `${currentIndex + 1} / ${filteredRecords.length}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={ChevronUp}
                      label="OT anterior"
                      title="OT anterior"
                      onClick={() => moveSelection(currentIndex - 1)}
                      disabled={filteredRecords.length === 0 || currentIndex === 0}
                      className="h-9 w-9"
                    />
                    <IconButton
                      icon={ChevronDown}
                      label="OT siguiente"
                      title="OT siguiente"
                      onClick={() => moveSelection(currentIndex + 1)}
                      disabled={filteredRecords.length === 0 || currentIndex === filteredRecords.length - 1}
                      className="h-9 w-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b px-4 py-3 text-sm font-semibold">Detalle de OT</div>
            {selected ? (
              <div className="space-y-4 p-4">
                <div>
                  <div className="text-xl font-bold text-slate-900">{selected.ot_number}</div>
                  <div className="mt-1 text-sm text-slate-600">{selected.maintenance_plan_name}</div>
                  <span className={'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' + displayStatusClass(selected)}>{displayStatusLabel(selected)}</span>
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

                {getWorkDescription(selected) && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Trabajo a realizar</div>
                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{getWorkDescription(selected)}</div>
                  </div>
                )}


                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Image size={17} />
                        Fotografías
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">Evidencias de la ejecución de esta OT.</div>
                    </div>
<div className="text-[11px] text-slate-400">Solo consulta en esta pantalla. Las evidencias se gestionan desde la ejecución de la OT.</div>
                  </div>

                  {evidenceLoading ? (
                    <div className="mt-3 text-xs text-slate-400">Cargando fotografías…</div>
                  ) : evidence.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {evidence.map((item) => (
                        <div key={item.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <a href={item.url} target="_blank" rel="noreferrer" className="block aspect-square">
                            <img src={item.url} alt={item.file_name} className="h-full w-full object-cover" />
                          </a>
                          <div className="truncate border-t bg-white px-2 py-1.5 text-[10px] text-slate-500">{item.file_name}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
                      Todavía no hay fotografías registradas.
                    </div>
                  )}
                </div>

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
                  <div className={
                    isOverdue(selected)
                      ? 'rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-800'
                      : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800'
                  }>
                    <AlertTriangle className="mb-1 inline-block" size={15} />
                    {isOverdue(selected)
                      ? 'Esta OT está pendiente y ha superado su fecha prevista.'
                      : 'Esta OT está pendiente de ejecución.'}
                  </div>
                )}

                {selected.status === 'COMPLETED' && selected.completion_timing === 'OUT_OF_DATE' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                    <AlertTriangle className="mb-1 inline-block" size={15} /> Esta OT fue completada fuera de la fecha prevista y queda registrada como <strong>Fuera de fecha</strong>.
                  </div>
                )}

                {selected.status === 'COMPLETED' && selected.completion_timing !== 'OUT_OF_DATE' && (
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
