export default function FireDoorsPage() {
  return (
    <div className="flex h-screen bg-slate-100">

      {/* LISTADO */}
      <div className="w-80 border-r bg-white">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">
            Puertas Cortafuegos
          </h2>
        </div>

        <div className="p-2">
          <button className="w-full rounded-lg bg-blue-600 p-2 text-white">
            + Nueva Puerta
          </button>
        </div>

        <div className="p-2">
          <div className="cursor-pointer rounded-lg border bg-white p-3 hover:bg-slate-50">
            <div className="font-semibold">
              PCF-001
            </div>

            <div className="text-sm text-slate-500">
              Escalera Planta 1
            </div>
          </div>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="flex-1 overflow-auto p-6">

        <div className="rounded-xl bg-white p-6 shadow">

          <h1 className="mb-6 text-2xl font-bold">
            Puerta Cortafuegos
          </h1>

          <div className="grid gap-4 md:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium">
                Código
              </label>

              <input
                className="w-full rounded-lg border p-2"
                defaultValue="PCF-001"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Ubicación
              </label>

              <input
                className="w-full rounded-lg border p-2"
                placeholder="Escalera Planta 1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Marca
              </label>

              <input
                className="w-full rounded-lg border p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Modelo
              </label>

              <input
                className="w-full rounded-lg border p-2"
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

            <div>
              <label className="mb-1 block text-sm font-medium">
                Última Revisión
              </label>

              <input
                type="date"
                className="w-full rounded-lg border p-2"
              />
            </div>

          </div>

          <hr className="my-6" />

          <h2 className="mb-4 text-lg font-semibold">
            Comprobaciones
          </h2>

          <div className="grid gap-3 md:grid-cols-2">

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Cierre automático correcto
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Bisagras correctas
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Retenedor correcto
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Sin golpes ni deformaciones
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Señalización visible
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Funcionamiento correcto
            </label>

          </div>

          <hr className="my-6" />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Observaciones
            </label>

            <textarea
              rows={5}
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium">
              Fotografía
            </label>

            <input
              type="file"
              accept="image/*"
              capture="environment"
            />
          </div>

        </div>

      </div>

    </div>
  )
}