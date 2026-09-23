import { useNavigate } from 'react-router-dom'
import logo from '../../assets/logo-arias-pam.png'

const registers = [
  {
    icon: '📅',
    name: 'Plan Anual de Mantenimiento',
    path: '/pam',
  },
  {
    icon: '🏨',
    name: 'Relación de Aparatos',
    path: '/apparatusregistry',
  },
  {
    icon: '🏊',
    name: 'Piscinas',
    path: '/pools',
  },
  {
    icon: '♨️',
    name: 'Spa',
    path: '/spa',
  },
  {
    icon: '🦠',
    name: 'Legionella',
    path: '/legionella',
  },
  {
    icon: '💧',
    name: 'Bombas',
    path: '/pumps',
  },
  {
    icon: '🌬️',
    name: 'Climatizadores',
    path: '/climatizers',
  },
  {
    icon: '❄️',
    name: 'Fancoils',
    path: '/fancoils',
  },
  {
    icon: '⚡',
    name: 'Cuadros BT',
    path: '/electricalpanels',
  },
  {
    icon: '💡',
    name: 'Elementos Fotoluminiscentes',
    path: '/photoluminescent',
  },
  {
    icon: '🔦',
    name: 'Luces Emergencia',
    path: '/emergencylights',
  },
  {
    icon: '🚪',
    name: 'Puertas Cortafuegos',
    path: '/firedoors',
  },
  {
    icon: '🧯',
    name: 'Equipos Contra Incendios',
    path: '/fireequipment',
  },
  {
    icon: '📏',
    name: 'Calibraciones',
    path: '/calibrations',
  },
]

export default function BooksPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-4">

        <div className="mb-6 flex justify-center">
          <img
            src={logo}
            alt="Arias PAM"
            className="h-24 w-auto object-contain"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">

          {registers.map((register) => (
            <button
              key={register.name}
              onClick={() => {
                if (register.path) {
                  navigate(register.path)
                }
              }}
              className="
                flex
                min-h-[150px]
                flex-col
                items-center
                justify-center
                gap-3
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
                transition-all
                hover:border-blue-700
                hover:shadow-lg
              "
            >
              <span className="text-5xl">
                {register.icon}
              </span>

              <span className="text-center text-sm font-semibold text-slate-700">
                {register.name}
              </span>
            </button>
          ))}

        </div>

      </div>
    </div>
  )
}