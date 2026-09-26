import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useSystemDialog } from '../../../shared/components/dialogs/SystemDialogProvider'
import { useSystemDialog } from '../../../shared/components/dialogs/SystemDialogProvider'

interface PoolRecord {
  id: string
  date: string
  time: string
  temperature: string
  freeChlorine: string
  combinedChlorine: string
  totalChlorine: string
  ph: string
  transparency: string
  turbidity: string
  filteredWater: string
  filtersCleaned: string
  notes: string
  photo?: string
}

const emptyRecord: PoolRecord = {
  id: '',
  date: '',
  time: '',
  temperature: '',
  freeChlorine: '',
  combinedChlorine: '',
  totalChlorine: '',
  ph: '',
  transparency: '',
  turbidity: '',
  filteredWater: '',
  filtersCleaned: '',
  notes: '',
}

export default function SpaPage() {
  const navigate = useNavigate()
  const { confirm, alert: showAlert } = useSystemDialog()

  const [editing, setEditing] = useState(false)

  const [records, setRecords] = useState<PoolRecord[]>([])

  const [selectedId, setSelectedId] =
    useState<string | null>(null)

  const [form, setForm] =
    useState<PoolRecord>(emptyRecord)

  const dateRef =
    useRef<HTMLInputElement>(null)

  const selectRecord = (
    record: PoolRecord
  ) => {
    setSelectedId(record.id)
    setForm({ ...record })
    setEditing(false)
  }

  const updateField = (
    field: keyof PoolRecord,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleNew = () => {
    setSelectedId(null)
    setForm(emptyRecord)
    setEditing(true)

    setTimeout(() => {
      dateRef.current?.focus()
    }, 50)
  }

  const handleEdit = () => {
    if (!selectedId) return

    setEditing(true)

    setTimeout(() => {
      dateRef.current?.focus()
    }, 50)
  }

  const handleSave = async () => {
    if (!form.date) {
      await showAlert({
        title: 'Fecha obligatoria',
        message: 'Debe indicar una fecha para guardar el registro.',
        variant: 'warning',
      })
      return
    }

    if (selectedId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === selectedId
            ? { ...form }
            : record
        )
      )
    } else {
      const newRecord = {
        ...form,
        id: crypto.randomUUID(),
      }

      setRecords((current) => [
        ...current,
        newRecord,
      ])

      setSelectedId(newRecord.id)
    }

    setEditing(false)

    if (
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur()
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return

    const confirmed = await confirm({
      title: 'Eliminar registro',
      message: '¿Quieres eliminar este registro? Esta acción no se puede deshacer.',
      variant: 'warning',
      confirmLabel: 'Eliminar',
    })
    if (!confirmed) return

    setRecords((current) =>
      current.filter(
        (record) =>
          record.id !== selectedId
      )
    )

    setSelectedId(null)
    setForm(emptyRecord)
    setEditing(false)
  }

  const handleCancel = () => {
    if (selectedId) {
      const record = records.find(
        (r) => r.id === selectedId
      )

      if (record) {
        setForm({ ...record })
      }
    } else {
      setForm(emptyRecord)
    }

    setEditing(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-7xl">

        <div className="mb-4 flex flex-wrap gap-2">

          <button
            onClick={handleNew}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Nuevo
          </button>

          <button
            onClick={handleSave}
            className="rounded-lg bg-green-600 px-4 py-2 text-white"
          >
            Guardar
          </button>

          <button
            onClick={handleEdit}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white"
          >
            Modificar
          </button>

          <button
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-white"
          >
            Eliminar
          </button>

          <button
            onClick={handleCancel}
            className="rounded-lg bg-slate-500 px-4 py-2 text-white"
          >
            Cancelar
          </button>

          <button
            className="rounded-lg bg-cyan-600 px-4 py-2 text-white"
          >
            Actualizar
          </button>

          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Salir
          </button>

        </div>

        <h1 className="mb-6 text-3xl font-bold">
          Libro de Spa
        </h1>

        <div className="grid gap-4 lg:grid-cols-3">

          <div className="rounded-xl border bg-white p-4">

            <h2 className="mb-4 text-lg font-semibold">
              Registros
            </h2>

            <div className="space-y-2">

              {records.map((record) => (
                <button
                  key={record.id}
                  onClick={() =>
                    selectRecord(record)
                  }
                  disabled={editing}
                  className={`w-full rounded-lg border p-3 text-left ${
                    selectedId === record.id
                      ? 'border-blue-600 bg-blue-50'
                      : ''
                  }`}
                >
                  {record.date} {record.time}
                </button>
              ))}

            </div>

          </div>

          <div className="lg:col-span-2 rounded-xl border bg-white p-6">

            <div className="grid gap-4 md:grid-cols-2">

              <input
                ref={dateRef}
                type="date"
                value={form.date}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'date',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                type="time"
                value={form.time}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'time',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Temperatura"
                value={form.temperature}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'temperature',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Cloro Libre"
                value={form.freeChlorine}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'freeChlorine',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Cloro Combinado"
                value={form.combinedChlorine}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'combinedChlorine',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Cloro Total"
                value={form.totalChlorine}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'totalChlorine',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="pH"
                value={form.ph}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'ph',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Transparencia"
                value={form.transparency}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'transparency',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Turbidez"
                value={form.turbidity}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'turbidity',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Agua Depurada"
                value={form.filteredWater}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'filteredWater',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

              <input
                placeholder="Limpieza Filtros"
                value={form.filtersCleaned}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'filtersCleaned',
                    e.target.value
                  )
                }
                className={`rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

            </div>

            <div className="mt-4">

              <textarea
                rows={4}
                placeholder="Observaciones"
                value={form.notes}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'notes',
                    e.target.value
                  )
                }
                className={`w-full rounded-lg border p-2 ${
                  editing
                    ? 'bg-white'
                    : 'bg-slate-100'
                }`}
              />

            </div>

            <div className="mt-4">

              <label className="mb-2 block font-medium">
                Fotografía
              </label>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={!editing}
              />

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}