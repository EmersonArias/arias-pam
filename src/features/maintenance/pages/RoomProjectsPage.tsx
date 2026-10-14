import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Download, Home, Settings2, X, CheckCircle2, Clock3, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import { useHotelScope } from '../../../shared/context/HotelScopeContext'

type RoomStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'
type RoomRecord = {
  status: RoomStatus
  completedAt: string
  technician: string
  notes: string
}
type RoomDraft = RoomRecord

const FLOOR_ROOM_LIMITS: Array<{ floor: number; maxRoom: number }> = [
  { floor: 2, maxRoom: 17 },
  ...Array.from({ length: 11 }, (_, index) => ({ floor: index + 3, maxRoom: 23 })),
  { floor: 14, maxRoom: 12 },
  { floor: 15, maxRoom: 2 },
]
const DEFAULT_ROOM_CODES = FLOOR_ROOM_LIMITS.flatMap(({ floor, maxRoom }) =>
  Array.from({ length: maxRoom }, (_, index) => roomCode(floor, index + 1)),
)
const STATUS_LABELS: Record<RoomStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Terminada',
}
const STATUS_CLASSES: Record<RoomStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
  IN_PROGRESS: 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100',
  DONE: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
}
const STATUS_COLORS: Record<RoomStatus, { fill: string; stroke: string; text: string }> = {
  PENDING: { fill: '#FEF3C7', stroke: '#F59E0B', text: '#92400E' },
  IN_PROGRESS: { fill: '#DBEAFE', stroke: '#60A5FA', text: '#1D4ED8' },
  DONE: { fill: '#D1FAE5', stroke: '#34D399', text: '#065F46' },
}

function roomCode(floor: number, roomNumber: number) {
  return `${floor}-${String(roomNumber).padStart(2, '0')}`
}

function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function defaultRecord(): RoomRecord {
  return { status: 'PENDING', completedAt: '', technician: '', notes: '' }
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export default function RoomProjectsPage() {
  const navigate = useNavigate()
  const { hotel } = useHotelScope()
  const hotelKey = hotel?.id ?? 'hotel-no-seleccionado'
  const storageKey = `arias-suite:room-led-tracker:v1:${hotelKey}`
  const [records, setRecords] = useState<Record<string, RoomRecord>>({})
  const [activeRooms, setActiveRooms] = useState<string[]>(DEFAULT_ROOM_CODES)
  const [loadedKey, setLoadedKey] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [draft, setDraft] = useState<RoomDraft>(defaultRecord())
  const [filter, setFilter] = useState<'ALL' | RoomStatus>('ALL')
  const [configuring, setConfiguring] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setRecords(safeRead<Record<string, RoomRecord>>(`${storageKey}:records`, {}))
    setActiveRooms(safeRead<string[]>(`${storageKey}:rooms`, DEFAULT_ROOM_CODES))
    setSelectedRoom(null)
    setLoadedKey(storageKey)
  }, [storageKey])

  useEffect(() => {
    if (loadedKey !== storageKey) return
    try {
      localStorage.setItem(`${storageKey}:records`, JSON.stringify(records))
      localStorage.setItem(`${storageKey}:rooms`, JSON.stringify(activeRooms))
    } catch {
      setNotice('El navegador no ha podido guardar los datos localmente. Comprueba el espacio disponible.')
    }
  }, [activeRooms, loadedKey, records, storageKey])

  const roomsByFloor = useMemo(
    () => FLOOR_ROOM_LIMITS.map(({ floor, maxRoom }) => ({
      floor,
      rooms: Array.from({ length: maxRoom }, (_, index) => roomCode(floor, index + 1))
        .filter((code) => activeRooms.includes(code))
        .filter((code) => {
          if (configuring || filter === 'ALL') return true
          return (records[code]?.status ?? 'PENDING') === filter
        }),
      configurableRooms: Array.from({ length: maxRoom }, (_, index) => roomCode(floor, index + 1)),
    })).filter((row) => configuring || row.rooms.length > 0),
    [activeRooms, configuring, filter, records],
  )

  const totals = useMemo(() => {
    const all = activeRooms
    const done = all.filter((code) => (records[code]?.status ?? 'PENDING') === 'DONE').length
    const inProgress = all.filter((code) => (records[code]?.status ?? 'PENDING') === 'IN_PROGRESS').length
    return { total: all.length, done, inProgress, pending: all.length - done - inProgress }
  }, [activeRooms, records])

  const selectedRecord = selectedRoom ? records[selectedRoom] ?? defaultRecord() : null

  useEffect(() => {
    if (selectedRoom) setDraft({ ...(records[selectedRoom] ?? defaultRecord()) })
  }, [records, selectedRoom])

  function toggleRoom(code: string) {
    setActiveRooms((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  function saveRoom() {
    if (!selectedRoom) return
    const completedAt = draft.status === 'DONE' ? (draft.completedAt || localDate()) : ''
    setRecords((current) => ({
      ...current,
      [selectedRoom]: { ...draft, completedAt },
    }))
    setSelectedRoom(null)
    setNotice(`Habitación ${selectedRoom} guardada en este dispositivo.`)
  }

  function exportBuildingImage() {
    const rows = FLOOR_ROOM_LIMITS.map(({ floor, maxRoom }) => ({
      floor,
      rooms: Array.from({ length: maxRoom }, (_, index) => roomCode(floor, index + 1))
        .filter((code) => activeRooms.includes(code)),
    })).filter((row) => row.rooms.length > 0)
    if (!rows.length) {
      setNotice('No hay habitaciones configuradas para exportar.')
      return
    }

    const maxRooms = Math.max(...rows.map((row) => row.rooms.length))
    const padding = 34
    const labelWidth = 142
    const cellWidth = 43
    const cellHeight = 34
    const rowHeight = 43
    const headerHeight = 160
    const width = padding * 2 + labelWidth + maxRooms * cellWidth
    const height = headerHeight + rows.length * rowHeight + 74
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    const context = canvas.getContext('2d')
    if (!context) {
      setNotice('No se ha podido generar la imagen en este navegador.')
      return
    }
    context.scale(scale, scale)
    context.fillStyle = '#F8FAFC'
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#0F172A'
    context.font = '700 25px Arial, sans-serif'
    context.fillText('SUSTITUCIÓN LED DE ARMARIOS', padding, 42)
    context.fillStyle = '#475569'
    context.font = '14px Arial, sans-serif'
    context.fillText(hotel?.name ? `Hotel: ${hotel.name}` : 'Seguimiento de habitaciones', padding, 67)
    context.fillText(`Actualizado: ${new Date().toLocaleDateString('es-ES')}`, padding, 89)
    context.font = 'bold 13px Arial, sans-serif'
    context.fillStyle = '#065F46'
    context.fillText(`Terminadas: ${totals.done}`, padding, 119)
    context.fillStyle = '#92400E'
    context.fillText(`Pendientes: ${totals.pending}`, padding + 145, 119)
    context.fillStyle = '#1D4ED8'
    context.fillText(`En curso: ${totals.inProgress}`, padding + 280, 119)

    const legendY = 143
    const legend = [
      { label: 'Terminada', status: 'DONE' as RoomStatus, x: padding },
      { label: 'Pendiente', status: 'PENDING' as RoomStatus, x: padding + 126 },
      { label: 'En curso', status: 'IN_PROGRESS' as RoomStatus, x: padding + 252 },
    ]
    context.font = '11px Arial, sans-serif'
    legend.forEach((item) => {
      context.fillStyle = STATUS_COLORS[item.status].fill
      context.strokeStyle = STATUS_COLORS[item.status].stroke
      context.lineWidth = 1
      context.fillRect(item.x, legendY - 10, 13, 13)
      context.strokeRect(item.x, legendY - 10, 13, 13)
      context.fillStyle = '#334155'
      context.fillText(item.label, item.x + 19, legendY)
    })

    const startY = headerHeight
    rows.forEach((row, rowIndex) => {
      const y = startY + rowIndex * rowHeight
      context.fillStyle = '#E2E8F0'
      context.fillRect(padding, y, labelWidth - 10, cellHeight)
      context.fillStyle = '#1E293B'
      context.font = 'bold 12px Arial, sans-serif'
      context.textBaseline = 'middle'
      context.fillText(`PLANTA ${row.floor}`, padding + 8, y + cellHeight / 2)
      row.rooms.forEach((code, roomIndex) => {
        const status = records[code]?.status ?? 'PENDING'
        const colors = STATUS_COLORS[status]
        const x = padding + labelWidth + roomIndex * cellWidth
        context.fillStyle = colors.fill
        context.strokeStyle = colors.stroke
        context.lineWidth = 1
        context.fillRect(x, y, cellWidth - 4, cellHeight)
        context.strokeRect(x, y, cellWidth - 4, cellHeight)
        context.fillStyle = colors.text
        context.font = 'bold 10px Arial, sans-serif'
        context.textAlign = 'center'
        context.fillText(code.split('-')[1], x + (cellWidth - 4) / 2, y + cellHeight / 2)
        context.textAlign = 'left'
      })
    })
    context.textBaseline = 'alphabetic'
    context.fillStyle = '#64748B'
    context.font = '11px Arial, sans-serif'
    context.fillText('Arias Suite · Control de trabajos por habitación', padding, height - 22)

    canvas.toBlob((blob) => {
      if (!blob) {
        setNotice('No se ha podido crear la imagen. Inténtalo de nuevo.')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sustitucion-led-armarios-${localDate()}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setNotice('Imagen del edificio descargada.')
    }, 'image/png')
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">Trabajos por habitaciones</h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Sustitución de fluorescentes por tiras LED en armarios</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackButton onBack={() => navigate('/maintenance')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
          </div>
        </header>

        <main className="space-y-3">
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 sm:p-4">
            <div className="flex items-start gap-2">
              <Wrench className="mt-0.5 shrink-0" size={19} />
              <div>
                <p className="font-semibold">Modo de pruebas sin coste</p>
                <p className="mt-1 text-xs leading-5 text-blue-900 sm:text-sm">
                  Este módulo guarda los estados y observaciones solo en el almacenamiento local de este navegador. No escribe en las tablas de mantenimiento de Supabase y no sincroniza los datos entre dispositivos. Puedes descargar la imagen para compartir el avance con recepción.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Habitaciones configuradas" value={totals.total} icon={<Home size={19} />} />
            <SummaryCard label="Terminadas" value={totals.done} icon={<CheckCircle2 size={19} />} color="green" />
            <SummaryCard label="Pendientes" value={totals.pending} icon={<Clock3 size={19} />} color="amber" />
            <SummaryCard label="En curso" value={totals.inProgress} icon={<Wrench size={19} />} color="blue" />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Edificio completo</h2>
                <p className="mt-1 text-xs text-slate-500">Pulsa una habitación para abrir su ficha. Todas las plantas con habitaciones aparecen en la misma vista.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setConfiguring((value) => !value); setFilter('ALL') }} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${configuring ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  <Settings2 size={17} /> {configuring ? 'Terminar configuración' : 'Configurar habitaciones'}
                </button>
                <button type="button" onClick={exportBuildingImage} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  <Download size={17} /> Descargar imagen
                </button>
              </div>
            </div>

            {!configuring && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar habitaciones">
                {([
                  ['ALL', 'Todas'],
                  ['PENDING', 'Pendientes'],
                  ['IN_PROGRESS', 'En curso'],
                  ['DONE', 'Terminadas'],
                ] as Array<[typeof filter, string]>).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {configuring && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Configuración del inventario: pulsa una celda para incluirla o retirarla del edificio. Planta 2 queda limitada a las habitaciones 01–17 y planta 15 a 15-01 y 15-02, según tus indicaciones. En las demás plantas se parte de la cuadrícula del documento y puedes corregir las habitaciones que no existan.
              </p>
            )}

            <div className="mt-4 overflow-x-auto pb-2">
              <div className="min-w-[930px] space-y-1.5">
                {roomsByFloor.map((row) => (
                  <div key={row.floor} className="flex items-center gap-2">
                    <div className="w-[104px] shrink-0 rounded-lg bg-slate-100 px-2 py-2 text-xs font-bold text-slate-700">PLANTA {row.floor}</div>
                    <div className="flex min-w-0 flex-1 gap-1">
                      {(configuring ? row.configurableRooms : row.rooms).map((code) => {
                        const isActive = activeRooms.includes(code)
                        const record = records[code] ?? defaultRecord()
                        if (configuring) {
                          return (
                            <button key={code} type="button" onClick={() => toggleRoom(code)} aria-label={`${isActive ? 'Retirar' : 'Incluir'} habitación ${code}`} aria-pressed={isActive} className={`h-9 min-w-8 flex-1 rounded-md border text-[11px] font-semibold transition ${isActive ? 'border-slate-300 bg-slate-700 text-white hover:bg-rose-700' : 'border-dashed border-slate-300 bg-white text-slate-300 hover:border-emerald-400 hover:text-emerald-700'}`}>
                              {code.split('-')[1]}
                            </button>
                          )
                        }
                        return (
                          <button key={code} type="button" onClick={() => { setSelectedRoom(code); setNotice('') }} title={`${code} · ${STATUS_LABELS[record.status]}`} aria-label={`Habitación ${code}: ${STATUS_LABELS[record.status]}`} className={`h-9 min-w-8 flex-1 rounded-md border text-[11px] font-bold transition focus:outline-none focus:ring-2 focus:ring-slate-500 ${STATUS_CLASSES[record.status]}`}>
                            {code.split('-')[1]}
                          </button>
                        )
                      })}
                      {!configuring && row.rooms.length === 0 && <span className="py-2 text-xs text-slate-400">Sin habitaciones configuradas</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <Legend color="bg-emerald-100 border-emerald-300" label="Terminada" />
              <Legend color="bg-amber-100 border-amber-300" label="Pendiente" />
              <Legend color="bg-blue-100 border-blue-300" label="En curso" />
              {configuring && <span className="text-slate-500">En configuración: toca una celda para incluir/retirar la habitación.</span>}
            </div>
            {notice && <p role="status" className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{notice}</p>}
          </section>
        </main>
      </div>

      {selectedRoom && selectedRecord && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRoom(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="room-detail-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ficha de habitación</p>
                <h2 id="room-detail-title" className="mt-1 text-xl font-bold text-slate-900">Habitación {selectedRoom}</h2>
                <p className="mt-1 text-sm text-slate-500">Sustitución de fluorescentes por tiras LED de armario</p>
              </div>
              <button type="button" onClick={() => setSelectedRoom(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar ficha"><X size={20} /></button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Estado del trabajo</span>
                <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as RoomStatus }))} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En curso</option>
                  <option value="DONE">Terminada</option>
                </select>
              </label>
              {draft.status === 'DONE' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha de sustitución</span>
                  <input type="date" value={draft.completedAt || localDate()} onChange={(event) => setDraft((current) => ({ ...current, completedAt: event.target.value }))} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Realizado por</span>
                <input value={draft.technician} onChange={(event) => setDraft((current) => ({ ...current, technician: event.target.value }))} placeholder="Nombre del técnico (opcional)" className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Observaciones</span>
                <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Material, incidencias o detalles del trabajo..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSelectedRoom(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={saveRoom} className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Guardar habitación</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon, color = 'slate' }: { label: string; value: number; icon: ReactNode; color?: 'slate' | 'green' | 'amber' | 'blue' }) {
  const styles = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className={`rounded-xl p-2 ${styles[color]}`}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded-sm border ${color}`} />
      <span>{label}</span>
    </span>
  )
}
