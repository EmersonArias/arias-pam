import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import IconButton from '../../../shared/components/buttons/IconButton'
import { supabase } from '../../../lib/supabase'

type FrequencyKey =
  | 'DAILY_WEEKLY'
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
}

type PamAsset = {
  sourceId: number
  code: string
  name: string
}

const frequencyCards: Array<{
  key: FrequencyKey
  label: string
  description: string
}> = [
  { key: 'DAILY_WEEKLY', label: 'Diario / semanal', description: 'Preventivo diario/semanal del PAM' },
  { key: 'FORTNIGHTLY', label: 'Quincenal', description: 'Trabajos cada dos semanas' },
  { key: 'MONTHLY', label: 'Mensual', description: 'Trabajos una vez al mes' },
  { key: 'BIMONTHLY', label: 'Bimensual', description: 'Trabajos cada dos meses' },
  { key: 'QUARTERLY', label: 'Trimestral', description: 'Trabajos cada tres meses' },
  { key: 'SEMIANNUAL', label: 'Semestral', description: 'Trabajos cada seis meses' },
  { key: 'ANNUAL', label: 'Anual', description: 'Trabajos una vez al año' },
  { key: 'OTHER', label: 'Otras', description: 'Frecuencias no clasificadas automáticamente' },
]

function deriveFrequency(
  sourceRow: number,
  marks: SourceMark[],
): FrequencyKey {
  if (sourceRow === 6) return 'DAILY_WEEKLY'

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
    default: return 'OTHER'
  }
}

function uniqueAssets(rows: SourceMark[], apparatusBySourceId: Map<number, Apparatus>) {
  const assets = new Map<number, PamAsset>()

  for (const row of rows) {
    if (assets.has(row.source_apparatus_id)) continue

    const apparatus = apparatusBySourceId.get(row.source_apparatus_id)

    assets.set(row.source_apparatus_id, {
      sourceId: row.source_apparatus_id,
      code: apparatus?.code ?? '—',
      name: apparatus?.name ?? 'Activo PAM sin equipo resuelto',
    })
  }

  return Array.from(assets.values()).sort((a, b) => {
    if (a.sourceId !== b.sourceId) return a.sourceId - b.sourceId
    return a.code.localeCompare(b.code, 'es')
  })
}

export default function MaintenancePamPage() {
  const navigate = useNavigate()
  const [sourceGroups, setSourceGroups] = useState<SourceGroup[]>([])
  const [sourceMarks, setSourceMarks] = useState<SourceMark[]>([])
  const [apparatus, setApparatus] = useState<Apparatus[]>([])
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyKey | null>(null)
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
        .select('source_id, code, name')
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

  const frequencyAssets = useMemo(() => {
    const apparatusBySourceId = new Map<number, Apparatus>()
    apparatus.forEach((item) => {
      if (item.source_id !== null) apparatusBySourceId.set(item.source_id, item)
    })

    const assetsByFrequency = new Map<FrequencyKey, Map<number, PamAsset>>()
    frequencyCards.forEach((card) => assetsByFrequency.set(card.key, new Map()))

    const rowsForPlanning = sourceGroups.filter(
      (group) => group.source_row === 6 || group.source_row >= 19,
    )

    for (const group of rowsForPlanning) {
      const groupMarks = sourceMarks.filter((mark) => mark.source_row === group.source_row)

      const actionCodes = Array.from(new Set(groupMarks.map((mark) => mark.mark_code)))
      for (const actionCode of actionCodes) {
        const actionMarks = groupMarks.filter((mark) => mark.mark_code === actionCode)
        const frequency = deriveFrequency(group.source_row, actionMarks)
        const target = assetsByFrequency.get(frequency)
        if (!target) continue

        for (const asset of uniqueAssets(actionMarks, apparatusBySourceId)) {
          target.set(asset.sourceId, asset)
        }
      }
    }

    return new Map(
      Array.from(assetsByFrequency.entries()).map(([key, assets]) => [
        key,
        Array.from(assets.values()).sort((a, b) => a.sourceId - b.sourceId),
      ]),
    )
  }, [sourceGroups, sourceMarks, apparatus])

  const selectedAssets = selectedFrequency
    ? frequencyAssets.get(selectedFrequency) ?? []
    : []

  const selectedLabel =
    frequencyCards.find((card) => card.key === selectedFrequency)?.label ?? ''

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo
                onActivate={() => navigate('/')}
                className="h-9 w-auto shrink-0 object-contain sm:h-11"
              />
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
                El PAM muestra los activos que tienen trabajos preventivos programados. Los libros y registros oficiales se gestionan en Registros.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {frequencyCards.map((card) => {
            const selected = selectedFrequency === card.key
            const count = frequencyAssets.get(card.key)?.length ?? 0

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
                  {count === 1 ? '1 activo' : `${count} activos`}
                </div>
              </button>
            )
          })}
        </section>

        {selectedFrequency && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">{selectedLabel}</div>
                <div className="text-xs text-slate-500">
                  {loading ? 'Cargando…' : `${selectedAssets.length} activos`}
                </div>
              </div>

              <IconButton icon={RefreshCw} label="Actualizar" onClick={() => void loadPAM()} />
            </div>

            <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {selectedAssets.map((asset) => (
                <div
                  key={asset.sourceId}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    ID PAM
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{asset.sourceId}</div>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Activo
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">{asset.code}</div>
                    <div className="mt-0.5 text-xs leading-5 text-slate-500">{asset.name}</div>
                  </div>
                </div>
              ))}

              {!loading && selectedAssets.length === 0 && (
                <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 border-dashed p-10 text-center text-sm text-slate-500">
                  No hay activos en esta frecuencia según el PAM importado.
                </div>
              )}
            </div>
          </section>
        )}

        {!selectedFrequency && !loading && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Selecciona una tarjeta para desplegar los activos que se atienden en esa frecuencia.
          </section>
        )}
      </div>
    </div>
  )
}
