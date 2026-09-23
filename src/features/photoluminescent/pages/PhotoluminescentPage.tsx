import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface PhotoluminescentSign {
  id: string
  code: string
  location: string
  type: string
  manufacturer: string
  model: string
  installDate: string
  manufactureDate: string
  expiryDate: string
  visible: boolean
  readable: boolean
  clean: boolean
  illuminated: boolean
  fixedCorrectly: boolean
  observations: string
  active: boolean
}

const emptyRecord: PhotoluminescentSign = {
  id: '',
  code: '',
  location: '',
  type: '',
  manufacturer: '',
  model: '',
  installDate: '',
  manufactureDate: '',
  expiryDate: '',
  visible: true,
  readable: true,
  clean: true,
  illuminated: true,
  fixedCorrectly: true,
  observations: '',
  active: true,
}

export default function PhotoluminescentPage() {
  const navigate = useNavigate()

  const [records, setRecords] =
    useState<PhotoluminescentSign[]>([])

  const [selectedId, setSelectedId] =
    useState<string | null>(null)

  const [editing, setEditing] =
    useState(false)

  const [form, setForm] =
    useState<PhotoluminescentSign>(emptyRecord)

  const updateField = (
    field: keyof PhotoluminescentSign,
    value: string | boolean
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
  }

  const handleSave = () => {
    if (!form.code.trim()) return

    if (selectedId) {
      setRecords((current) =>
        current.map((item) =>
          item.id === selectedId
            ? form
            : item
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
  }

  const handleDelete = () => {
    if (!selectedId) return

    setRecords((current) =>
      current.filter(
        (item) => item.id !== selectedId
      )
    )

    setSelectedId(null)
    setForm(emptyRecord)
  }

  const selectRecord = (
    record: PhotoluminescentSign
  ) => {
    setSelectedId(record.id)
    setForm(record)
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
            onClick={() => setEditing(true)}
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
            onClick={() => navigate('/')}
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Volver
          </button>

        </div>

        <h1 className="mb-6 text-3xl font-bold">
          Elementos Fotoluminiscentes
        </h1>

        <div className="grid gap-4 lg:grid-cols-3">

          <div className="rounded-xl bg-white p-4">

            <h2 className="mb-4 text-lg font-semibold">
              Señales
            </h2>

            <div className="space-y-2">

              {records.map((record) => (
                <button
                  key={record.id}
                  onClick={() =>
                    selectRecord(record)
                  }
                  className="w-full rounded-lg border p-3 text-left"
                >
                  <div>{record.code}</div>

                  <div className="text-sm text-slate-500">
                    {record.location}
                  </div>
                </button>
              ))}

            </div>

          </div>

          <div className="lg:col-span-2 rounded-xl bg-white p-6">

            <div className="grid gap-4 md:grid-cols-2">

              <input
                placeholder="Código"
                value={form.code}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'code',
                    e.target.value
                  )
                }
                className="rounded-lg border p-2"
              />

              <select
                value={form.type}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'type',
                    e.target.value
                  )
                }
                className="rounded-lg border p-2"
              >
                <option value="">
                  Tipo
                </option>
                <option>
                  Salida Emergencia
                </option>
                <option>
                  Dirección Evacuación
                </option>
                <option>Extintor</option>
                <option>BIE</option>
                <option>Pulsador</option>
                <option>Rociador</option>
                <option>Escalera</option>
              </select>

              <input
                placeholder="Ubicación"
                value={form.location}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'location',
                    e.target.value
                  )
                }
                className="md:col-span-2 rounded-lg border p-2"
              />

              <input
                placeholder="Fabricante"
                value={form.manufacturer}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'manufacturer',
                    e.target.value
                  )
                }
                className="rounded-lg border p-2"
              />

              <input
                placeholder="Modelo"
                value={form.model}
                disabled={!editing}
                onChange={(e) =>
                  updateField(
                    'model',
                    e.target.value
                  )
                }
                className="rounded-lg border p-2"
              />

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}