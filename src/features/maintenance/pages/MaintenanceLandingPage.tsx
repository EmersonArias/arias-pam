
import { Building2, FileCheck2, ListChecks, Settings2, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'

type Card = {
  title: string
  description: string
  icon: typeof Building2
  href: string
}

const cards: Card[] = [
  {
    title: 'Equipos e instalaciones',
    description: 'Catálogo maestro de equipos, instalaciones, familias y subfamilias.',
    icon: Building2,
    href: '/apparatusregistry',
  },
  {
    title: 'PAM',
    description: 'Plan Anual de Mantenimiento preventivo del hotel.',
    icon: ListChecks,
    href: '/maintenance/pam',
  },
  {
    title: 'Operación',
    description: 'Trabajo diario, tareas, OT y ejecución de mantenimientos.',
    icon: Wrench,
    href: '/maintenance/operation',
  },
  {
    title: 'Auditoría',
    description: 'Evidencias, certificados, históricos y documentos para auditorías.',
    icon: FileCheck2,
    href: '/maintenance/audit',
  },
  {
    title: 'Configuración',
    description: 'Automatización de OT, asignación, avisos y reglas por hotel.',
    icon: Settings2,
    href: '/maintenance/configuration',
  },
]

export default function MaintenanceLandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo onActivate={() => navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">Mantenimiento</h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Gestión integral del mantenimiento del hotel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackButton onBack={() => navigate('/')} />
              <HomeButton onHome={() => navigate('/')} />
            </div>
          </div>
        </header>

        <main>
          <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-semibold text-slate-800 sm:text-base">Centro de mantenimiento</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Equipos, planificación preventiva, registros oficiales, operación y auditoría.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => navigate(card.href)}
                  className="group min-h-[170px] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg active:translate-y-0 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <Icon size={22} />
                    </div>
                    <span className="text-slate-300 transition group-hover:translate-x-0.5">→</span>
                  </div>
                  <div className="mt-4 text-base font-bold text-slate-900">{card.title}</div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:text-sm">{card.description}</p>
                  <div className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Entrar</div>
                </button>
              )
            })}
          </section>
        </main>
      </div>
    </div>
  )
}
