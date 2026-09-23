import { useMemo, useState } from 'react'

type CalibrationRecord = {
  id: string
  code: string
  description: string
  location: string
  equipmentType: string
  manufacturer: string
  model: string
  serialNumber: string

  equipmentTemp: string
  referenceTemp: string

  lastCalibration: string
  periodicity: string

  patternEquipment: string
  certificateNumber: string

  observations: string

  active: boolean
}

const records: CalibrationRecord[] = [
  {
    id: '1',
    code: 'CAL-001',
    description: 'Termostato Cámara Frío',
    location: 'Cocina',
    equipmentType: 'Termostato',
    manufacturer: '',
    model: '',
    serialNumber: '',
    equipmentTemp: '4.2',
    referenceTemp: '4.0',
    lastCalibration: '2026-09-01',
    periodicity: 'Anual',
    patternEquipment: 'Fluke 62',
    certificateNumber: '',
    observations: '',
    active: true,
  },
]

export default function CalibrationsPage() {
  const [selected, setSelected] = useState(records[0])

  const deviation = useMemo(() => {
    const equipment = Number(selected.equipmentTemp)
    const reference = Number(selected.referenceTemp)

    if (isNaN(equipment) || isNaN(reference)) {
      return null
    }

    return Number((equipment - reference).toFixed(2))
  }, [selected])

  const status = useMemo(() => {
    if (deviation === null) {
      return {
        text: 'Sin verificar',
        color: 'bg-slate-500',
      }
    }

    const value = Math.abs(deviation)

    if (value <= 0.5) {
      return {
        text: 'Conforme',
        color: 'bg-green-600',
      }
    }

    if (value <= 1) {
      return {
        text: 'Revisar',
        color: 'bg-yellow-500',
      }
    }

    return {
      text: 'Fuera Tolerancia',
      color: 'bg-red-600',
    }
  }, [deviation])

  const nextCalibration = useMemo(() => {
    if (!selected.lastCalibration) return ''

    const date = new Date(selected.lastCalibration)

    switch (selected.periodicity) {
      case 'Trimestral':
        date.setMonth(date.getMonth() + 3)
        break

      case 'Semestral':
        date.setMonth(date.getMonth() + 6)
        break

      default:
        date.setFullYear(date.getFullYear() + 1)
    }

    return date.toISOString().split('T')[0]
  }, [selected])

  const daysRemaining = useMemo(() => {
    if (!nextCalibration) return null

    const today = new Date()
    const next = new Date(nextCalibration)

    return Math.ceil(
      (next.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  }, [nextCalibration])

  const daysColor =
    daysRemaining === null
      ? 'bg-slate-500'
      : daysRemaining < 0
      ? 'bg-red-600'
      : daysRemaining <= 30
      ? 'bg-yellow-500'
      : 'bg-green-600'

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-7xl p-4">

        <div className="mb-4">

          <h1 className="text-3xl font-bold">
            Calibraciones
          </h1>

          <p className="text-slate-600">
            Control de instrumentos y verificaciones
          </p>

        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">

          <div className="rounded-2xl bg-white p-4 shadow">

            <button
              className="
                mb-4
                w-full
                rounded-xl
                bg-blue-700
                p-3
                font-semibold
                text-white
              "
            >
              + Nuevo Instrumento
            </button>

            <div className="space-y-2">

              {records.map((record) => (

                <button
                  key={record.id}
                  onClick={() => setSelected(record)}
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
                      {record.code}
                    </div>

                    <div className="text-xs text-slate-500">
                      {record.description}
                    </div>

                  </div>

                  <div
                    className={`
                      h-3
                      w-3
                      rounded-full
                      ${status.color}
                    `}
                  />

                </button>

              ))}

            </div>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-6 flex flex-wrap gap-2">

              <button className="rounded-lg bg-blue-700 px-4 py-2 text-white">
                Nuevo
              </button>

              <button className="rounded-lg bg-green-600 px-4 py-2 text-white">
                Guardar
              </button>

              <button className="rounded-lg bg-amber-500 px-4 py-2 text-white">
                Modificar
              </button>

              <button className="rounded-lg bg-red-600 px-4 py-2 text-white">
                Eliminar
              </button>

            </div>

            <h2 className="mb-4 text-xl font-bold">
              Datos Generales
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <input
                className="rounded-lg border p-2"
                value={selected.code}
                readOnly
              />

              <input
                className="rounded-lg border p-2"
                value={selected.description}
                readOnly
              />

              <input
                className="rounded-lg border p-2"
                value={selected.location}
                readOnly
              />

              <input
                className="rounded-lg border p-2"
                value={selected.equipmentType}
                readOnly
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Fabricante"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Modelo"
              />

              <input
                className="rounded-lg border p-2"
                placeholder="Número Serie"
              />

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Verificación
            </h2>

            <div className="grid gap-4 md:grid-cols-3">

              <input
                className="rounded-lg border p-2"
                value={selected.equipmentTemp}
                readOnly
              />

              <input
                className="rounded-lg border p-2"
                value={selected.referenceTemp}
                readOnly
              />

              <input
                className={`
                  rounded-lg
                  border
                  p-2
                  font-bold
                  ${
                    deviation === null
                      ? ''
                      : Math.abs(deviation) <= 0.5
                      ? 'bg-green-100'
                      : Math.abs(deviation) <= 1
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                  }
                `}
                value={
                  deviation === null
                    ? ''
                    : `${deviation} °C`
                }
                readOnly
              />

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Estado
            </h2>

            <div
              className={`
                inline-flex
                rounded-xl
                px-4
                py-2
                font-semibold
                text-white
                ${status.color}
              `}
            >
              {status.text}
            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Calibración
            </h2>

            <div className="grid gap-4 md:grid-cols-4">

              <input
                type="date"
                value={selected.lastCalibration}
                readOnly
                className="rounded-lg border p-2"
              />

              <input
                type="date"
                value={nextCalibration}
                readOnly
                className="rounded-lg border p-2 bg-slate-50"
              />

              <input
                value={selected.periodicity}
                readOnly
                className="rounded-lg border p-2"
              />

              <div
                className={`
                  rounded-lg
                  p-2
                  text-center
                  font-semibold
                  text-white
                  ${daysColor}
                `}
              >
                {daysRemaining === null
                  ? '-'
                  : `${daysRemaining} días`}
              </div>

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Trazabilidad
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <input
                value={selected.patternEquipment}
                readOnly
                className="rounded-lg border p-2"
              />

              <input
                value={selected.certificateNumber}
                readOnly
                className="rounded-lg border p-2"
                placeholder="Nº Certificado"
              />

            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Fotografías
            </h2>

            <div className="flex flex-wrap gap-4">

              <button className="rounded-xl bg-slate-700 px-4 py-2 text-white">
                📷 Hacer foto
              </button>

              <button className="rounded-xl bg-blue-700 px-4 py-2 text-white">
                🖼 Seleccionar imagen
              </button>

            </div>

            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">
              Sin fotografías
            </div>

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Observaciones
            </h2>

            <textarea
              rows={5}
              className="w-full rounded-lg border p-3"
              value={selected.observations}
              readOnly
            />

            <hr className="my-6" />

            <h2 className="mb-4 text-xl font-bold">
              Histórico
            </h2>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              No existen calibraciones registradas.
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}