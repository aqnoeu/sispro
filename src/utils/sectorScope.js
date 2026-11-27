export const DEFAULT_SECTOR_ID = 'local'
export const DEFAULT_SECTOR_NAME = 'Procuradoria'
export const DEFAULT_SECTOR_SIGLA = 'Procuradoria'
export const ADMIN_SECTOR_ID = 'pgm'
export const ADMIN_SECTOR_NAME = 'PGM'
export const ADMIN_SECTOR_SIGLA = 'PGM'

export function normalizeSectorId(value, fallback = DEFAULT_SECTOR_ID) {
  return String(value ?? '').trim().toLowerCase() || fallback
}

export function resolveSectorMetadata(record = {}, { isAdmin = false } = {}) {
  if (isAdmin) {
    return {
      sectorId: ADMIN_SECTOR_ID,
      sectorName: ADMIN_SECTOR_NAME,
      sectorSigla: ADMIN_SECTOR_SIGLA,
    }
  }

  return {
    sectorId: normalizeSectorId(record.setorId, DEFAULT_SECTOR_ID),
    sectorName: String(record.setorNome ?? '').trim() || DEFAULT_SECTOR_NAME,
    sectorSigla: String(record.setorSigla ?? '').trim() || DEFAULT_SECTOR_SIGLA,
  }
}

export function rowBelongsToSector(row, sectorId, { includeLegacyAmur = true } = {}) {
  const normalizedTarget = normalizeSectorId(sectorId, DEFAULT_SECTOR_ID)
  const rowSectorId = String(row?.setorId ?? '').trim().toLowerCase()

  if (!rowSectorId) {
    return includeLegacyAmur && normalizedTarget === DEFAULT_SECTOR_ID
  }

  return rowSectorId === normalizedTarget
}

export function buildSectorCode(rows = []) {
  const nextNumber = rows.reduce((highest, item) => {
    const match = String(item.id ?? '').match(/^SET-?(\d+)$/i)
    if (!match) {
      return highest
    }

    return Math.max(highest, Number(match[1]))
  }, 0) + 1

  return `SET-${String(nextNumber).padStart(3, '0')}`
}

export function slugifySectorName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
