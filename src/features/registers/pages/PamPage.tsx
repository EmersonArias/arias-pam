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

export default function PamPage() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [plans, setPlans] = useState<PamPlan[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | MaintenanceType>('ALL')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    void loadPam()
  }, [])

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

  const groups = useMemo(() => groupPlans(filteredPlans), [filteredPlans])
  const activePlans = useMemo(() => plans.filter((plan) => plan.active), [plans])
  const activeGroups = useMemo(
    () => groupPlans(activePlans),
    [activePlans],
  )

  const months = useMemo(() => {
    return MONTHS.map((month) => ({
      ...month,
      count: activeGroups.reduce(
        (total, group) =>
          total +
          group.plans.reduce(
            (groupTotal, plan) =>
              groupTotal + monthOccurrences(plan, year, Number(month.key) - 1),
            0,
          ),
        0,
      ),
    }))
  }, [activeGroups, year])

  const annualLoad = months.reduce((sum, month) => sum + month.count, 0)
  const overdueCount = activeGroups.filter(
    (group) => groupState(group) === 'Vencido',
  ).length
  const unprogrammedCount = activeGroups.filter(
    (group) => groupState(group) === 'Sin programación',
  ).length
  const peakMonth = months.reduce(
    (peak, month) => (month.count > peak.count ? month : peak),
    months[0],
  )

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
              <BrandLogo
                onActivate={() => navigate('/')}
                className="h-10 w-auto shrink-0 object-contain sm:h-12"
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Plan Anual de Mantenimiento
                </h1>
                <p className="text-sm text-slate-500">
                  Reglas preventivas, equipos afectados y carga anual
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <BackButton onBack={() => navigate('/')} />
              <HomeButton onHome={() => navigate('/')} />

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <CalendarDays size={16} className="text-slate-500" />
                <span className="font-semibold text-slate-600">Año</span>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                >
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(
                    (optionYear) => (
                      <option key={optionYear} value={optionYear}>
                        {optionYear}
                      </option>
                    ),
                  )}
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
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mantenimientos</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{activeGroups.length}</div>
            <div className="text-[10px] text-slate-400">{activePlans.length} relaciones con equipos</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Trabajos previstos {year}</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{annualLoad}</div>
            <div className="text-[10px] text-slate-400">fechas generables por las reglas</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vencidos</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{overdueCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sin programación</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{unprogrammedCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mes con mayor carga</div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {peakMonth?.count ? peakMonth.long : '—'}
            </div>
            <div className="text-[10px] text-slate-400">
              {peakMonth?.count ? `${peakMonth.count} trabajos` : 'sin trabajos previstos'}
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-2xl bg-white p-3 shadow-lg">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Buscar mantenimiento o equipo
              </span>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre, código de equipo, empresa…"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </label>

            <label className="block min-w-[180px]">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'ALL' | MaintenanceType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ALL">Todos</option>
                <option value="INTERNAL">Interno</option>
                <option value="EXTERNAL">Externo</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {months.map((month) => (
                <div
                  key={month.key}
                  className="min-w-[49px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center"
                  title={month.long}
                >
                  <div className="text-[9px] font-semibold uppercase text-slate-500">{month.short}</div>
                  <div className="text-sm font-bold text-slate-800">{month.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Mantenimiento planificado · {year}
              </div>
              <div className="text-xs text-slate-500">
                El PAM muestra primero la actuación preventiva y permite desplegar los equipos afectados.
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {groups.length} mantenimientos · {filteredPlans.length} relaciones
            </div>
          </div>

          <div className="max-h-[calc(100vh-345px)] min-h-[320px] overflow-auto">
            <table className="w-full min-w-[1560px] border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 z-20 border-b bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.4)]">
                  <th className="sticky left-0 z-30 bg-slate-50 px-3 py-3 font-semibold">Mantenimiento</th>
                  <th className="px-3 py-3 font-semibold">Equipos</th>
                  <th className="px-3 py-3 font-semibold">Tipo</th>
                  <th className="px-3 py-3 font-semibold">Periodicidad</th>
                  <th className="px-3 py-3 font-semibold">Empresa</th>
                  <th className="px-3 py-3 font-semibold">Próxima</th>
                  <th className="px-3 py-3 font-semibold">Estado</th>
                  {months.map((month) => (
                    <th key={month.key} className="min-w-[58px] px-2 py-3 text-center font-semibold">
                      {month.short}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {groups.map((group) => {
                  const state = groupState(group)
                  const isExpanded = expandedGroup === group.key

                  return (
                    <tr key={group.key} className="border-b border-slate-100">
                      <td colSpan={16} className="p-0">
                        <div className="grid grid-cols-[minmax(360px,1.8fr)_110px_90px_130px_170px_110px_120px_repeat(12,58px)] items-stretch">
                          <button
                            type="button"
                            onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                            className="sticky left-0 z-10 min-w-0 border-r border-slate-100 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                            title="Mostrar equipos afectados"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{isExpanded ? '▾' : '▸'}</span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-800">
                                  {group.name.replace(/^_+/, '')}
                                </div>
                                {group.description && (
                                  <div className="truncate text-[10px] text-slate-500">
                                    {group.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>

                          <div className="px-3 py-3 text-center">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                              {group.plans.length}
                            </span>
                          </div>
                          <div className="px-3 py-3">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                              {typeLabel(group.plans[0])}
                            </span>
                          </div>
                          <div className="px-3 py-3 whitespace-nowrap text-slate-600">
                            {periodicityLabel(group.plans[0])}
                          </div>
                          <div className="truncate px-3 py-3 text-slate-600">
                            {group.external_company || 'SSTT'}
                          </div>
                          <div className="whitespace-nowrap px-3 py-3 text-slate-600">
                            {group.next_due_date
                              ? new Date(group.next_due_date + 'T12:00:00').toLocaleDateString('es-ES')
                              : '—'}
                          </div>
                          <div className="whitespace-nowrap px-3 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${stateClass(state)}`}>
                              {state}
                            </span>
                          </div>

                          {months.map((month) => {
                            const count = group.plans.reduce(
                              (total, plan) =>
                                total + monthOccurrences(plan, year, Number(month.key) - 1),
                              0,
                            )
                            return (
                              <button
                                key={month.key}
                                type="button"
                                onClick={() => navigate('/maintenance')}
                                className={`px-2 py-3 text-center font-semibold transition hover:bg-slate-50 ${
                                  count > 0 ? 'text-slate-800' : 'text-slate-300'
                                }`}
                                title={count ? `${month.long}: ${count} trabajos previstos` : `${month.long}: sin trabajos`}
                              >
                                {count || '·'}
                              </button>
                            )
                          })}
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Equipos afectados · {group.plans.length}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              {group.plans.map((plan) => (
                                <button
                                  key={plan.id}
                                  type="button"
                                  onClick={() => navigate(
                                    plan.apparatus_registry_id
                                      ? `/apparatusregistry/${plan.apparatus_registry_id}`
                                      : '/apparatusregistry',
                                  )}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                  <div className="font-semibold text-slate-800">
                                    {plan.apparatus?.code || 'Equipo sin código'}
                                  </div>
                                  <div className="truncate text-[11px] text-slate-500">
                                    {plan.apparatus?.name || 'Equipo no indicado'}
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

                {!loading && groups.length === 0 && (
                  <tr>
                    <td colSpan={20} className="px-4 py-14 text-center">
                      <div className="text-sm font-semibold text-slate-600">
                        No hay mantenimientos que mostrar.
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        El PAM no muestra datos ficticios: aparecerán aquí los mantenimientos reales del hotel.
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={20} className="px-4 py-14 text-center text-sm text-slate-400">
                      Cargando PAM…
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
