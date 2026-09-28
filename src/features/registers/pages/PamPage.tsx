import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw, Search } from 'lucide-react'
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


type PamTab = 'ANNUAL' | 'EQUIPMENT' | 'CALENDAR' | 'HISTORY'

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
    if (plan.next_due_date && (!existing.next_due_date || plan.next_due_date < existing.next_due_date)) {
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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | MaintenanceType>('ALL')
  const [tab, setTab] = useState<PamTab>('ANNUAL')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadPam() {
    setLoading(true)
    setError('')

    const hotel = await supabase
      .from('hotels')
      .select('id')
      .eq('active', true)
      .order('name')
      .limit(1)
      .maybeSingle()

    if (hotel.error || !hotel.data?.id) {
      setPlans([])
      setError(hotel.error?.message ?? 'No se ha podido determinar el hotel activo.')
      setLoading(false)
      return
    }

    const result = await supabase
      .from('maintenance_plans')
      .select(
        'id, code, name, description, apparatus_registry_id, maintenance_type, external_company, periodicity_value, periodicity_unit, next_due_date, active, apparatus_registry(code, name)',
      )
      .eq('hotel_id', hotel.data.id)
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

    const result = await supabase
      .from('maintenance_executions')
      .select(
        'id, scheduled_date, executed_at, performer_name, performer_company, result, observations, maintenance_plan:maintenance_plans!inner(name, hotel_id, apparatus_registry(code, name))',
      )
      .order('executed_at', { ascending: false })

    if (result.error) {
      setExecutions([])
      setError(result.error.message)
    } else {
      setExecutions((result.data ?? []) as unknown as HistoryExecution[])
    }

    setHistoryLoading(false)
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
  const annualGroups = useMemo(() => groupPlans(filteredPlans.filter((plan) => plan.active)), [filteredPlans])
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
              <BrandLogo onActivate={() => navigate('/')} className="h-10 w-auto shrink-0 object-contain sm:h-12" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Plan Anual de Mantenimiento</h1>
                <p className="text-sm text-slate-500">PAM vivo: mantenimiento, equipos, calendario e histórico</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <BackButton onBack={() => navigate('/')} />
              <HomeButton onHome={() => navigate('/')} />
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <CalendarDays size={16} className="text-slate-500" />
                <span className="font-semibold text-slate-600">Año</span>
                <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="bg-transparent font-semibold text-slate-800 outline-none">
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((optionYear) => (
                    <option key={optionYear} value={optionYear}>{optionYear}</option>
                  ))}
                </select>
              </label>
              <IconButton icon={RefreshCw} label="Actualizar PAM" title="Actualizar" onClick={() => void loadPam()} disabled={loading} />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        )}

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Mantenimientos', allAnnualGroups.length],
            [`Trabajos previstos ${year}`, annualLoad],
            ['Vencidos', overdueCount],
            ['Sin programación', unprogrammedCount],
            ['Pico mensual', peakMonth?.count ? `${peakMonth.long} · ${peakMonth.count}` : '—'],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-2xl bg-white p-2 shadow-lg">
          {[
            ['ANNUAL', 'Plan anual'],
            ['EQUIPMENT', 'Por equipo'],
            ['CALENDAR', 'Calendario'],
            ['HISTORY', 'Histórico'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value as PamTab)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                tab === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tab === 'HISTORY' ? 'Buscar histórico…' : 'Buscar mantenimiento o equipo…'}
                className="w-[240px] rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
              />
            </div>
            {tab !== 'HISTORY' && (
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'ALL' | MaintenanceType)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="ALL">Todos</option>
                <option value="INTERNAL">Interno</option>
                <option value="EXTERNAL">Externo</option>
              </select>
            )}
          </div>
        </div>

        {tab === 'ANNUAL' && (
          <div className="rounded-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Plan anual · {year}</div>
                <div className="text-xs text-slate-500">Una fila representa un mantenimiento y permite desplegar los equipos afectados.</div>
              </div>
              <div className="text-xs text-slate-500">{annualGroups.length} mantenimientos</div>
            </div>

            <div className="max-h-[calc(100vh-365px)] min-h-[320px] overflow-auto">
              <table className="w-full min-w-[1560px] border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-20 border-b bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="sticky left-0 z-30 w-[360px] bg-slate-50 px-3 py-3 font-semibold">Mantenimiento</th>
                    <th className="w-[90px] px-3 py-3 font-semibold">Equipos</th>
                    <th className="w-[95px] px-3 py-3 font-semibold">Tipo</th>
                    <th className="w-[130px] px-3 py-3 font-semibold">Periodicidad</th>
                    <th className="w-[170px] px-3 py-3 font-semibold">Empresa</th>
                    <th className="w-[110px] px-3 py-3 font-semibold">Próxima</th>
                    <th className="w-[125px] px-3 py-3 font-semibold">Estado</th>
                    {months.map((month) => <th key={month.key} className="min-w-[58px] px-2 py-3 text-center font-semibold">{month.short}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {annualGroups.map((group) => {
                    const state = groupState(group)
                    const isExpanded = expandedGroup === group.key
                    return (
                      <tr key={group.key} className="border-b border-slate-100">
                        <td colSpan={20} className="p-0">
                          <div className="grid grid-cols-[minmax(360px,1.8fr)_90px_95px_130px_170px_110px_125px_repeat(12,58px)]">
                            <button
                              type="button"
                              onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                              className="sticky left-0 z-10 min-w-0 border-r border-slate-100 bg-white px-3 py-3 text-left hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">{isExpanded ? '▾' : '▸'}</span>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-800">{group.name.replace(/^_+/, '')}</div>
                                  {group.description && <div className="truncate text-[10px] text-slate-500">{group.description}</div>}
                                </div>
                              </div>
                            </button>
                            <div className="px-3 py-3 text-center font-semibold text-slate-700">{group.plans.length}</div>
                            <div className="px-3 py-3"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{typeLabel(group.plans[0])}</span></div>
                            <div className="px-3 py-3 whitespace-nowrap text-slate-600">{periodicityLabel(group.plans[0])}</div>
                            <div className="truncate px-3 py-3 text-slate-600">{group.external_company || 'SSTT'}</div>
                            <div className="whitespace-nowrap px-3 py-3 text-slate-600">{group.next_due_date ? new Date(group.next_due_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</div>
                            <div className="whitespace-nowrap px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${stateClass(state)}`}>{state}</span></div>
                            {months.map((month) => {
                              const count = group.plans.reduce((total, plan) => total + monthOccurrences(plan, year, Number(month.key) - 1), 0)
                              return <button key={month.key} type="button" onClick={() => navigate('/maintenance')} className="px-2 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50" title={`${month.long}: ${count} trabajos previstos`}>{count || '·'}</button>
                            })}
                          </div>
                          {isExpanded && (
                            <div className="border-t bg-slate-50 px-4 py-3">
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Equipos afectados · {group.plans.length}</div>
                              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                {group.plans.map((plan) => (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => navigate(plan.apparatus_registry_id ? `/apparatusregistry/${plan.apparatus_registry_id}` : '/apparatusregistry')}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:shadow-md"
                                  >
                                    <div className="font-semibold text-slate-800">{plan.apparatus?.code || 'Equipo sin código'}</div>
                                    <div className="truncate text-[11px] text-slate-500">{plan.apparatus?.name || 'Equipo no indicado'}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!loading && annualGroups.length === 0 && <tr><td colSpan={20} className="px-4 py-14 text-center"><div className="text-sm font-semibold text-slate-600">No hay mantenimientos que mostrar.</div><div className="mt-1 text-xs text-slate-400">El PAM no muestra datos ficticios.</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'EQUIPMENT' && (
          <div className="rounded-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">PAM por equipo · {year}</div>
                <div className="text-xs text-slate-500">Vista inspirada en el PAM original: el equipo queda a la izquierda y el año se lee de un vistazo.</div>
              </div>
              <div className="text-xs text-slate-500">{equipmentGroups.length} equipos con mantenimiento</div>
            </div>
            <div className="max-h-[calc(100vh-365px)] min-h-[320px] overflow-auto">
              <table className="w-full min-w-[1250px] border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-20 border-b bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="sticky left-0 z-30 w-[300px] bg-slate-50 px-3 py-3 font-semibold">Equipo</th>
                    <th className="w-[220px] px-3 py-3 font-semibold">Mantenimientos</th>
                    {months.map((month) => <th key={month.key} className="min-w-[62px] px-2 py-3 text-center font-semibold">{month.short}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {equipmentGroups.map((equipment) => (
                    <tr key={equipment.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-3">
                        <button type="button" onClick={() => navigate(`/apparatusregistry/${equipment.id}`)} className="text-left">
                          <div className="font-semibold text-slate-800">{equipment.code}</div>
                          <div className="max-w-[270px] truncate text-[11px] text-slate-500">{equipment.name}</div>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[215px] flex-wrap gap-1">
                          {equipment.plans.slice(0, 3).map((plan) => <span key={plan.id} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">{plan.name}</span>)}
                          {equipment.plans.length > 3 && <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-500">+{equipment.plans.length - 3}</span>}
                        </div>
                      </td>
                      {months.map((month) => {
                        const count = equipment.plans.reduce((total, plan) => total + monthOccurrences(plan, year, Number(month.key) - 1), 0)
                        return <td key={month.key} className={`px-2 py-3 text-center font-semibold ${count ? 'text-slate-800' : 'text-slate-300'}`}>{count || '·'}</td>
                      })}
                    </tr>
                  ))}
                  {!loading && equipmentGroups.length === 0 && <tr><td colSpan={14} className="px-4 py-14 text-center text-sm text-slate-400">No hay equipos con mantenimiento configurado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'CALENDAR' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
            <div className="rounded-2xl bg-white shadow-lg">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold text-slate-800">Calendario de carga · {year}</div>
                <div className="text-xs text-slate-500">La carga se calcula con las reglas disponibles; cuando el motor PAM esté conectado, estas serán las fechas reales de Trabajos Programados.</div>
              </div>
              <div className="divide-y">
                {months.map((month) => (
                  <button key={month.key} type="button" onClick={() => navigate('/maintenance')} className="grid w-full grid-cols-[110px_1fr_90px] items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <div className="font-semibold text-slate-800">{month.long}</div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-700" style={{ width: `${peakMonth.count ? Math.round((month.count / peakMonth.count) * 100) : 0}%` }} />
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-700">{month.count} trabajos</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-lg">
              <div className="text-sm font-semibold text-slate-800">Resumen</div>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between"><span>Trabajos del año</span><strong className="text-slate-900">{annualLoad}</strong></div>
                <div className="flex justify-between"><span>Mes de mayor carga</span><strong className="text-slate-900">{peakMonth?.long || '—'}</strong></div>
                <div className="flex justify-between"><span>Vencidos</span><strong className="text-slate-900">{overdueCount}</strong></div>
                <div className="flex justify-between"><span>Sin programación</span><strong className="text-slate-900">{unprogrammedCount}</strong></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'HISTORY' && (
          <div className="rounded-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Histórico de ejecuciones</div>
                <div className="text-xs text-slate-500">Las ejecuciones reales son la evidencia del mantenimiento realizado.</div>
              </div>
              <div className="text-xs text-slate-500">{filteredHistory.length} registros</div>
            </div>
            <div className="max-h-[calc(100vh-365px)] min-h-[320px] overflow-auto">
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
                    <tr key={execution.id} onClick={() => navigate('/maintenance')} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{execution.scheduled_date ? new Date(execution.scheduled_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{execution.executed_at ? new Date(execution.executed_at).toLocaleString('es-ES') : '—'}</td>
                      <td className="px-3 py-3"><div className="font-semibold text-slate-700">{execution.maintenance_plan?.apparatus_registry?.code || '—'}</div><div className="text-[10px] text-slate-500">{execution.maintenance_plan?.apparatus_registry?.name || '—'}</div></td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{execution.maintenance_plan?.name || '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{execution.performer_company || execution.performer_name || 'SSTT'}</td>
                      <td className="px-3 py-3"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">{executionResultLabel(execution.result)}</span></td>
                    </tr>
                  ))}
                  {!historyLoading && filteredHistory.length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center"><div className="text-sm font-semibold text-slate-600">No hay ejecuciones históricas registradas.</div><div className="mt-1 text-xs text-slate-400">El histórico aparecerá cuando existan ejecuciones reales.</div></td></tr>}
                  {historyLoading && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">Cargando histórico…</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
