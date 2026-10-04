import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, CalendarDays, ChevronRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'
import { supabase } from '../../../lib/supabase'

type MaintenanceType = 'INTERNAL' | 'EXTERNAL'
type Plan = {
  id: string
  apparatus_registry_id: string | null
  name: string
  maintenance_type: MaintenanceType
  external_company: string | null
  periodicity_value: number | null
  periodicity_unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'VARIABLE' | null
  start_date: string | null
  next_due_date: string | null
  active: boolean
  apparatus_registry?: { code: string; name: string } | null
}

type MaintenanceAlert = {
  id: string
  maintenance_plan_id: string
  alert_type: 'UPCOMING_REVIEW' | 'DUE_TODAY' | 'OVERDUE_REVIEW' | 'OUT_OF_RANGE'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  due_date: string | null
  triggered_at: string
}

type FilterType = 'ALL' | 'INTERNAL' | 'EXTERNAL'
type FilterState = 'ALL' | 'UPCOMING' | 'DUE' | 'OVERDUE' | 'INACTIVE'

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  return new Date(value + 'T12:00:00').toLocaleDateString('es-ES')
}

function periodicityLabel(plan: Plan) {
  if (!plan.periodicity_value || !plan.periodicity_unit) return 'Variable'
  const unit = {
    DAY: 'día',
    WEEK: 'semana',
    MONTH: 'mes',
    YEAR: 'año',
    VARIABLE: 'variable',
  }[plan.periodicity_unit]
  return `${plan.periodicity_value} ${unit}${plan.periodicity_value === 1 || unit === 'variable' ? '' : 's'}`
}

function workState(plan: Plan) {
  if (!plan.active) return { label: 'Inactivo', tone: 'bg-slate-100 text-slate-600' }
  if (!plan.next_due_date) return { label: 'Sin fecha', tone: 'bg-slate-100 text-slate-600' }

  const today = new Date().toISOString().slice(0, 10)
  if (plan.next_due_date < today) return { label: 'Vencido', tone: 'bg-rose-100 text-rose-700' }
  if (plan.next_due_date === today) return { label: 'Hoy', tone: 'bg-amber-100 text-amber-700' }

  const due = new Date(plan.next_due_date + 'T12:00:00')
  const start = new Date(today + 'T12:00:00')
  const days = Math.round((due.getTime() - start.getTime()) / 86400000)

  return days <= 7
    ? { label: 'Próximo', tone: 'bg-blue-100 text-blue-700' }
    : { label: 'Programado', tone: 'bg-emerald-100 text-emerald-700' }
}

function alertBadge(planId: string, alerts: MaintenanceAlert[]) {
  const planAlerts = alerts.filter((alert) => alert.maintenance_plan_id === planId)
  if (planAlerts.some((alert) => alert.severity === 'CRITICAL')) {
    return { label: 'Alerta crítica', tone: 'bg-rose-100 text-rose-700', icon: AlertTriangle }
  }
  if (planAlerts.some((alert) => alert.severity === 'WARNING')) {
    return { label: 'Aviso', tone: 'bg-amber-100 text-amber-700', icon: Bell }
  }
  if (planAlerts.length > 0) {
    return { label: 'Aviso', tone: 'bg-blue-100 text-blue-700', icon: Bell }
  }
  return null
}

export default function MaintenancePamPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([])
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL')
  const [stateFilter, setStateFilter] = useState<FilterState>('ALL')
  const [search, setSearch] = useState('')
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadPAM() {
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
      setError(hotel.error?.message ?? 'No se ha podido determinar el hotel activo.')
      setLoading(false)
      return
    }

    const hotelId = hotel.data.id as string

    await supabase.rpc('refresh_maintenance_due_alerts', { target_hotel_id: hotelId })

    const [plansQuery, alertsQuery] = await Promise.all([
      supabase
        .from('maintenance_plans')
        .select('id, apparatus_registry_id, name, maintenance_type, external_company, periodicity_value, periodicity_unit, start_date, next_due_date, active, apparatus_registry(code, name)')
        .eq('hotel_id', hotelId)
        .order('next_due_date', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
      supabase
        .from('maintenance_alerts')
        .select('id, maintenance_plan_id, alert_type, severity, title, message, due_date, triggered_at')
        .eq('hotel_id', hotelId)
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false }),
    ])

    if (plansQuery.error || alertsQuery.error) {
      setError(plansQuery.error?.message ?? alertsQuery.error?.message ?? 'No se ha podido cargar el PAM.')
      setLoading(false)
      return
    }

    setPlans((plansQuery.data ?? []) as unknown as Plan[])
    setAlerts((alertsQuery.data ?? []) as MaintenanceAlert[])
    setLoading(false)
  }

  useEffect(() => {
    void loadPAM()
  }, [])

  function frequencyKey(plan: Plan) {
    if (plan.periodicity_unit === 'DAY' && plan.periodicity_value === 1) return 'DAILY'
    if (plan.periodicity_unit === 'WEEK' && plan.periodicity_value === 2) return 'FORTNIGHTLY'
    if (plan.periodicity_unit === 'MONTH' && plan.periodicity_value === 1) return 'MONTHLY'
    if (plan.periodicity_unit === 'MONTH' && plan.periodicity_value === 2) return 'BIMONTHLY'
    if (plan.periodicity_unit === 'MONTH' && plan.periodicity_value === 3) return 'QUARTERLY'
    if (plan.periodicity_unit === 'MONTH' && plan.periodicity_value === 6) return 'SEMIANNUAL'
    if (plan.periodicity_unit === 'YEAR' && plan.periodicity_value === 1) return 'ANNUAL'
    return 'OTHER'
  }

  const frequencyCards = [
    { key: 'DAILY', label: 'Diario', description: 'Trabajos que se realizan cada día' },
    { key: 'FORTNIGHTLY', label: 'Quincenal', description: 'Trabajos cada dos semanas' },
    { key: 'MONTHLY', label: 'Mensual', description: 'Trabajos una vez al mes' },
    { key: 'BIMONTHLY', label: 'Bimensual', description: 'Trabajos cada dos meses' },
    { key: 'QUARTERLY', label: 'Trimestral', description: 'Trabajos cada tres meses' },
    { key: 'SEMIANNUAL', label: 'Semestral', description: 'Trabajos cada seis meses' },
    { key: 'ANNUAL', label: 'Anual', description: 'Trabajos una vez al año' },
    { key: 'OTHER', label: 'Otras', description: 'Frecuencias variables o no clasificadas' },
  ] as const

  const frequencyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    frequencyCards.forEach((card) => { counts[card.key] = 0 })
    plans.forEach((plan) => { counts[frequencyKey(plan)] = (counts[frequencyKey(plan)] ?? 0) + 1 })
    return counts
  }, [plans])

  const selectedFrequencyLabel =
    frequencyCards.find((card) => card.key === selectedFrequency)?.label ?? ''

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')

    return plans.filter((plan) => {
      if (selectedFrequency && frequencyKey(plan) !== selectedFrequency) return false
      if (typeFilter !== 'ALL' && plan.maintenance_type !== typeFilter) return false

      const state = workState(plan).label
      if (stateFilter === 'UPCOMING' && state !== 'Próximo' && state !== 'Programado') return false
      if (stateFilter === 'DUE' && state !== 'Hoy') return false
      if (stateFilter === 'OVERDUE' && state !== 'Vencido') return false
      if (stateFilter === 'INACTIVE' && plan.active) return false

      if (query) {
        const apparatus = plan.apparatus_registry
        const haystack = [
          plan.name,
          plan.external_company,
          apparatus?.code,
          apparatus?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('es')

        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [plans, search, typeFilter, stateFilter, selectedFrequency])

  const openPlan = (id: string) => {
    navigate(`/maintenance/configuration?planId=${encodeURIComponent(id)}`)
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold sm:text-2xl">PAM</h1>
                <p className="text-xs text-slate-500 sm:text-sm">Plan Anual de Mantenimiento</p>
              </div>
            </div>
            <div className="flex gap-2">
              <BackButton onBack={() => navigate('/maintenance')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
          </div>
        </header>

        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 shrink-0 text-slate-500" size={20} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold sm:text-base">Previsión de trabajos preventivos</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Selecciona una frecuencia para ver los trabajos preventivos previstos de esa categoría.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {frequencyCards.map((card) => {
            const selected = selectedFrequency === card.key
            const count = frequencyCounts[card.key] ?? 0

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setSelectedFrequency(selected ? null : card.key)}
                className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-slate-900">{card.label}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{card.description}</div>
                  </div>
                  <div className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 px-2 text-lg font-bold text-slate-800">
                    {count}
                  </div>
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-500">
                  {count === 1 ? '1 trabajo' : `${count} trabajos`}
                </div>
              </button>
            )
          })}
        </section>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {selectedFrequency && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">{selectedFrequencyLabel}</div>
                  <div className="text-xs text-slate-500">
                    {loading ? 'Cargando…' : `${filteredPlans.length} trabajos`}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_170px_170px_auto_auto]">
                  <label className="block">
                    <span className="sr-only">Buscar</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar trabajo, equipo o empresa…"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </label>

                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as FilterType)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    aria-label="Filtrar por ejecutor"
                  >
                    <option value="ALL">Todos los ejecutores</option>
                    <option value="INTERNAL">SSTT</option>
                    <option value="EXTERNAL">Empresa externa</option>
                  </select>

                  <select
                    value={stateFilter}
                    onChange={(event) => setStateFilter(event.target.value as FilterState)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    aria-label="Filtrar por estado"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="UPCOMING">Próximos</option>
                    <option value="DUE">Hoy</option>
                    <option value="OVERDUE">Vencidos</option>
                    <option value="INACTIVE">Inactivos</option>
                  </select>

                  <IconButton icon={RefreshCw} label="Actualizar" onClick={() => void loadPAM()} />
                  <button
                    type="button"
                    onClick={() => setSelectedFrequency(null)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden md:block overflow-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Trabajo preventivo</th>
                    <th className="px-4 py-3 font-semibold">Equipo</th>
                    <th className="px-4 py-3 font-semibold">Próxima fecha</th>
                    <th className="px-4 py-3 font-semibold">Ejecutor</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Avisos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) => {
                    const state = workState(plan)
                    const alert = alertBadge(plan.id, alerts)
                    const AlertIcon = alert?.icon
                    const apparatus = plan.apparatus_registry

                    return (
                      <tr
                        key={plan.id}
                        onClick={() => openPlan(plan.id)}
                        className="cursor-pointer border-b transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{plan.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{periodicityLabel(plan)}</div>
                        </td>
                        <td className="px-4 py-3">
                          {apparatus?.code ? (
                            <>
                              <div className="font-semibold text-slate-800">{apparatus.code}</div>
                              <div className="text-xs text-slate-500">{apparatus.name}</div>
                            </>
                          ) : (
                            <span className="text-slate-400">Sin equipo asociado</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{formatDate(plan.next_due_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${plan.maintenance_type === 'EXTERNAL' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>
                            {plan.maintenance_type === 'EXTERNAL' ? plan.external_company || 'Empresa externa' : 'SSTT'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${state.tone}`}>
                            {state.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {alert && AlertIcon ? (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${alert.tone}`}>
                              <AlertIcon size={13} />
                              {alert.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Sin avisos</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 p-2 md:hidden">
              {filteredPlans.map((plan) => {
                const state = workState(plan)
                const alert = alertBadge(plan.id, alerts)
                const AlertIcon = alert?.icon
                const apparatus = plan.apparatus_registry

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => openPlan(plan.id)}
                    className="rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{plan.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {apparatus?.code ? `${apparatus.code} · ${apparatus.name}` : 'Sin equipo asociado'}
                        </div>
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-slate-300" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>Fecha: <span className="font-semibold">{formatDate(plan.next_due_date)}</span></div>
                      <div>Ejecutor: <span className="font-semibold">{plan.maintenance_type === 'EXTERNAL' ? plan.external_company || 'Externo' : 'SSTT'}</span></div>
                      <div>
                        <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${state.tone}`}>{state.label}</span>
                      </div>
                      <div>
                        {alert && AlertIcon && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${alert.tone}`}>
                            <AlertIcon size={12} />
                            {alert.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {!loading && filteredPlans.length === 0 && (
              <div className="border-t border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                No hay trabajos en esta frecuencia con los filtros seleccionados.
              </div>
            )}
          </section>
        )}

        {!selectedFrequency && !loading && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Selecciona una tarjeta para desplegar el listado de trabajos de esa frecuencia.
          </section>
        )}
      </div>
    </div>
  )
}
