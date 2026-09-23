import RegisterGrid from '../components/RegisterGrid'

const columns = [
  {
    key: 'code',
    title: 'Código',
  },
  {
    key: 'name',
    title: 'Denominación',
  },
  {
    key: 'floor',
    title: 'Planta',
  },
  {
    key: 'location',
    title: 'Ubicación',
  },
  {
    key: 'maintenance',
    title: 'Mantenimiento',
  },
]

const rows = [
  {
    id: '1',
    code: 'FC-1201',
    name: 'Fancoil Habitación 1201',
    floor: '12',
    location: 'Habitación 1201',
    maintenance: 'Interno',
  },
  {
    id: '2',
    code: 'ASC-A',
    name: 'Ascensor Clientes A',
    floor: 'PB',
    location: 'Núcleo Ascensores',
    maintenance: 'Externo',
  },
]

export default function AssetsPage() {
  return (
    <RegisterGrid
      title="Relación de Equipos"
      columns={columns}
      rows={rows}
    />
  )
}