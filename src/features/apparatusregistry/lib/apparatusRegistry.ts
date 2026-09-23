export type ApparatusRegistry = {
  id: string
  code: string
  name: string
  plant: string
  location: string
  maintenance: string
  familyCode: string
  subfamilyCode: string
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
  family_code: string | null
  subfamily_code: string | null
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
    familyCode: row.family_code ?? '',
    subfamilyCode: row.subfamily_code ?? '',
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
    family_code: item.familyCode.trim() || null,
    subfamily_code: item.subfamilyCode.trim() || null,
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
    familyCode: '',
    subfamilyCode: '',
    active: true,
    sourceId: null,
    photos: [],
  }
}
