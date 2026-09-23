import { useState } from 'react'

type Climatizer = {
  id: string
  name: string
  location: string
  model: string
  reference: string
  status: 'ok' | 'warning' | 'fault' | 'offline'
}

const climatizers: Climatizer[] = [
  {
    id: 'CL-0001',
    name: 'CL1',
    location: 'Planta 1',
    model: 'FM105',
    reference: 'F10192',
    status: 'ok',
  },
  {
    id: 'CL-0002',
    name: 'CL2',
    location: 'Planta 1',
    model: 'FM105',
    reference: 'F10185',
    status: 'ok',
  },
  {
    id: 'CL-0003',
    name: 'CL3',
    location: 'Planta 1',
    model: 'FM105',
    reference: 'F10183',
    status: 'warning',
  },
]

export default function ClimatizersPage() {
  const [selected, setSelected] = useState(climatizers[0])

  const statusColor = {
    ok: 'bg-green-500',
    warning: 'bg-yellow-500',
    fault: 'bg-red-500',
    offline: 'bg-slate-400',
  }

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-7xl p-4">

        <div className="mb-4">
          <h1 className="text-3xl font-bold">
            Climatizadores
          </h1>

          <p className="text-slate-600">
            Gestión de UTAs
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">

          <div className="rounded-2xl bg-white p-4 shadow">

            <button
              className="mb-4 w-full rounded-xl bg-blue-700 p-3 font-semibold text-white"
            >
              + Nuevo Climatizador
            </button>

            <div className="space-y-2">

              {climatizers.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-xl
                    border
                    border-slate-200
                    p-3
                    text-left
                    hover:bg-slate-50
                  "
                >
                  <div>
                    <div className="font-semibold">
                      {item.name}
                    </div>

                    <div className="text-xs text-slate-500">
                      {item.model}
                    </div>
                  </div>

                  <div
                    className={`
                      h-3
                      w-3
                      rounded-full
                      ${statusColor[item.status]}
                    `}
                  />
                </button>
              ))}

            </div>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Código
                </label>

                <input
                  className="w-full rounded-lg border p-2"
                  defaultValue={selected.id}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nombre
                </label>

                <input
                  className="w-full rounded-lg border p-2"
                  defaultValue={selected.name}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Ubicación
                </label>

                <input
                  className="w-full rounded-lg border p-2"
                  defaultValue={selected.location}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Modelo
                </label>

                <input
                  className="w-full rounded-lg border p-2"
                  defaultValue={selected.model}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Referencia Fabricante
                </label>

                <input
                  className="w-full rounded-lg border p-2"
                  defaultValue={selected.reference}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Fecha Instalación
                </label>

                <input
                  type="date"
                  className="w-full rounded-lg border p-2"
                />
              </div>

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Motor Admisión
            </h2>

            <div className="grid gap-4 md:grid-cols-4">

              <input
                className="rounded-lg border p-2"
                placeholder="Motor"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Potencia kW"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="RPM"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Intensidad"
              />

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Motor Impulsión
            </h2>

            <div className="grid gap-4 md:grid-cols-4">

              <input
                className="rounded-lg border p-2"
                placeholder="Motor"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Potencia kW"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="RPM"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Intensidad"
              />

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Correas
            </h2>

            <div className="grid gap-4 md:grid-cols-3">

              <input
                className="rounded-lg border p-2"
                placeholder="Correa Admisión"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Correa Impulsión"
              />

              <input
                type="date"
                className="rounded-lg border p-2"
              />

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Revisiones
            </h2>

            <div className="grid gap-4 md:grid-cols-3">

              <input
                type="date"
                className="rounded-lg border p-2"
              />

              <input
                type="date"
                className="rounded-lg border p-2"
              />

              <select
                className="rounded-lg border p-2"
              >
                <option>Mensual</option>
                <option>Trimestral</option>
                <option>Semestral</option>
                <option>Anual</option>
              </select>

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Accesibilidad
            </h2>

            <div className="flex gap-6">

              <label className="flex items-center gap-2">
                <input type="radio" name="access" />
                Accesible
              </label>

              <label className="flex items-center gap-2">
                <input type="radio" name="access" />
                No accesible
              </label>

            </div>

            <div className="mt-4">

              <textarea
                rows={3}
                className="w-full rounded-lg border p-2"
                placeholder="Motivo si no es accesible"
              />

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Fotografías
            </h2>

            <div className="flex gap-4">

              <button
                className="rounded-xl bg-slate-700 px-4 py-2 text-white"
              >
                📷 Hacer foto
              </button>

              <button
                className="rounded-xl bg-blue-700 px-4 py-2 text-white"
              >
                🖼 Seleccionar imagen
              </button>

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Observaciones
            </h2>

            <textarea
              rows={6}
              className="w-full rounded-lg border p-3"
              placeholder="Observaciones técnicas"
            />

          </div>

        </div>

      </div>

    </div>
  )
}