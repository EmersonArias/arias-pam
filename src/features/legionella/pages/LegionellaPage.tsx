import { useState } from 'react'
import { ArrowLeft, Save, Plus, Trash2, Edit } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LegionellaPoint {
  id: string
  code: string
  activity: string
  location: string
  frequency: string
  unit: string
  minValue: string
  maxValue: string
  observations: string
  active: boolean
  photo?: string
}

const initialData: LegionellaPoint[] = [
  {
    id: '1',
    code: 'LEG-001',
    activity: 'Temperatura Entrada ACS',
    location: 'Sala ACS',
    frequency: 'Diaria',
    unit: '°C',
    minValue: '60',
    maxValue: '99',
    observations: '',
    active: true,
  },
  {
    id: '2',
    code: 'LEG-002',
    activity: 'Temperatura Acumulador 1 (-1)',
    location: 'Planta -1',
    frequency: 'Diaria',
    unit: '°C',
    minValue: '60',
    maxValue: '99',
    observations: '',
    active: true,
  },
  {
    id: '3',
    code: 'LEG-003',
    activity: 'Temperatura Retorno ACS',
    location: 'Sala ACS',
    frequency: 'Diaria',
    unit: '°C',
    minValue: '50',
    maxValue: '99',
    observations: '',
    active: true,
  },
  {
    id: '4',
    code: 'LEG-004',
    activity: 'Cloro Libre ACS',
    location: 'Red ACS',
    frequency: 'Semanal',
    unit: 'ppm',
    minValue: '0.1',
    maxValue: '1',
    observations: '',
    active: true,
  },
  {
    id: '5',
    code: 'LEG-005',
    activity: 'pH ACS',
    location: 'Red ACS',
    frequency: 'Semanal',
    unit: 'pH',
    minValue: '7.2',
    maxValue: '7.8',
    observations: '',
    active: true,
  },
]

export default function LegionellaPage() {
  const navigate = useNavigate()

  const [records, setRecords] =
    useState<LegionellaPoint[]>(initialData)

  const [selected, setSelected] =
    useState<LegionellaPoint>(initialData[0])

  const handleNew = () => {
    const newRecord: LegionellaPoint = {
      id: crypto.randomUUID(),
      code: '',
      activity: '',
      location: '',
      frequency: 'Diaria',
      unit: '',
      minValue: '',
      maxValue: '',
      observations: '',
      active: true,
    }

    setSelected(newRecord)
  }

  const handleSave = () => {
    const exists = records.find(
      (r) => r.id === selected.id
    )

    if (exists) {
      setRecords(
        records.map((r) =>
          r.id === selected.id ? selected : r
        )
      )
    } else {
      setRecords([...records, selected])
    }
  }

  const handleDelete = () => {
    setRecords(
      records.filter((r) => r.id !== selected.id)
    )

    if (records.length > 1) {
      setSelected(records[0])
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-7xl p-4">

        <div className="mb-4 flex flex-wrap gap-2">

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white"
          >
            <ArrowLeft size={18} />
            Volver
          </button>

          <button
            onClick={handleNew}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            <Plus size={18} />
            Nuevo
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white"
          >
            <Save size={18} />
            Guardar
          </button>

          <button
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white"
          >
            <Edit size={18} />
            Modificar
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white"
          >
            <Trash2 size={18} />
            Eliminar
          </button>

        </div>

        <div className="grid gap-4 lg:grid-cols-[350px_1fr]">

          <div className="rounded-xl bg-white p-4 shadow-sm">

            <h2 className="mb-4 text-lg font-bold">
              Puntos de Control
            </h2>

            <div className="space-y-2">

              {records.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`
                    w-full rounded-lg border p-3 text-left transition
                    ${
                      selected.id === item.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200'
                    }
                  `}
                >
                  <div className="font-semibold">
                    {item.code}
                  </div>

                  <div className="text-sm text-slate-600">
                    {item.activity}
                  </div>
                </button>
              ))}

            </div>

          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Ficha Legionella
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Código
                </label>

                <input
                  value={selected.code}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      code: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Frecuencia
                </label>

                <select
                  value={selected.frequency}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      frequency: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                >
                  <option>Diaria</option>
                  <option>Semanal</option>
                  <option>Mensual</option>
                  <option>Trimestral</option>
                  <option>Semestral</option>
                  <option>Anual</option>
                  <option>Variable</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Actividad
                </label>

                <input
                  value={selected.activity}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      activity: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Ubicación
                </label>

                <input
                  value={selected.location}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      location: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unidad
                </label>

                <input
                  value={selected.unit}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      unit: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div />

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Límite Mínimo
                </label>

                <input
                  value={selected.minValue}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      minValue: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Límite Máximo
                </label>

                <input
                  value={selected.maxValue}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      maxValue: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Observaciones
                </label>

                <textarea
                  rows={4}
                  value={selected.observations}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      observations: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium">
                  Fotografía
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="w-full rounded-lg border p-2"
                />

              </div>

              <div className="md:col-span-2">

                <label className="flex items-center gap-2">

                  <input
                    type="checkbox"
                    checked={selected.active}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        active: e.target.checked,
                      })
                    }
                  />

                  Activo

                </label>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}