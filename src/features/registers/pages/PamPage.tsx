import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'

type PeriodicityUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'VARIABLE'
type MaintenanceType = 'INTERNAL' | 'EXTERNAL'

type PamPlan = {
  id: string
  code: string | null
  name: string
  description: string | null
  apparatus_registry_id: string | null
  maintenance_type: MaintenanceType
  external_company: string | null
  periodicity_value: number | null
  periodicity_unit: PeriodicityUnit | null
  next_due_date: string | null
  active: boolean
  apparatus?: {
    code: string
    name: string
  } | null
}

type MonthLoad = {
  key: string
  short: string
  long: string
  count: number
}

const MONTHS: MonthLoad[] = [
  { key: '01', short: 'Ene', long: 'Enero', count: 0 },
  { key: '02', short: 'Feb', long: 'Febrero', count: 0 },
  { key: '03', short: 'Mar', long: 'Marzo', count: 0 },
  { key: '04', short: 'Abr', long: 'Abril', count: 0 },
  { key: '05', short: 'May', long: 'Mayo', count: 0 },
  { key: '06', short: 'Jun', long: 'Junio', count: 0 },
  { key: '07', short: 'Jul', long: 'Julio', count: 0 },
  { key: '08', short: 'Ago', long: 'Agosto', count: 0 },
  { key: '09', short: 'Sep', long: 'Septiembre', count: 0 },
  { key: '10', short: 'Oct', long: 'Octubre', count: 0 },
  { key: '11', short: 'Nov', long: 'Noviembre', count: 0 },
  { key: '12', short: 'Dic', long: 'Diciembre', count: 0 },
]

function parseDate(value: string | null) {
  if (!value) return null
  const date = new Date(value + 'T12:00:00')
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(from: Date, to: Date) {
  return Math.floor(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86400000,
  )
}

function monthOccurrences(plan: PamPlan, year: number, monthIndex: number) {
  const due = parseDate(plan.next_due_date)
  if (!due || !plan.periodicity_value || !plan.periodicity_unit || !plan.active) return 0

  const monthStart = new Date(year, monthIndex, 1, 12)
  const monthEnd = new Date(year, monthIndex + 1, 0, 12)

  if (plan.periodicity_unit === 'VARIABLE') {
    return due.getFullYear() === year && due.getMonth() === monthIndex ? 1 : 0
  }

  if (due > monthEnd) return 0

  if (plan.periodicity_unit === 'DAY' || plan.periodicity_unit === 'WEEK') {
    const step = plan.periodicity_unit === 'DAY'
      ? plan.periodicity_value
      : plan.periodicity_value * 7

    const first = due < monthStart ? monthStart : due
    const offset = daysBetween(due, first)

    if (offset < 0) return 0

    const remainder = offset % step
    const firstOccurrence = remainder === 0
      ? first
      : new Date(first.getFullYear(), first.getMonth(), first.getDate() + (step - remainder), 12)

    if (firstOccurrence > monthEnd) return 0

    return Math.floor(daysBetween(firstOccurrence, monthEnd) / step) + 1
  }

  if (plan.periodicity_unit === 'MONTH') {
    const dueMonth = due.getFullYear() * 12 + due.getMonth()
    const currentMonth = year * 12 + monthIndex
    const difference = currentMonth - dueMonth

    return difference >= 0 && difference % plan.periodicity_value === 0 ? 1 : 0
  }

  if (plan.periodicity_unit === 'YEAR') {
    const difference = year - due.getFullYear()
    return difference >= 0 &&
      difference % plan.periodicity_value === 0 &&
      monthIndex === due.getMonth()
      ? 1
      : 0
  }

  return 0
}

function periodicityLabel(plan: PamPlan) {
  if (!plan.periodicity_value || !plan.periodicity_unit || plan.periodicity_unit === 'VARIABLE') {
    return 'Variable'
  }

  const units: Record<Exclude<PeriodicityUnit, 'VARIABLE'>, string> = {
    DAY: plan.periodicity_value === 1 ? 'día' : 'días',
    WEEK: plan.periodicity_value === 1 ? 'semana' : 'semanas',
    MONTH: plan.periodicity_value === 1 ? 'mes' : 'meses',
    YEAR: plan.periodicity_value === 1 ? 'año' : 'años',
  }

  return `Cada ${plan.periodicity_value} ${units[plan.periodicity_unit]}`
}

function planState(nextDueDate: string | null, active: boolean) {
  if (!active) return 'Inactivo'
  if (!nextDueDate) return 'Sin programación'

  const today = new Date().toISOString().slice(0, 10)
  if (nextDueDate < today) return 'Vencido'
  if (nextDueDate === today) return 'Hoy'

  const due = parseDate(nextDueDate)
  const now = parseDate(today)
  if (!due || !now) return 'Programado'

  return daysBetween(now, due) <= 7 ? 'Próximo' : 'Programado'
}

function typeLabel(plan: PamPlan) {
  return plan.maintenance_type === 'EXTERNAL' ? 'Externo' : 'Interno'
}


type PamGroup = {
  key: string
  name: string
  description: string | null
  maintenance_type: MaintenanceType
  external_company: string | null
  periodicity_value: number | null
  periodicity_unit: PeriodicityUnit | null
  next_due_date: string | null
  plans: PamPlan[]
}

function groupKey(plan: PamPlan) {
  return [
    plan.name.trim().toLocaleLowerCase('es'),
    plan.maintenance_type,
    plan.external_company?.trim().toLocaleLowerCase('es') || '',
    plan.periodicity_value ?? '',
    plan.periodicity_unit ?? '',
  ].join('|')
}

function groupPlans(plans: PamPlan[]): PamGroup[] {
  const groups = new Map<string, PamGroup>()

  for (const plan of plans) {
    const key = groupKey(plan)
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        key,
        name: plan.name,
        description: plan.description,
        maintenance_type: plan.maintenance_type,
        external_company: plan.external_company,
        periodicity_value: plan.periodicity_value,
        periodicity_unit: plan.periodicity_unit,
        next_due_date: plan.next_due_date,
        plans: [plan],
      })
      continue
    }

    existing.plans.push(plan)
    if (
      plan.next_due_date &&
      (!existing.next_due_date || plan.next_due_date < existing.next_due_date)
    ) {
      existing.next_due_date = plan.next_due_date
    }
    if (!existing.description && plan.description) {
      existing.description = plan.description
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aDate = a.next_due_date || '9999-12-31'
    const bDate = b.next_due_date || '9999-12-31'
    if (aDate !== bDate) return aDate.localeCompare(bDate)
    return a.name.localeCompare(b.name, 'es')
  })
}

function groupState(group: PamGroup) {
  const states = group.plans.map((plan) => planState(plan.next_due_date, plan.active))
  if (states.includes('Vencido')) return 'Vencido'
  if (states.includes('Hoy')) return 'Hoy'
  if (states.includes('Próximo')) return 'Próximo'
  if (states.includes('Sin programación')) return 'Sin programación'
  return 'Programado'
}


type PamTab = 'ANNUAL' | 'CALENDAR' | 'HISTORY'

type HistoryExecution = {
  id: string
  scheduled_date: string | null
  executed_at: string | null
  performer_name: string | null
  performer_company: string | null
  result: string
  observations: string | null
  maintenance_plan?: {
    name: string
    apparatus_registry?: {
      code: string
      name: string
    } | null
  } | null
}

type EquipmentGroup = {
  id: string
  code: string
  name: string
  plans: PamPlan[]
}

function groupEquipment(plans: PamPlan[]): EquipmentGroup[] {
  const groups = new Map<string, EquipmentGroup>()

  for (const plan of plans) {
    const id = plan.apparatus_registry_id
    if (!id || !plan.apparatus) continue

    const existing = groups.get(id)
    if (!existing) {
      groups.set(id, {
        id,
        code: plan.apparatus.code,
        name: plan.apparatus.name,
        plans: [plan],
      })
    } else {
      existing.plans.push(plan)
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.code.localeCompare(b.code, 'es'),
  )
}

function executionResultLabel(result: string) {
  switch (result) {
    case 'COMPLETED':
      return 'Conforme'
    case 'COMPLETED_WITH_ISSUES':
      return 'Con incidencias'
    case 'NOT_CONFORM':
      return 'No conforme'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return result
  }
}

export default function PamPage() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [plans, setPlans] = useState<PamPlan[]>([])
  const [executions, setExecutions] = useState<HistoryExecution[]>([])
  const [hotelId, setHotelId] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | MaintenanceType>('ALL')
  const [tab, setTab] = useState<PamTab>('ANNUAL')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
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

  async function loadPam() {
    setLoading(true)
    setError('')

    let currentHotelId = ''
    try {
      currentHotelId = await resolveHotelId()
    } catch (hotelError) {
      setPlans([])
      setError(hotelError instanceof Error ? hotelError.message : 'No se ha podido determinar el hotel activo.')
      setLoading(false)
      return
    }

    const result = await supabase
      .from('maintenance_plans')
      .select(
        'id, code, name, description, apparatus_registry_id, maintenance_type, external_company, periodicity_value, periodicity_unit, next_due_date, active, apparatus_registry(code, name)',
      )
      .eq('hotel_id', currentHotelId)
      .order('next_due_date', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })

    if (result.error) {
      setPlans([])
      setError(result.error.message)
    } else {
      setPlans((result.data ?? []) as unknown as PamPlan[])
    }

    setLoading(false)
  }

  async function loadHistory() {
    setHistoryLoading(true)

    try {
      const currentHotelId = await resolveHotelId()
      const result = await supabase
        .from('maintenance_executions')
      .select(
        'id, scheduled_date, executed_at, performer_name, performer_company, result, observations, maintenance_plan:maintenance_plans!inner(name, hotel_id, apparatus_registry(code, name))',
        )
        .eq('maintenance_plan.hotel_id', currentHotelId)
        .order('executed_at', { ascending: false })

      if (result.error) {
        setExecutions([])
        setError(result.error.message)
      } else {
        setExecutions((result.data ?? []) as unknown as HistoryExecution[])
      }
    } catch (historyError) {
      setExecutions([])
      setError(historyError instanceof Error ? historyError.message : 'No se ha podido cargar el histórico.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    void loadPam()
  }, [])

  useEffect(() => {
    if (tab === 'HISTORY') {
      void loadHistory()
    }
  }, [tab])

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')

    return plans.filter((plan) => {
      if (typeFilter !== 'ALL' && plan.maintenance_type !== typeFilter) return false
      if (!query) return true

      const haystack = [
        plan.code,
        plan.name,
        plan.description,
        plan.external_company,
        plan.apparatus?.code,
        plan.apparatus?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')

      return haystack.includes(query)
    })
  }, [plans, search, typeFilter])

  const activePlans = useMemo(() => plans.filter((plan) => plan.active), [plans])
  const allAnnualGroups = useMemo(() => groupPlans(activePlans), [activePlans])
  const equipmentGroups = useMemo(() => groupEquipment(filteredPlans.filter((plan) => plan.active)), [filteredPlans])

  const months = useMemo(() => MONTHS.map((month) => ({
    ...month,
    count: activePlans.reduce(
      (total, plan) => total + monthOccurrences(plan, year, Number(month.key) - 1),
      0,
    ),
  })), [activePlans, year])

  const annualLoad = months.reduce((sum, month) => sum + month.count, 0)
  const overdueCount = allAnnualGroups.filter((group) => groupState(group) === 'Vencido').length
  const unprogrammedCount = allAnnualGroups.filter((group) => groupState(group) === 'Sin programación').length
  const peakMonth = months.reduce(
    (peak, month) => (month.count > peak.count ? month : peak),
    months[0],
  )

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    return executions.filter((execution) => {
      const plan = execution.maintenance_plan
      if (!query) return true
      const haystack = [
        plan?.name,
        plan?.apparatus_registry?.code,
        plan?.apparatus_registry?.name,
        execution.performer_name,
        execution.performer_company,
        execution.result,
        execution.observations,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')
      return haystack.includes(query)
    })
  }, [executions, search])

  function stateClass(state: string) {
    return state === 'Vencido'
      ? 'bg-rose-100 text-rose-700'
      : state === 'Hoy'
        ? 'bg-amber-100 text-amber-700'
        : state === 'Próximo'
          ? 'bg-blue-100 text-blue-700'
          : state === 'Sin programación'
            ? 'bg-slate-100 text-slate-500'
            : 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-5">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-3 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">Plan Anual de Mantenimiento</h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Matriz anual por equipo · planificación preventiva del hotel</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <BackButton onBack={() => navigate('/')} />
              <HomeButton onHome={() => navigate('/')} />
              <label className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm sm:col-span-1">
                <CalendarDays size={16} className="text-slate-500" />
                <span className="font-semibold text-slate-600">Año</span>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                >
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((optionYear) => (
                    <option key={optionYear} value={optionYear}>{optionYear}</option>
                  ))}
                </select>
              </label>
              <IconButton
                icon={RefreshCw}
                label="Actualizar PAM"
                title="Actualizar"
                onClick={() => void loadPam()}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mantenimientos</div>
            <div className="text-base font-bold text-slate-900">{allAnnualGroups.length}</div>
          </div>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Trabajos previstos {year}</div>
            <div className="text-base font-bold text-slate-900">{annualLoad}</div>
          </div>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Vencidos</div>
              <div className="text-base font-bold text-slate-900">{overdueCount}</div>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sin programación</div>
              <div className="text-base font-bold text-slate-900">{unprogrammedCount}</div>
            </div>
          </div>
          <div className="ml-auto hidden sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mayor carga</div>
            <div className="text-sm font-bold text-slate-800">{peakMonth?.count ? `${peakMonth.long} · ${peakMonth.count}` : '—'}</div>
          </div>
        </div>

        <div className="mb-3 rounded-2xl bg-white p-2 shadow-lg">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex gap-1.5 overflow-x-auto">
              {[
                ['ANNUAL', 'PAM anual'],
                ['CALENDAR', 'Calendario'],
                ['HISTORY', 'Histórico'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value as PamTab)}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    tab === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={tab === 'HISTORY' ? 'Buscar histórico…' : 'Buscar equipo o mantenimiento…'}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
                />
              </div>
              {tab !== 'HISTORY' && (
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as 'ALL' | MaintenanceType)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                >
                  <option value="ALL">Todos los tipos</option>
                  <option value="INTERNAL">Interno</option>
                  <option value="EXTERNAL">Externo</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {tab === 'ANNUAL' && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">PAM</span>
                    Matriz de planificación · {year}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Cada fila es un equipo. Las celdas muestran la carga preventiva prevista en cada mes.
                  </div>
                </div>
                <div className="text-xs text-slate-400">{equipmentGroups.length} equipos con mantenimiento</div>
              </div>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
                <span className="font-semibold uppercase tracking-wide text-slate-400">Lectura</span>
                <span className="inline-flex items-center gap-1.5"><span className="font-bold text-slate-700">●</span> Trabajo previsto</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Equipo con vencimiento</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Próximo / hoy</span>
                <span className="ml-auto hidden sm:inline">Toca un equipo para ver sus mantenimientos.</span>
              </div>
            </div>

            <div className="md:hidden">
              <div className="space-y-2 p-2">
                {equipmentGroups.map((equipment) => {
                  const state = groupState({
                    key: equipment.id,
                    name: equipment.name,
                    description: null,
                    maintenance_type: equipment.plans[0]?.maintenance_type ?? 'INTERNAL',
                    external_company: equipment.plans[0]?.external_company ?? null,
                    periodicity_value: equipment.plans[0]?.periodicity_value ?? null,
                    periodicity_unit: equipment.plans[0]?.periodicity_unit ?? null,
                    next_due_date: equipment.plans.reduce<string | null>((nearest, plan) => {
                      if (!plan.next_due_date) return nearest
                      if (!nearest || plan.next_due_date < nearest) return plan.next_due_date
                      return nearest
                    }, null),
                    plans: equipment.plans,
                  })
                  const isExpanded = expandedGroup === equipment.id
                  return (
                    <div key={equipment.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(isExpanded ? null : equipment.id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-semibold text-slate-900">{equipment.code}</div>
                              <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-slate-500">{equipment.name}</div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${stateClass(state)}`}>{state}</span>
                        </div>
                        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                          {months.map((month) => {
                            const count = equipment.plans.reduce((total, plan) => total + monthOccurrences(plan, year, Number(month.key) - 1), 0)
                            return (
                              <span key={month.key} className={`min-w-[48px] rounded-lg border px-1.5 py-1 text-center ${count ? 'border-slate-200 bg-slate-50' : 'border-transparent bg-slate-50/40'}`}>
                                <span className="block text-[8px] uppercase tracking-wide text-slate-400">{month.short}</span>
                                <span className={`text-xs font-bold ${count ? 'text-slate-800' : 'text-slate-300'}`}>{count || '·'}</span>
                              </span>
                            )
                          })}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t bg-slate-50 px-3 py-2.5">
                          <div className="space-y-1.5">
                            {equipment.plans.map((plan) => (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => navigate(plan.apparatus_registry_id ? `/apparatusregistry/${plan.apparatus_registry_id}` : '/apparatusregistry')}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-slate-800">{plan.name.replace(/^_+/, '')}</div>
                                    <div className="mt-0.5 truncate text-[10px] text-slate-500">{periodicityLabel(plan)} · {typeLabel(plan)}</div>
                                  </div>
                                  <div className="shrink-0 text-[10px] text-slate-500">{plan.next_due_date ? new Date(plan.next_due_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!loading && equipmentGroups.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No hay equipos con mantenimiento configurado.</div>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="max-h-[calc(100vh-340px)] min-h-[360px] overflow-auto">
                <table className="w-full min-w-[1180px] border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="sticky left-0 z-30 w-[340px] border-r border-slate-200 bg-slate-50 px-4 py-3 font-semibold">Equipo</th>
                      <th className="w-[110px] border-r border-slate-200 bg-slate-50 px-3 py-3 font-semibold">Mantenimientos</th>
                      {months.map((month) => (
                        <th key={month.key} className="min-w-[62px] px-2 py-3 text-center font-semibold">{month.short}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentGroups.map((equipment) => {
                      const nearestDate = equipment.plans.reduce<string | null>((nearest, plan) => {
                        if (!plan.next_due_date) return nearest
                        if (!nearest || plan.next_due_date < nearest) return plan.next_due_date
                        return nearest
                      }, null)
                      const state = groupState({
                        key: equipment.id,
                        name: equipment.name,
                        description: null,
                        maintenance_type: equipment.plans[0]?.maintenance_type ?? 'INTERNAL',
                        external_company: equipment.plans[0]?.external_company ?? null,
                        periodicity_value: equipment.plans[0]?.periodicity_value ?? null,
                        periodicity_unit: equipment.plans[0]?.periodicity_unit ?? null,
                        next_due_date: nearestDate,
                        plans: equipment.plans,
                      })
                      const isExpanded = expandedGroup === equipment.id

                      return (
                        <tr key={equipment.id} className="border-b border-slate-100 align-top">
                          <td colSpan={14} className="p-0">
                            <div className="grid grid-cols-[340px_110px_repeat(12,minmax(62px,1fr))]">
                              <button
                                type="button"
                                onClick={() => setExpandedGroup(isExpanded ? null : equipment.id)}
                                className="sticky left-0 z-10 min-w-0 border-r border-slate-100 bg-white px-4 py-3 text-left hover:bg-slate-50"
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-slate-900">{equipment.code}</div>
                                    <div className="truncate text-[11px] text-slate-500">{equipment.name}</div>
                                  </div>
                                  <span className={`ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${stateClass(state)}`}>{state}</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpandedGroup(isExpanded ? null : equipment.id)}
                                className="border-r border-slate-100 bg-white px-3 py-3 text-center hover:bg-slate-50"
                              >
                                <div className="text-base font-bold text-slate-800">{equipment.plans.length}</div>
                                <div className="text-[9px] text-slate-400">planes</div>
                              </button>

                              {months.map((month) => {
                                const count = equipment.plans.reduce((total, plan) => total + monthOccurrences(plan, year, Number(month.key) - 1), 0)
                                const width = Math.min(count, 5)
                                return (
                                  <button
                                    key={month.key}
                                    type="button"
                                    onClick={() => navigate('/maintenance')}
                                    title={`${month.long}: ${count} trabajos previstos`}
                                    className={`border-r border-slate-100 px-2 py-3 text-center transition hover:bg-slate-50 ${count ? 'bg-white' : 'bg-slate-50/30'}`}
                                  >
                                    <div className="flex min-h-[18px] items-center justify-center gap-0.5">
                                      {count > 0 ? Array.from({ length: width }, (_, index) => (
                                        <span key={index} className="text-[11px] leading-none text-slate-700">●</span>
                                      )) : <span className="text-slate-300">·</span>}
                                    </div>
                                    {count > 5 && <div className="text-[9px] font-semibold text-slate-500">+{count - 5}</div>}
                                    <div className="mt-0.5 text-[9px] font-semibold text-slate-400">{count || ''}</div>
                                  </button>
                                )
                              })}
                            </div>

                            {isExpanded && (
                              <div className="border-t bg-slate-50 px-4 py-3">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mantenimientos del equipo · {equipment.plans.length}</div>
                                    <div className="mt-0.5 text-[10px] text-slate-400">{equipment.name}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/apparatusregistry/${equipment.id}`)}
                                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                                  >
                                    Ver ficha del equipo
                                  </button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                  {equipment.plans.map((plan) => (
                                    <button
                                      key={plan.id}
                                      type="button"
                                      onClick={() => navigate('/maintenance')}
                                      className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:shadow-md"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="truncate font-semibold text-slate-800">{plan.name.replace(/^_+/, '')}</div>
                                          <div className="mt-1 text-[10px] text-slate-500">{periodicityLabel(plan)}</div>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">{typeLabel(plan)}</span>
                                      </div>
                                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                                        <span>Próxima</span>
                                        <span className="font-semibold text-slate-700">{plan.next_due_date ? new Date(plan.next_due_date + 'T12:00:00').toLocaleDateString('es-ES') : 'Sin fecha'}</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {!loading && equipmentGroups.length === 0 && (
                      <tr>
                        <td colSpan={14} className="px-4 py-16 text-center">
                          <div className="text-sm font-semibold text-slate-600">No hay equipos con mantenimiento configurado.</div>
                          <div className="mt-1 text-xs text-slate-400">El PAM no muestra datos ficticios.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'CALENDAR' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="rounded-2xl bg-white shadow-lg">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-800">Carga anual · {year}</div>
                <div className="mt-0.5 text-xs text-slate-500">Vista de carga mensual del PAM.</div>
              </div>
              <div className="divide-y">
                {months.map((month) => (
                  <button
                    key={month.key}
                    type="button"
                    onClick={() => navigate('/maintenance')}
                    className="grid w-full grid-cols-[86px_1fr_76px] items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:grid-cols-[110px_1fr_90px]"
                  >
                    <div className="font-semibold text-slate-800">{month.long}</div>
                    <div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-700 transition-all"
                          style={{ width: `${peakMonth.count ? Math.round((month.count / peakMonth.count) * 100) : 0}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[9px] text-slate-400">{month.count ? 'Carga programada' : 'Sin carga calculada'}</div>
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-700">{month.count}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-lg">
              <div className="text-sm font-semibold text-slate-800">Resumen del año</div>
              <div className="mt-3 divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between py-2.5"><span className="text-slate-500">Trabajos previstos</span><strong className="text-slate-900">{annualLoad}</strong></div>
                <div className="flex items-center justify-between py-2.5"><span className="text-slate-500">Mes de mayor carga</span><strong className="text-slate-900">{peakMonth?.long || '—'}</strong></div>
                <div className="flex items-center justify-between py-2.5"><span className="text-slate-500">Vencidos</span><strong className="text-slate-900">{overdueCount}</strong></div>
                <div className="flex items-center justify-between py-2.5"><span className="text-slate-500">Sin programación</span><strong className="text-slate-900">{unprogrammedCount}</strong></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'HISTORY' && (
          <div className="rounded-2xl bg-white shadow-lg">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Histórico de ejecuciones</div>
                  <div className="mt-0.5 text-xs text-slate-500">Las ejecuciones reales son la evidencia del mantenimiento realizado.</div>
                </div>
                <div className="text-xs text-slate-400">{filteredHistory.length} registros</div>
              </div>
            </div>

            <div className="md:hidden">
              <div className="space-y-2 p-2">
                {filteredHistory.map((execution) => (
                  <button
                    key={execution.id}
                    type="button"
                    onClick={() => navigate('/maintenance')}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-800">{execution.maintenance_plan?.name || '—'}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500">{execution.maintenance_plan?.apparatus_registry?.code || '—'}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">{executionResultLabel(execution.result)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-500">
                      <div><span className="font-semibold">Prevista:</span> {execution.scheduled_date ? new Date(execution.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</div>
                      <div><span className="font-semibold">Realizada:</span> {execution.executed_at ? new Date(execution.executed_at).toLocaleDateString('es-ES') : '—'}</div>
                      <div className="col-span-2"><span className="font-semibold">Empresa / técnico:</span> {execution.performer_company || execution.performer_name || 'SSTT'}</div>
                    </div>
                  </button>
                ))}
                {!historyLoading && filteredHistory.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No hay ejecuciones históricas registradas.</div>
                )}
                {historyLoading && <div className="p-8 text-center text-sm text-slate-400">Cargando histórico…</div>}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="max-h-[calc(100vh-340px)] min-h-[360px] overflow-auto">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3 font-semibold">Fecha prevista</th>
                      <th className="px-3 py-3 font-semibold">Realizada</th>
                      <th className="px-3 py-3 font-semibold">Equipo</th>
                      <th className="px-3 py-3 font-semibold">Mantenimiento</th>
                      <th className="px-3 py-3 font-semibold">Empresa / técnico</th>
                      <th className="px-3 py-3 font-semibold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((execution) => (
                      <tr
                        key={execution.id}
                        onClick={() => navigate('/maintenance')}
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{execution.scheduled_date ? new Date(execution.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{execution.executed_at ? new Date(execution.executed_at).toLocaleString('es-ES') : '—'}</td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-700">{execution.maintenance_plan?.apparatus_registry?.code || '—'}</div>
                          <div className="text-[10px] text-slate-500">{execution.maintenance_plan?.apparatus_registry?.name || '—'}</div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-700">{execution.maintenance_plan?.name || '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{execution.performer_company || execution.performer_name || 'SSTT'}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{executionResultLabel(execution.result)}</span>
                        </td>
                      </tr>
                    ))}
                    {!historyLoading && filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-14 text-center">
                          <div className="text-sm font-semibold text-slate-600">No hay ejecuciones históricas registradas.</div>
                          <div className="mt-1 text-xs text-slate-400">El histórico aparecerá cuando existan ejecuciones reales.</div>
                        </td>
                      </tr>
                    )}
                    {historyLoading && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">Cargando histórico…</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
