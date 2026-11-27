import { rowBelongsToSector } from './sectorScope'

export function getStableOwnerId(user) {
  return String(
    user?.equipeId ??
    user?.profileCode ??
    user?.procuradorResponsavelId ??
    user?.uid ??
    '',
  ).trim()
}

export function buildUserAccessContext(user) {
  return {
    ownerId: getStableOwnerId(user),
    ownerUid: String(user?.uid ?? '').trim(),
    ownerName: String(user?.displayName ?? '').trim(),
    responsavel: String(user?.displayName ?? '').trim(),
    setorId: String(user?.sectorId ?? 'local').trim().toLowerCase(),
    setorNome: String(user?.sectorName ?? 'Procuradoria').trim(),
  }
}

export function canAccessOwnedRow(row, user) {
  if (!user) {
    return false
  }

  if (user.isAdmin) {
    return true
  }

  const normalizedOwnerId = String(row?.ownerId ?? '').trim()
  const normalizedOwnerUid = String(row?.ownerUid ?? '').trim()
  const normalizedOwnerName = normalizeText(row?.ownerName)
  const normalizedResponsavel = normalizeText(row?.responsavel)
  const normalizedWorkspace = normalizeText(row?.workspaceCompartilhado ?? row?.lotacao)
  const userWorkspace = normalizeText(user.workspace)
  const normalizedDisplayName = normalizeText(user.displayName)
  const identifiers = new Set(
    [
      user.uid,
      user.profileDocumentId,
      user.profileCode,
      user.equipeId,
      user.procuradorResponsavelId,
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  )

  if (normalizedOwnerId && identifiers.has(normalizedOwnerId)) {
    return true
  }

  if (normalizedOwnerUid && normalizedOwnerUid === String(user.uid ?? '').trim()) {
    return true
  }

  if (normalizedOwnerName && normalizedOwnerName === normalizedDisplayName) {
    return true
  }

  if (normalizedResponsavel && normalizedResponsavel === normalizedDisplayName) {
    return true
  }

  if (normalizedWorkspace && userWorkspace && normalizedWorkspace === userWorkspace) {
    return true
  }

  return rowBelongsToSector(row, user.sectorId, { includeLegacyAmur: false }) && !normalizedOwnerId
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
