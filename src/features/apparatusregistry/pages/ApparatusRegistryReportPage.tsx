import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import { supabase } from '../../../lib/supabase'
import {
  fromDatabase,
  type ApparatusRegistry,
  type DatabaseApparatusRegistry,
} from '../lib/apparatusRegistry'

function getParam(params: URLSearchParams, key: string, fallback = '') {
  return params.get(key) ?? fallback
}

export default function ApparatusRegistryReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  )

  const scope = getParam(params, 'scope', 'ALL') as 'SELECTED' | 'FILTERED' | 'ALL'
  const selectedId = getParam(params, 'selectedId')
  const search = getParam(params, 'search')
  const plant = getParam(params, 'plant', 'ALL')
  const active = getParam(params, 'active', 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE'

  const [records, setRecords] = useState<ApparatusRegistry[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadRecords() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('apparatus_registry')
        .select('*')
        .order('code', { ascending: true })

      if (error) {
        setErrorMessage(`Error cargando reporte: ${error.message}`)
        setLoading(false)
        return
      }

      setRecords(
        (data ?? []).map((row) =>
          fromDatabase(row as DatabaseApparatusRegistry),
        ),
      )
      setLoading(false)
    }

    void loadRecords()
  }, [])

  const reportRecords = useMemo(() => {
    let result = records

    if (scope === 'SELECTED' && selectedId) {
      result = result.filter((item) => item.id === selectedId)
    }

    if (scope === 'FILTERED') {
      const query = search.trim().toLocaleLowerCase('es')

      result = result.filter((item) => {
        if (query) {
          const haystack = [
            item.code,
            item.name,
            item.plant,
            item.location,
            item.maintenance,
            item.familyCode,
            item.subfamilyCode,
          ]
            .join(' ')
            .toLocaleLowerCase('es')

          if (!haystack.includes(query)) return false
        }

        if (plant !== 'ALL' && item.plant !== plant) return false
        if (active === 'ACTIVE' && !item.active) return false
        if (active === 'INACTIVE' && item.active) return false

        return true
      })
    }

    return result
  }, [records, scope, selectedId, search, plant, family, active])

  function printReport() {
    window.print()
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 print:max-w-none print:p-0">
        <div className="mb-5 flex items-start justify-between border-b pb-4 print:mb-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Arias Suite"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold">Relación de Aparatos</h1>
              <p className="text-sm text-slate-500">Vista previa del informe</p>
            </div>
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={printReport}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 font-semibold text-white shadow-sm hover:bg-slate-900"
            >
              <Printer size={17} />
              PDF
            </button>
            <BackButton onBack={() => navigate('/apparatusregistry')} />
            <HomeButton onHome={() => navigate('/')} />
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500">
            Preparando informe…
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mb-4 grid gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs uppercase text-slate-500">Ámbito</div>
                <div className="font-semibold">
                  {scope === 'SELECTED'
                    ? 'Registro seleccionado'
                    : scope === 'FILTERED'
                      ? 'Registros filtrados'
                      : 'Todos los registros'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs uppercase text-slate-500">Registros</div>
                <div className="font-semibold">{reportRecords.length}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs uppercase text-slate-500">Estado</div>
                <div className="font-semibold">
                  {active === 'ALL'
                    ? 'Todos'
                    : active === 'ACTIVE'
                      ? 'Activos'
                      : 'Inactivos'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-400 text-left">
                    <th className="px-2 py-2">Código</th>
                    <th className="px-2 py-2">Descripción</th>
                    <th className="px-2 py-2">Planta</th>
                    <th className="px-2 py-2">Ubicación</th>
                    <th className="px-2 py-2">Mantenimiento</th>
                                        <th className="px-2 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRecords.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="whitespace-nowrap px-2 py-2 font-semibold">
                        {item.code}
                      </td>
                      <td className="px-2 py-2">{item.name}</td>
                      <td className="px-2 py-2">{item.plant || '—'}</td>
                      <td className="px-2 py-2">{item.location || '—'}</td>
                      <td className="px-2 py-2">{item.maintenance || '—'}</td>
                                            <td className="px-2 py-2">{item.active ? 'Activo' : 'Inactivo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between border-t pt-3 text-xs text-slate-400">
              <span>Arias Suite</span>
              <span>{new Date().toLocaleDateString('es-ES')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
