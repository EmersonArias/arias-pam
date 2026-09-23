import RegisterGrid from '../components/RegisterGrid'

const columns = [
  { key: 'equipment', title: 'Equipo' },
  { key: 'jan', title: 'Ene' },
  { key: 'feb', title: 'Feb' },
  { key: 'mar', title: 'Mar' },
  { key: 'apr', title: 'Abr' },
]

const rows = [
  {
    id: '1',
    equipment: 'FC-1201',
    jan: '✔',
    feb: '',
    mar: '✔',
    apr: '',
  },
]

export default function PamPage() {
  return (
    <RegisterGrid
      title="Plan Anual de Mantenimiento"
      columns={columns}
      rows={rows}
    />
  )
}