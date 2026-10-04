import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, CalendarDays, Building2, ChevronRight, Clock3, RefreshCw, UserRound, Wrench } from 'lucide-react'
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

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')

    return plans.filter((plan) => {
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
  }, [plans, alerts, search, typeFilter, stateFilter])

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
                <p className="text-xs text-slate-500 sm:text-sm">Plan Anual de Mantenimiento · previsión y control de trabajos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <BackButton onBack={() => navigate('/maintenance')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
          </div>
        </header>

        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 shrink-0 text-slate-500" size={20} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold sm:text-base">Previsión de trabajos preventivos</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Aquí se controlan los mantenimientos previstos, tanto realizados por SSTT como por empresas externas. Las fechas y alertas proceden de los mantenimientos configurados.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_180px_180px_auto]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Buscar trabajo, equipo o empresa</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, equipo, código, empresa…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ejecutor</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as FilterType)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="ALL">Todos</option>
              <option value="INTERNAL">SSTT</option>
              <option value="EXTERNAL">Empresa externa</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado</span>
            <select
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value as FilterState)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="ALL">Todos</option>
              <option value="UPCOMING">Próximos</option>
              <option value="DUE">Hoy</option>
              <option value="OVERDUE">Vencidos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </label>

          <div className="flex items-end">
            <IconButton icon={RefreshCw} label="Actualizar" onClick={() => void loadPAM()} />
          </div>
        </section>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Trabajos previstos</div>
              <div className="text-xs text-slate-500">
                {loading ? 'Cargando…' : `${filteredPlans.length} trabajos visibles`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><UserRound size={13} /> SSTT</span>
              <span className="inline-flex items-center gap-1"><Building2 size={13} /> Empresa externa</span>
              <span className="inline-flex items-center gap-1"><Bell size={13} /> Avisos automáticos</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
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
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Wrench size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{plan.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {apparatus?.code ? `${apparatus.code} · ${apparatus.name}` : 'Sin equipo asociado'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${state.tone}`}>
                          {state.label}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${plan.maintenance_type === 'EXTERNAL' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>
                          {plan.maintenance_type === 'EXTERNAL' ? 'Externo' : 'SSTT'}
                        </span>
                        {alert && AlertIcon && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${alert.tone}`}>
                            <AlertIcon size={13} />
                            {alert.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      <div className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-slate-400" />
                        Próximo trabajo: <span className="font-semibold">{formatDate(plan.next_due_date)}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} className="text-slate-400" />
                        Frecuencia: <span className="font-semibold">{periodicityLabel(plan)}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        {plan.maintenance_type === 'EXTERNAL' ? <Building2 size={14} className="text-slate-400" /> : <UserRound size={14} className="text-slate-400" />}
                        Ejecutor: <span className="font-semibold">{plan.maintenance_type === 'EXTERNAL' ? plan.external_company || 'Empresa no indicada' : 'SSTT'}</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300" />
                </button>
              )
            })}

            {!loading && filteredPlans.length === 0 && (
              <div className="border-dashed p-10 text-center text-sm text-slate-500">
                No hay trabajos previstos que coincidan con los filtros.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
