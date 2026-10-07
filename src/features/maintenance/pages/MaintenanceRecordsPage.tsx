
import { BookOpen, Camera, ChevronRight, FileText, Ruler, Waves } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'

const records = [
  ['Preventivo diario', 'Registro preventivo de frecuencia corta.', FileText, '/maintenance/record'],
  ['Piscina exterior', 'Registro de medidas y controles diarios.', Waves, '/pools'],
  ['Piscina SPA', 'Registro de medidas y controles del SPA.', Waves, '/spa'],
  ['Autocontrol Legionella', 'Registro de controles y seguimiento.', FileText, '/legionella'],
  ['Bombas', 'Registro de revisiones y actuaciones.', FileText, '/pumps'],
  ['Climatizadores / Extractores', 'Registro de revisiones de climatización y extracción.', FileText, '/climatizers'],
  ['Fancoils', 'Registro de revisiones de fancoils.', FileText, '/fancoils'],
  ['Cuadros eléctricos BT', 'Registro de revisiones y mediciones eléctricas.', Ruler, '/electricalpanels'],
  ['Elementos fotoluminiscentes', 'Registro de comprobaciones.', FileText, '/photoluminescent'],
  ['Luces de emergencia', 'Registro de comprobaciones y revisiones.', FileText, '/emergencylights'],
  ['Puertas cortafuegos', 'Registro de inspecciones.', FileText, '/firedoors'],
  ['PCI', 'Registro de inspecciones de protección contra incendios.', FileText, '/fireequipment'],
  ['Calibraciones', 'Registro de calibraciones realizadas.', Ruler, '/calibrations'],
] as const

export default function MaintenanceRecordsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div><h1 className="text-xl font-bold sm:text-2xl">Registros</h1><p className="text-xs text-slate-500 sm:text-sm">Libros y registros oficiales</p></div>
            </div>
            <div className="flex gap-2"><BackButton onBack={() => navigate('/maintenance/audit')} /><HomeButton onHome={() => navigate('/')} /></div>
          </div>
        </header>

        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 shrink-0 text-slate-500" size={20} />
            <div>
              <h2 className="text-sm font-semibold sm:text-base">Registros oficiales</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Entrada de datos desde el móvil o PC y generación posterior del registro imprimible.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map(([title, description, Icon, href]) => (
            <button
              key={title}
              type="button"
              onClick={() => navigate(href)}
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon size={20} /></div>
                <ChevronRight size={18} className="text-slate-300 transition group-hover:translate-x-0.5" />
              </div>
              <div className="mt-4 text-sm font-bold text-slate-800">{title}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><Camera size={13} /> Abrir registro</div>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
