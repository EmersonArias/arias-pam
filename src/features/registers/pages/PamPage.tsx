import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'

type PeriodicityUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'VARIABLE'

type PamPlan = {
  id: string
  code: string | null
  name: string
  apparatus_registry_id: string | null
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
  count: number
}

const MONTHS: MonthLoad[] = [
  { key: '01', short: 'Ene', count: 0 },
  { key: '02', short: 'Feb', count: 0 },
  { key: '03', short: 'Mar', count: 0 },
  { key: '04', short: 'Abr', count: 0 },
  { key: '05', short: 'May', count: 0 },
  { key: '06', short: 'Jun', count: 0 },
  { key: '07', short: 'Jul', count: 0 },
  { key: '08', short: 'Ago', count: 0 },
  { key: '09', short: 'Sep', count: 0 },
  { key: '10', short: 'Oct', count: 0 },
  { key: '11', short: 'Nov', count: 0 },
  { key: '12', short: 'Dic', count: 0 },
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

function monthOccurrences(
  plan: PamPlan,
  year: number,
  monthIndex: number,
) {
  const due = parseDate(plan.next_due_date)
  if (!due || !plan.periodicity_value || !plan.periodicity_unit) return 0
  if (!plan.active) return 0

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
  if (!nextDueDate) return 'Sin fecha'

  const today = new Date().toISOString().slice(0, 10)
  if (nextDueDate < today) return 'Vencido'
  if (nextDueDate === today) return 'Hoy'

  const due = parseDate(nextDueDate)
  const now = parseDate(today)
  if (!due || !now) return 'Programado'

  return daysBetween(now, due) <= 7 ? 'Próximo' : 'Programado'
}

export default function PamPage() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [plans, setPlans] = useState<PamPlan[]>([])
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
        'id, code, name, apparatus_registry_id, periodicity_value, periodicity_unit, next_due_date, active, apparatus_registry(code, name)',
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

  const months = useMemo(() => {
    return MONTHS.map((month) => ({
      ...month,
      count: plans.reduce(
        (total, plan) =>
          total + monthOccurrences(plan, year, Number(month.key) - 1),
        0,
      ),
    }))
  }, [plans, year])

  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.active),
    [plans],
  )

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo
                onActivate={() => navigate('/')}
                className="h-11 w-auto shrink-0 object-contain sm:h-13"
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Plan Anual de Mantenimiento
                </h1>
                <p className="text-sm text-slate-500">
                  Plan preventivo y carga anual prevista
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <BackButton onBack={() => navigate('/')} />
              <HomeButton onHome={() => navigate('/')} />

              <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
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
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Mantenimientos activos
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {visiblePlans.length}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Trabajos previstos {year}
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {months.reduce((sum, month) => sum + month.count, 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Pico de carga mensual
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {Math.max(0, ...months.map((month) => month.count))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Calendario anual {year}
              </div>
              <div className="text-xs text-slate-500">
                La carga mensual se calcula a partir de la próxima fecha y periodicidad configuradas.
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {visiblePlans.length} mantenimiento{visiblePlans.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="max-h-[calc(100vh-360px)] min-h-[320px] overflow-auto">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 z-20 border-b bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.4)]">
                  <th className="sticky left-0 z-30 bg-slate-50 px-3 py-3 font-semibold">Código</th>
                  <th className="sticky left-[86px] z-30 bg-slate-50 px-3 py-3 font-semibold">Equipo</th>
                  <th className="px-3 py-3 font-semibold">Mantenimiento</th>
                  <th className="px-3 py-3 font-semibold">Periodicidad</th>
                  <th className="px-3 py-3 font-semibold">Estado</th>
                  {months.map((month) => (
                    <th key={month.key} className="min-w-[62px] px-2 py-3 text-center font-semibold">
                      {month.short}
                    </th>
                  ))}
                </tr>
                <tr className="sticky top-[41px] z-10 border-b bg-white text-xs shadow-sm">
                  <th className="sticky left-0 z-20 bg-white px-3 py-2 text-left font-semibold text-slate-500">
                    CARGA
                  </th>
                  <th className="sticky left-[86px] z-20 bg-white px-3 py-2 font-semibold text-slate-700">
                    —
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Trabajos previstos</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">—</th>
                  <th className="px-3 py-2 font-semibold text-slate-500">—</th>
                  {months.map((month) => (
                    <th key={month.key} className="px-2 py-2 text-center text-sm font-bold text-slate-800">
                      {month.count || '—'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePlans.map((plan) => (
                  <tr
                    key={plan.id}
                    onClick={() => navigate('/maintenance')}
                    className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="sticky left-0 bg-white px-3 py-3 font-semibold text-slate-800">
                      {plan.code || '—'}
                    </td>
                    <td className="sticky left-[86px] bg-white px-3 py-3">
                      <div className="font-semibold text-slate-800">
                        {plan.apparatus?.code || '—'}
                      </div>
                      <div className="max-w-[180px] truncate text-[10px] text-slate-500">
                        {plan.apparatus?.name || 'Equipo no indicado'}
                      </div>
                    </td>
                    <td className="max-w-[300px] px-3 py-3">
                      <div className="truncate font-semibold text-slate-800">
                        {plan.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {periodicityLabel(plan)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {(() => {
                        const state = planState(plan.next_due_date, plan.active)
                        const stateClass =
                          state === 'Vencido'
                            ? 'bg-rose-100 text-rose-700'
                            : state === 'Hoy'
                              ? 'bg-amber-100 text-amber-700'
                              : state === 'Próximo'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'

                        return (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${stateClass}`}>
                            {state}
                          </span>
                        )
                      })()}
                    </td>
                    {months.map((month) => {
                      const count = monthOccurrences(plan, year, Number(month.key) - 1)
                      return (
                        <td
                          key={month.key}
                          className={`px-2 py-3 text-center font-semibold ${count > 0 ? 'text-slate-800' : 'text-slate-300'}`}
                        >
                          {count || '·'}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {!loading && visiblePlans.length === 0 && (
                  <tr>
                    <td colSpan={17} className="px-4 py-14 text-center">
                      <div className="text-sm font-semibold text-slate-600">
                        No hay mantenimientos configurados para este hotel.
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        El PAM no muestra datos ficticios: aparecerá aquí cuando existan mantenimientos reales.
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={17} className="px-4 py-14 text-center text-sm text-slate-400">
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
