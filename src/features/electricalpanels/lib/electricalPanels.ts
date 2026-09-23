export type PanelStatus = 'OPERATIVE' | 'NOT_OPERATIVE'

export type ReviewItem = {
  id: string
  name: string
  sourceName: string
  checked: boolean
}

export type ElectricalPanel = {
  id: string
  code: string
  name: string
  location: string
  manufacturer: string
  model: string
  installationDate: string
  inspectionDate: string
  technician: string
  status: PanelStatus
  observations: string
  reviews: ReviewItem[]
}

export type DatabasePanel = {
  id: string | number
  code: string
  name: string | null
  location: string | null
  manufacturer: string | null
  model: string | null
  installation_date: string | null
  inspection_date: string | null
  technician: string | null
  status: string | null
  observations: string | null
  reviews: unknown
}

export const CURRENT_TECHNICIAN = 'Emerson Arias'
export const CODE_PREFIX = 'CBT-'

export const REVIEW_ITEMS: Array<
  Pick<ReviewItem, 'id' | 'name' | 'sourceName'>
> = [
  {
    id: 'terminal-tightening',
    name: 'Apriete de tornillos y bornes',
    sourceName: 'Comprobar aprietes de tornillos y bornes',
  },
  {
    id: 'interior-cleaning',
    name: 'Limpieza general',
    sourceName: 'Limpieza general con aire a presión',
  },
  {
    id: 'wiring',
    name: 'Cables interiores',
    sourceName: 'Inspeccionar cables interiores',
  },
  {
    id: 'differentials',
    name: 'Mecanismos diferenciales',
    sourceName: 'Accionar pulsador de mecanismos diferenciales',
  },
  {
    id: 'contactors',
    name: 'Contactores',
    sourceName:
      'Comprobar accionamiento mecánico de contactores maniobras',
  },
  {
    id: 'grounding',
    name: 'Puesta a tierra',
    sourceName:
      'Verificar puesta a tierra del cuadro, medir resistencia de tierra (Meger)',
  },
  {
    id: 'insulation',
    name: 'Aislamiento y diferencial',
    sourceName:
      'Verificar aislamiento de cada salida y actuación del diferencial (Meger)',
  },
  {
    id: 'schematics',
    name: 'Esquemas eléctricos',
    sourceName: 'Verificar existencia de esquemas eléctricos',
  },
  {
    id: 'selectivity',
    name: 'Selectividad de circuitos',
    sourceName: 'Verificar selectividad de circuitos',
  },
  {
    id: 'general',
    name: 'Estado general del cuadro',
    sourceName: 'Estado general del cuadro (chasis)',
  },
]

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function todayInputValue(): string {
  const now = new Date()

  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate(),
  )}`
}

export function createEmptyReviews(): ReviewItem[] {
  return REVIEW_ITEMS.map((item) => ({
    ...item,
    checked: false,
  }))
}

export function createEmptyPanel(code = ''): ElectricalPanel {
  return {
    id: '',
    code,
    name: '',
    location: '',
    manufacturer: '',
    model: '',
    installationDate: todayInputValue(),
    inspectionDate: '',
    technician: CURRENT_TECHNICIAN,
    status: 'OPERATIVE',
    observations: '',
    reviews: createEmptyReviews(),
  }
}

export function clonePanel(panel: ElectricalPanel): ElectricalPanel {
  return {
    ...panel,
    reviews: panel.reviews.map((review) => ({ ...review })),
    technician: CURRENT_TECHNICIAN,
  }
}

export function normalizeStatus(value: string | null): PanelStatus {
  return value === 'NOT_OPERATIVE' ? 'NOT_OPERATIVE' : 'OPERATIVE'
}

function normalizeReviews(value: unknown): ReviewItem[] {
  if (!Array.isArray(value)) {
    return createEmptyReviews()
  }

  return REVIEW_ITEMS.map((template) => {
    const stored = value.find(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' &&
        item !== null &&
        (item as Record<string, unknown>).id === template.id,
    )

    return {
      ...template,
      checked:
        stored?.checked === true ||
        stored?.result === 'Correcto',
    }
  })
}

export function fromDatabase(row: DatabasePanel): ElectricalPanel {
  return {
    id: String(row.id),
    code: row.code ?? '',
    name: row.name ?? '',
    location: row.location ?? '',
    manufacturer: row.manufacturer ?? '',
    model: row.model ?? '',
    installationDate: row.installation_date ?? '',
    inspectionDate: row.inspection_date ?? '',
    technician: CURRENT_TECHNICIAN,
    status: normalizeStatus(row.status),
    observations: row.observations ?? '',
    reviews: normalizeReviews(row.reviews),
  }
}

export function statusLabel(status: PanelStatus): string {
  return status === 'OPERATIVE' ? 'Operativo' : 'No operativo'
}

export function statusClass(status: PanelStatus): string {
  return status === 'OPERATIVE'
    ? 'bg-green-600 text-white'
    : 'bg-red-600 text-white'
}

export function formatDate(value: string): string {
  if (!value) return ''

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${pad2(date.getDate())}/${pad2(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`
}

export function normalizeIdentity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function getNextLocalCodeFromCodes(codes: string[]): string {
  const highest = codes.reduce((max, code) => {
    const match = code
      .trim()
      .toUpperCase()
      .match(/^CBT-(\d+)$/)

    if (!match) {
      return max
    }

    const number = Number(match[1])

    return Number.isFinite(number)
      ? Math.max(max, number)
      : max
  }, 0)

  return `${CODE_PREFIX}${String(highest + 1).padStart(3, '0')}`
}

export function matchesDateFilter(
  value: string,
  from: string,
  to: string,
): boolean {
  if (from && (!value || value < from)) {
    return false
  }

  if (to && (!value || value > to)) {
    return false
  }

  return true
}
