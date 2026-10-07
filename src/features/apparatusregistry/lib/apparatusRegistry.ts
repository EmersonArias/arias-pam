export type ApparatusCriticality = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

export type ApparatusRegistry = {
  id: string
  code: string
  name: string
  plant: string
  location: string
  maintenance: string
  equipmentType: string
  systemName: string
  familyCode: string
  subfamilyCode: string
  manufacturer: string
  model: string
  serialNumber: string
  inventoryNumber: string
  installationDate: string
  criticality: ApparatusCriticality
  observations: string
  active: boolean
  sourceId: number | null
  photos: string[]
}

export type DatabaseApparatusRegistry = {
  id: string
  source_id: number | null
  code: string
  name: string
  plant: string | null
  location: string | null
  maintenance: string | null
  equipment_type: string | null
  system_name: string | null
  family_code: string | null
  subfamily_code: string | null
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  inventory_number: string | null
  installation_date: string | null
  criticality: ApparatusCriticality | null
  observations: string | null
  active: boolean
  photos?: unknown
  created_at: string
  updated_at: string
}

export function fromDatabase(
  row: DatabaseApparatusRegistry,
): ApparatusRegistry {
  const photos = Array.isArray(row.photos)
    ? row.photos.filter(
        (photo): photo is string => typeof photo === 'string',
      )
    : []

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    plant: row.plant ?? '',
    location: row.location ?? '',
    maintenance: row.maintenance ?? '',
    equipmentType: row.equipment_type ?? '',
    systemName: row.system_name ?? '',
    familyCode: row.family_code ?? '',
    subfamilyCode: row.subfamily_code ?? '',
    manufacturer: row.manufacturer ?? '',
    model: row.model ?? '',
    serialNumber: row.serial_number ?? '',
    inventoryNumber: row.inventory_number ?? '',
    installationDate: row.installation_date ?? '',
    criticality: row.criticality ?? 'NORMAL',
    observations: row.observations ?? '',
    active: row.active,
    sourceId: row.source_id,
    photos,
  }
}

export function toDatabase(
  item: ApparatusRegistry,
) {
  return {
    code: item.code.trim(),
    name: item.name.trim(),
    plant: item.plant.trim() || null,
    location: item.location.trim() || null,
    maintenance: item.maintenance.trim() || null,
    equipment_type: item.equipmentType.trim() || null,
    system_name: item.systemName.trim() || null,
    family_code: item.familyCode.trim() || null,
    subfamily_code: item.subfamilyCode.trim() || null,
    manufacturer: item.manufacturer.trim() || null,
    model: item.model.trim() || null,
    serial_number: item.serialNumber.trim() || null,
    inventory_number: item.inventoryNumber.trim() || null,
    installation_date: item.installationDate || null,
    criticality: item.criticality,
    observations: item.observations.trim() || null,
    active: item.active,
    photos: item.photos,
  }
}

export function createEmptyApparatus(): ApparatusRegistry {
  return {
    id: '',
    code: '',
    name: '',
    plant: '',
    location: '',
    maintenance: '',
    equipmentType: '',
    systemName: '',
    familyCode: '',
    subfamilyCode: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    inventoryNumber: '',
    installationDate: '',
    criticality: 'NORMAL',
    observations: '',
    active: true,
    sourceId: null,
    photos: [],
  }
}
