import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'

type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

type PlanningJob = {
  id: string
  hotel_id: string
  scheduled_job_id: string
  maintenance_plan_id: string
  title: string
  description: string | null
  work_type: string
  status: JobStatus
  assigned_user_id: string | null
  assigned_user_name: string | null
  assigned_user_email: string | null
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  observations: string | null
  maintenance_plan_code: string | null
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
  source_mark_id: string
  created_at: string
  updated_at: string
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Finalizado',
}

function resolveWeekRange(year: number, month: number, weekSlot: number) {
  const startDay = (weekSlot - 1) * 7 + 1
  const first = new Date(year, month - 1, startDay, 12)
  const lastDay = new Date(year, month, 0, 12).getDate()
  const endDay = Math.min(startDay + 6, lastDay)
  const last = new Date(year, month - 1, endDay, 12)
  return { first, last }
}

function formatRange(job: PlanningJob) {
  if (job.scheduled_date) {
    return new Date(job.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES')
  }
  const { first, last } = resolveWeekRange(job.plan_year, job.month_number, job.week_slot)
  return first.toLocaleDateString('es-ES', { day: '2-digit' }) + '–' +
    last.toLocaleDateString('es-ES', { day: '2-digit' })
}

function statusClass(status: JobStatus) {
  if (status === 'COMPLETED') return 'bg-slate-100 text-slate-600'
  if (status === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700'
  return 'bg-blue-100 text-blue-700'
}

export default function PlanningPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(Number(searchParams.get('year')) || currentYear)
  const [month, setMonth] = useState(Number(searchParams.get('month')) || new Date().getMonth() + 1)
  const [jobs, setJobs] = useState<PlanningJob[]>([])
  const [hotelId, setHotelId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobStatus>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function resolveHotelId() {
    if (hotelId) return hotelId

    const assignment = await supabase
      .from('user_hotel_roles')
      .select('hotel_id')
      .eq('active', true)
      .order('hotel_id')
      .limit(1)
      .maybeSingle()

    if (assignment.error || !assignment.data?.hotel_id) {
      throw new Error(assignment.error?.message ?? 'No se ha podido determinar el hotel activo.')
    }

    const id = assignment.data.hotel_id as string
    setHotelId(id)
    return id
  }

  async function loadPlanning(targetYear = year) {
    setLoading(true)
    setError('')

    try {
      const id = await resolveHotelId()
      const result = await supabase
        .from('maintenance_work_orders_resolved')
        .select(
          'id, hotel_id, scheduled_job_id, maintenance_plan_id, title, description, work_type, status, assigned_user_id, assigned_user_name, assigned_user_email, scheduled_date, started_at, completed_at, completed_by, observations, maintenance_plan_code, maintenance_plan_name, maintenance_type, apparatus_registry_id, apparatus_code, apparatus_name, plant, location, plan_year, month_number, week_slot, source_mark_id, created_at, updated_at',
        )
        .eq('hotel_id', id)
        .eq('plan_year', targetYear)
        .order('month_number')
        .order('week_slot')
        .order('apparatus_code', { ascending: true, nullsFirst: true })
        .order('title')

      if (result.error) throw new Error(result.error.message)
      setJobs((result.data ?? []) as PlanningJob[])
    } catch (planningError) {
      setJobs([])
      setError(planningError instanceof Error ? planningError.message : 'No se ha podido cargar la planificación.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPlanning()
  }, [year])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('year', String(year))
    next.set('month', String(month))
    setSearchParams(next, { replace: true })
  }, [year, month])

  const monthJobs = useMemo(
    () => jobs.filter((job) => job.month_number === month),
    [jobs, month],
  )

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    return monthJobs.filter((job) => {
      if (statusFilter !== 'ALL' && job.status !== statusFilter) return false
      if (!query) return true
      const haystack = [
        job.title,
        job.description,
        job.maintenance_plan_code,
        job.maintenance_plan_name,
        job.apparatus_code,
        job.apparatus_name,
        job.assigned_user_name,
        job.location,
      ].filter(Boolean).join(' ').toLocaleLowerCase('es')
      return haystack.includes(query)
    })
  }, [monthJobs, search, statusFilter])

  const counts = useMemo(() => ({
    total: monthJobs.length,
    pending: monthJobs.filter((job) => job.status === 'PENDING').length,
    inProgress: monthJobs.filter((job) => job.status === 'IN_PROGRESS').length,
    completed: monthJobs.filter((job) => job.status === 'COMPLETED').length,
  }), [monthJobs])

  const weeks = useMemo(
    () => [1, 2, 3, 4, 5]
      .map((weekSlot) => ({ weekSlot, jobs: filteredJobs.filter((job) => job.week_slot === weekSlot) }))
      .filter((week) => week.jobs.length > 0),
    [filteredJobs],
  )

  function changeMonth(delta: number) {
    const nextMonth = month + delta
    if (nextMonth < 1) {
      setMonth(12)
      setYear((value) => value - 1)
    } else if (nextMonth > 12) {
      setMonth(1)
      setYear((value) => value + 1)
    } else {
      setMonth(nextMonth)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-5">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-3 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => window.location.assign('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">Planificación</h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Trabajos programados derivados del PAM</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <BackButton onBack={() => window.location.assign('/')} />
              <HomeButton onHome={() => window.location.assign('/')} />
              <IconButton icon={RefreshCw} label="Actualizar planificación" title="Actualizar" onClick={() => void loadPlanning()} disabled={loading} />
            </div>
          </div>
        </div>

        {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          {[
            ['Trabajos', counts.total],
            ['Pendientes', counts.pending],
            ['En curso', counts.inProgress],
            ['Finalizados', counts.completed],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-3 rounded-2xl bg-white p-2 shadow-lg">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeMonth(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Mes anterior"><ChevronLeft size={18} /></button>
              <div className="min-w-[180px] text-center">
                <div className="text-sm font-bold text-slate-900">{MONTHS[month - 1]} {year}</div>
                <div className="text-[10px] text-slate-400">Calendario real del mes</div>
              </div>
              <button type="button" onClick={() => changeMonth(1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Mes siguiente"><ChevronRight size={18} /></button>
              <label className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs sm:flex">
                <CalendarDays size={15} className="text-slate-400" />
                <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="bg-transparent font-semibold text-slate-700 outline-none">
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipo o trabajo…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500" />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | JobStatus)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700">
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En curso</option>
                <option value="COMPLETED">Finalizado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-lg">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">Trabajos de {MONTHS[month - 1]}</div>
            <div className="mt-0.5 text-xs text-slate-500">La posición semanal procede directamente del PAM. La fecha exacta solo aparece cuando existe programación explícita.</div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Cargando planificación…</div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-sm font-semibold text-slate-600">No hay trabajos para este periodo.</div>
              <div className="mt-1 text-xs text-slate-400">La planificación no genera datos fuera de la fuente PAM.</div>
            </div>
          ) : (
            <div className="space-y-4 p-3 sm:p-4">
              {weeks.map((week) => {
                const range = resolveWeekRange(year, month, week.weekSlot)
                return (
                  <section key={week.weekSlot} className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-700">Semana {week.weekSlot}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {range.first.toLocaleDateString('es-ES')} – {range.last.toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">{week.jobs.length} trabajos</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {week.jobs.map((job) => (
                        <div key={job.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_180px_140px_120px] md:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-xs font-semibold text-slate-800">{job.apparatus_code || '—'} · {job.apparatus_name || 'Equipo'}</div>
                              <span className={'shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ' + statusClass(job.status)}>{STATUS_LABELS[job.status]}</span>
                            </div>
                            <div className="mt-1 truncate text-[11px] text-slate-500">{job.title}</div>
                            <div className="mt-0.5 truncate text-[10px] text-slate-400">{job.location || job.plant || '—'}</div>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            <div className="font-semibold text-slate-600">Periodo</div>
                            <div className="mt-0.5">{formatRange(job)}</div>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            <div className="font-semibold text-slate-600">Responsable</div>
                            <div className="mt-0.5 truncate">{job.assigned_user_name || 'Sin asignar'}</div>
                          </div>
                          <div className="text-[10px] text-slate-500 md:text-right">
                            <div className="font-semibold text-slate-600">OT</div>
                            <div className="mt-0.5">{job.maintenance_plan_code || '—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
