import { useNavigate } from 'react-router-dom'

const modules = [
  {
    icon: '🧯',
    name: 'Extintores',
    path: '/fireequipment/extinguishers',
  },
  {
    icon: '🚿',
    name: 'BIE',
    path: '/fireequipment/bie',
  },
  {
    icon: '💦',
    name: 'Rociadores',
    path: '/fireequipment/sprinklers',
  },
  {
    icon: '🚨',
    name: 'Revisión General PCI',
    path: '/fireequipment/pci-review',
  },
]

export default function FireEquipmentPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl p-6">

        <div className="mb-8">

          <h1 className="text-3xl font-bold">
            Equipos Contra Incendios
          </h1>

          <p className="mt-2 text-slate-600">
            Seleccione el módulo que desea gestionar
          </p>

        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {modules.map((module) => (
            <button
              key={module.name}
              onClick={() => navigate(module.path)}
              className="
                flex
                min-h-[180px]
                flex-col
                items-center
                justify-center
                gap-4
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-6
                shadow-sm
                transition-all
                hover:border-red-600
                hover:shadow-lg
              "
            >
              <span className="text-6xl">
                {module.icon}
              </span>

              <span className="text-lg font-semibold text-slate-700">
                {module.name}
              </span>
            </button>
          ))}

          <button
            onClick={() => navigate('/')}
            className="
              flex
              min-h-[180px]
              flex-col
              items-center
              justify-center
              gap-4
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-6
              shadow-sm
              transition-all
              hover:border-slate-600
              hover:shadow-lg
            "
          >
            <span className="text-6xl">
              ⬅️
            </span>

            <span className="text-lg font-semibold text-slate-700">
              Volver
            </span>
          </button>

        </div>

      </div>
    </div>
  )
}