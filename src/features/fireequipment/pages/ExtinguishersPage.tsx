import { useNavigate } from 'react-router-dom'

export default function ExtinguishersPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-7xl">

        <div className="mb-4 flex gap-2">

          <button
            onClick={() => navigate('/fireequipment')}
            className="rounded-lg bg-slate-700 px-4 py-2 text-white"
          >
            Volver
          </button>

        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">

          <h1 className="text-3xl font-bold">
            Extintores
          </h1>

          <p className="mt-2 text-slate-600">
            Módulo en construcción
          </p>

        </div>

      </div>
    </div>
  )
}