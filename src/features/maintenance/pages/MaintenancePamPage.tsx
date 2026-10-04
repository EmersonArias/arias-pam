
import { CalendarDays, ChevronRight, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'

const pamPrograms = [
  ['Preventivo diario / semanal', 'Trabajo preventivo de frecuencia corta.'],
  ['Piscina exterior', 'Plan preventivo asociado al registro de piscina exterior.'],
  ['Piscina SPA', 'Plan preventivo asociado al registro de piscina SPA.'],
  ['Autocontrol Legionella', 'Plan preventivo y de control de instalaciones vinculadas.'],
  ['Bombas', 'Mantenimientos preventivos de equipos de bombeo.'],
  ['Climatizadores / Extractores', 'Mantenimientos preventivos de climatización y extracción.'],
  ['Fancoils', 'Mantenimientos preventivos de terminales fancoil.'],
  ['Cuadros eléctricos BT', 'Mantenimientos preventivos de cuadros y subcuadros BT.'],
  ['Elementos fotoluminiscentes', 'Revisiones preventivas de señalización fotoluminiscente.'],
  ['Luces de emergencia', 'Revisiones preventivas del alumbrado de emergencia.'],
  ['Puertas cortafuegos', 'Revisiones preventivas de puertas cortafuegos.'],
  ['Sistemas CI', 'Mantenimiento preventivo de sistemas contra incendios.'],
  ['Calibraciones', 'Planificación de calibraciones y revisiones de instrumentos.'],
] as const

export default function MaintenancePamPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
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

        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 shrink-0 text-slate-500" size={20} />
            <div>
              <h2 className="text-sm font-semibold sm:text-base">Programas preventivos</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Cada programa se relaciona con los equipos correspondientes y después genera su planificación y ejecución.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Programas PAM</div>
          <div className="divide-y divide-slate-100">
            {pamPrograms.map(([title, description]) => (
              <button
                key={title}
                type="button"
                onClick={() => navigate('/maintenance/configuration')}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <ClipboardList size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{title}</div>
                    <div className="mt-0.5 text-xs leading-5 text-slate-500">{description}</div>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
