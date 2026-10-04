import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'
import { supabase } from '../../../lib/supabase'

type FrequencyKey =
  | 'DAILY'
  | 'WEEKLY'
  | 'FORTNIGHTLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'OTHER'

type SourceGroup = {
  source_row: number
  maintenance_name: string
}

type SourceMark = {
  source_row: number
  source_apparatus_id: number
  mark_code: string
  month_number: number
  week_slot: number
}

type Apparatus = {
  source_id: number | null
  code: string
  name: string
  maintenance: string | null
}

type PamWork = {
  sourceId: number
  code: string
  name: string
  work: string
  periodicity: string
  nextDate: string | null
  executor: string
  state: 'Pendiente' | 'En curso' | 'Finalizado'
}

const dailyPamSourceIds = [
  8, 93,
  168, 169, 170, 171, 172,
  173, 174,
  175, 176, 177, 178, 179, 180,
  218, 224, 266, 298, 299, 332,
  264, 334,
  144, 145, 149, 335,
]

const frequencyCards: Array<{
  key: FrequencyKey
  label: string
  description: string
}> = [
  { key: 'DAILY', label: 'Diario', description: 'Activos atendidos diariamente' },
  { key: 'WEEKLY', label: 'Semanal', description: 'Pendiente de separar del PAM' },
  { key: 'FORTNIGHTLY', label: 'Quincenal', description: 'Trabajos cada dos semanas' },
  { key: 'MONTHLY', label: 'Mensual', description: 'Trabajos una vez al mes' },
  { key: 'BIMONTHLY', label: 'Bimensual', description: 'Trabajos cada dos meses' },
  { key: 'QUARTERLY', label: 'Trimestral', description: 'Trabajos cada tres meses' },
  { key: 'SEMIANNUAL', label: 'Semestral', description: 'Trabajos cada seis meses' },
  { key: 'ANNUAL', label: 'Anual', description: 'Trabajos una vez al año' },
  { key: 'OTHER', label: 'Otras', description: 'Frecuencias no clasificadas' },
]

const actionLabels: Record<string, string> = {
  DE: 'DOSIFICAR ENCIMAS',
  E: 'ENGRASE',
  EXT: 'MANTENIMIENTO EXTERNO',
  F: 'FICHA DE REVISION',
  L: 'LIMPIEZA',
  LF: 'LIMPIEZA DE FILTROS',
  RG: 'REVISION GENERAL',
  CP: 'CONTROL DE PRESIONES',
}

function localDateString() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function formatDate(value: string | null) {
  if (!value) return 'Pendiente de planificar'
  return new Date(value + 'T12:00:00').toLocaleDateString('es-ES')
}

function actionLabel(code: string) {
  return actionLabels[code] ?? code
}

function executorLabel(value: string | null) {
  const normalized = value?.trim() ?? ''
  if (!normalized || normalized.toUpperCase() === 'SB HOTELS') return 'SSTT'
  return normalized
}

function deriveFrequency(
  sourceRow: number,
  marks: SourceMark[],
): FrequencyKey {
  const slots = Array.from(
    new Set(
      marks.map((mark) => ((mark.month_number - 1) * 4) + mark.week_slot),
    ),
  ).sort((a, b) => a - b)

  if (slots.length === 0) return 'OTHER'
  if (slots.length === 1) return 'ANNUAL'

  const deltas = slots.slice(1).map((slot, index) => slot - slots[index])
  const sameInterval = deltas.every((delta) => delta === deltas[0])

  if (!sameInterval) return 'OTHER'

  switch (deltas[0]) {
    case 2: return 'FORTNIGHTLY'
    case 4: return 'MONTHLY'
    case 8: return 'BIMONTHLY'
    case 12: return 'QUARTERLY'
    case 24: return 'SEMIANNUAL'
    case 48: return 'ANNUAL'
    default:
      return sourceRow > 18 ? 'OTHER' : 'OTHER'
  }
}

function uniqueWorks(
  rows: SourceMark[],
  apparatusBySourceId: Map<number, Apparatus>,
  periodicity: string,
  nextDate: string | null,
) {
  const works = new Map<string, PamWork>()

  for (const row of rows) {
    const apparatus = apparatusBySourceId.get(row.source_apparatus_id)
    const work = actionLabel(row.mark_code)
    const key = `${row.source_apparatus_id}-${row.mark_code}`

    if (works.has(key)) continue

    works.set(key, {
      sourceId: row.source_apparatus_id,
      code: apparatus?.code ?? '—',
      name: apparatus?.name ?? 'Activo PAM sin equipo resuelto',
      work,
      periodicity,
      nextDate,
      executor: executorLabel(apparatus?.maintenance ?? null),
      state: 'Pendiente',
    })
  }

  return Array.from(works.values()).sort((a, b) => {
    if (a.sourceId !== b.sourceId) return a.sourceId - b.sourceId
    return a.work.localeCompare(b.work, 'es')
  })
}

export default function MaintenancePamPage() {
  const navigate = useNavigate()
  const [sourceGroups, setSourceGroups] = useState<SourceGroup[]>([])
  const [sourceMarks, setSourceMarks] = useState<SourceMark[]>([])
  const [apparatus, setApparatus] = useState<Apparatus[]>([])
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyKey | null>(null)
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

    const [groupsQuery, marksQuery, apparatusQuery] = await Promise.all([
      supabase
        .from('pam_source_groups')
        .select('source_row, maintenance_name')
        .eq('hotel_id', hotelId)
        .eq('plan_year', 2026)
        .order('source_row'),
      supabase
        .from('pam_source_marks')
        .select('source_row, source_apparatus_id, mark_code, month_number, week_slot')
        .eq('hotel_id', hotelId)
        .eq('plan_year', 2026)
        .order('source_row')
        .order('source_apparatus_id'),
      supabase
        .from('apparatus_registry')
        .select('source_id, code, name, maintenance')
        .eq('hotel_id', hotelId)
        .eq('active', true)
        .order('source_id'),
    ])

    if (groupsQuery.error || marksQuery.error || apparatusQuery.error) {
      setError(
        groupsQuery.error?.message
          ?? marksQuery.error?.message
          ?? apparatusQuery.error?.message
          ?? 'No se ha podido cargar el PAM.',
      )
      setLoading(false)
      return
    }

    setSourceGroups((groupsQuery.data ?? []) as SourceGroup[])
    setSourceMarks((marksQuery.data ?? []) as SourceMark[])
    setApparatus((apparatusQuery.data ?? []) as Apparatus[])
    setLoading(false)
  }

  useEffect(() => {
    void loadPAM()
  }, [])

  const frequencyWorks = useMemo(() => {
    const apparatusBySourceId = new Map<number, Apparatus>()
    apparatus.forEach((item) => {
      if (item.source_id !== null) apparatusBySourceId.set(item.source_id, item)
    })

    const worksByFrequency = new Map<FrequencyKey, PamWork[]>()
    frequencyCards.forEach((card) => worksByFrequency.set(card.key, []))

    const dailyRows: SourceMark[] = dailyPamSourceIds.map((sourceId) => ({
      source_row: 0,
      source_apparatus_id: sourceId,
      mark_code: 'F',
      month_number: 0,
      week_slot: 0,
    }))

    worksByFrequency.set(
      'DAILY',
      uniqueWorks(dailyRows, apparatusBySourceId, 'Diario', localDateString()),
    )

    const rowsForPlanning = sourceGroups.filter((group) => group.source_row >= 19)

    for (const group of rowsForPlanning) {
      const groupMarks = sourceMarks.filter((mark) => mark.source_row === group.source_row)
      const actionCodes = Array.from(new Set(groupMarks.map((mark) => mark.mark_code)))

      for (const code of actionCodes) {
        const actionMarks = groupMarks.filter((mark) => mark.mark_code === code)
        const frequency = deriveFrequency(group.source_row, actionMarks)

        if (frequency === 'OTHER' && !actionMarks.length) continue

        const existing = worksByFrequency.get(frequency) ?? []
        worksByFrequency.set(
          frequency,
          Array.from(
            new Map(
              [
                ...existing.map((work) => [`${work.sourceId}-${work.work}`, work] as const),
                ...uniqueWorks(actionMarks, apparatusBySourceId, frequencyCards.find((card) => card.key === frequency)?.label ?? 'Otras', null)
                  .map((work) => [`${work.sourceId}-${work.work}`, work] as const),
              ],
            ).values(),
          ).sort((a, b) => a.sourceId - b.sourceId),
        )
      }
    }

    // Weekly remains deliberately unclassified until the Diario/Semanal split
    // is validated against the source PAM with the user.
    worksByFrequency.set('WEEKLY', [])

    return worksByFrequency
  }, [sourceGroups, sourceMarks, apparatus])

  const normalizedSearch = search.trim().toLocaleLowerCase('es')

  const visibleFrequencyWorks = useMemo(() => {
    const filtered = new Map<FrequencyKey, PamWork[]>()

    frequencyCards.forEach((card) => {
      const works = frequencyWorks.get(card.key) ?? []
      filtered.set(
        card.key,
        !normalizedSearch
          ? works
          : works.filter((work) =>
              [
                String(work.sourceId),
                work.code,
                work.name,
                work.work,
                work.executor,
              ]
                .join(' ')
                .toLocaleLowerCase('es')
                .includes(normalizedSearch),
            ),
      )
    })

    return filtered
  }, [frequencyWorks, normalizedSearch])

  const selectedWorks = selectedFrequency
    ? visibleFrequencyWorks.get(selectedFrequency) ?? []
    : []

  const selectedLabel =
    frequencyCards.find((card) => card.key === selectedFrequency)?.label ?? ''

  const frequencyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    frequencyCards.forEach((card) => {
      const works = frequencyWorks.get(card.key) ?? []
      counts[card.key] = new Set(works.map((work) => work.sourceId)).size
    })
    return counts
  }, [frequencyWorks])

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg sm:p-3">
          <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo onActivate={() => navigate('/')} className="h-8 w-auto shrink-0 object-contain sm:h-10" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-none sm:text-2xl">PAM</h1>
                <p className="text-[11px] text-slate-500 sm:text-xs">Plan Anual de Mantenimiento</p>
              </div>
            </div>

            <div className="hidden items-center justify-center gap-2 px-2 lg:flex">
              <CalendarDays className="shrink-0 text-slate-500" size={17} />
              <span className="text-sm font-semibold text-slate-800">Previsión de trabajos preventivos</span>
            </div>

            <div className="flex justify-end gap-2">
              <BackButton onBack={() => navigate('/maintenance')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 lg:hidden">
            <CalendarDays className="shrink-0 text-slate-500" size={16} />
            <span className="text-xs font-semibold text-slate-800">Previsión de trabajos preventivos</span>
          </div>
        </header>

        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Buscar en PAM</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busca por ID PAM, código, equipo, trabajo o empresa…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Buscar en PAM"
            />
          </label>
        </section>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        )}

        <section className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {frequencyCards.map((card) => {
            const selected = selectedFrequency === card.key
            const count = normalizedSearch
              ? new Set((visibleFrequencyWorks.get(card.key) ?? []).map((work) => work.sourceId)).size
              : frequencyCounts[card.key] ?? 0

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setSelectedFrequency(selected ? null : card.key)}
                className={`rounded-lg border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-tight text-slate-900">{card.label}</div>
                    <div className="mt-0.5 text-[10px] leading-3.5 text-slate-500">{card.description}</div>
                  </div>
                  <div className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 px-1.5 text-sm font-bold text-slate-800">
                    {count}
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-semibold leading-3 text-slate-500">
                  {card.key === 'WEEKLY' && count === 0
                    ? normalizedSearch ? 'Sin coincidencias' : 'Pendiente de revisión'
                    : count === 1 ? '1 activo' : `${count} activos`}
                </div>
              </button>
            )
          })}
        </section>

        {selectedFrequency && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{selectedLabel}</div>
                <div className="text-[11px] text-slate-500">
                  {loading ? 'Cargando…' : `${selectedWorks.length} trabajos · ${new Set(selectedWorks.map((work) => work.sourceId)).size} activos`}
                </div>
              </div>

              <IconButton icon={RefreshCw} label="Actualizar" onClick={() => void loadPAM()} />
            </div>

            <div className="max-h-[calc(100vh-500px)] min-h-[240px] overflow-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 font-semibold">ID</th>
                    <th className="px-3 py-2.5 font-semibold">Activo</th>
                    <th className="px-3 py-2.5 font-semibold">Trabajo</th>
                    <th className="px-3 py-2.5 font-semibold">Periodicidad</th>
                    <th className="px-3 py-2.5 font-semibold">Próxima fecha</th>
                    <th className="px-3 py-2.5 font-semibold">Ejecutor</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedWorks.map((work) => (
                    <tr key={`${work.sourceId}-${work.work}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{work.sourceId}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">{work.code}</div>
                        <div className="text-xs text-slate-500">{work.name}</div>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{work.work}</td>
                      <td className="px-3 py-2.5 text-slate-700">{work.periodicity}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{formatDate(work.nextDate)}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{work.executor}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          {work.state}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!loading && selectedWorks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="border-dashed px-4 py-10 text-center text-sm text-slate-500">
                        No hay trabajos definidos para esta frecuencia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!selectedFrequency && !loading && (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
            Selecciona una frecuencia para ver los trabajos preventivos y los activos que deben atenderse.
          </section>
        )}
      </div>
    </div>
  )
}
