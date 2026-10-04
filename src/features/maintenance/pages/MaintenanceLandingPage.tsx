export default function MaintenanceLandingPage() {
  const cards = [
    {
      title: 'Registros',
      description: 'Definición del mantenimiento, periodicidades y responsables.',
      href: '/maintenance/operation'
    },
    {
      title: 'Operación',
      description: 'Trabajo diario, OT automáticas y ejecución.',
      href: '/maintenance/operation'
    },
    {
      title: 'Auditoría',
      description: 'Evidencias, certificados y cumplimiento.',
      href: '/maintenance/operation'
    }
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mantenimiento</h1>
        <p className="text-sm opacity-70">Gestión integral del mantenimiento</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <a key={card.title} href={card.href} className="rounded-xl border p-5 block hover:shadow">
            <h2 className="text-xl font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm opacity-70">{card.description}</p>
            <div className="mt-4 font-medium">Entrar →</div>
          </a>
        ))}
      </div>

      <div className="rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Hoy</h2>
        <ul className="mt-3 space-y-2">
          <li>• Tareas pendientes</li>
          <li>• Tareas vencidas</li>
          <li>• Próxima visita externa</li>
          <li>• Próxima auditoría</li>
        </ul>
      </div>
    </div>
  )
}
