import { arrayUnion, doc, setDoc } from './database.js'
import { createCollectionDocument, deleteCollectionDocument, updateCollectionDocument } from './localCrud.js'
import { getLocalServices, hasLocalDatabase } from './client.js'

const collectionByTipo = {
  precedente: 'precedentes',
  parecer: 'pareceres_jurisprudencia',
  tese: 'teses_juridicas',
  referencia: 'referencias_juridicas',
}

const routeSegmentByTipo = {
  precedente: 'precedentes',
  parecer: 'pareceres',
  tese: 'teses',
  referencia: 'referencias',
}

const tipoByRouteSegment = {
  precedentes: 'precedente',
  pareceres: 'parecer',
  teses: 'tese',
  referencias: 'referencia',
}

export function resolveJurisprudenciaCollection(tipo) {
  return collectionByTipo[tipo] ?? ''
}

export function resolveJurisprudenciaRouteSegment(tipo) {
  return routeSegmentByTipo[tipo] ?? ''
}

export function resolveJurisprudenciaTipoFromRoute(segment) {
  return tipoByRouteSegment[segment] ?? ''
}

export async function createJurisprudenciaRecord({ tipo, values, currentUser }) {
  const collectionName = resolveJurisprudenciaCollection(tipo)

  if (!collectionName) {
    throw new Error('Tipo de registro inválido para jurisprudência.')
  }

  const createdAtTs = Date.now()
  const createdAt = new Date(createdAtTs).toISOString()

  return createCollectionDocument({
    collectionName,
    values,
    additionalValues: {
      tipo,
      setorId: currentUser?.sectorId ?? 'local',
      setorNome: currentUser?.sectorName ?? 'Procuradoria',
      createdBy: currentUser?.displayName ?? currentUser?.email ?? 'Usuário autenticado',
      createdByUid: currentUser?.uid ?? '',
      gabinete: currentUser?.workspace ?? currentUser?.sectorName ?? 'Gabinete não informado',
      createdAt,
      createdAtTs,
      visualizacoes: [],
    },
  })
}

export async function updateJurisprudenciaRecord({
  tipo,
  documentId,
  currentRecord,
  values,
  currentUser,
}) {
  const collectionName = resolveJurisprudenciaCollection(tipo)

  if (!collectionName) {
    throw new Error('Tipo de registro inválido para jurisprudência.')
  }

  const editedAtTs = Date.now()
  const editedAt = new Date(editedAtTs).toISOString()

  await updateCollectionDocument({
    collectionName,
    documentId,
    values,
    additionalValues: {
      wasEdited: true,
      editedAt,
      editedAtTs,
      editedBy: currentUser?.displayName ?? currentUser?.email ?? 'Usuário autenticado',
      editedByUid: currentUser?.uid ?? '',
      originalVersion: currentRecord?.originalVersion ?? extractOriginalVersion(currentRecord),
    },
  })
}

export async function deleteJurisprudenciaRecord({ tipo, documentId }) {
  const collectionName = resolveJurisprudenciaCollection(tipo)

  if (!collectionName) {
    throw new Error('Tipo de registro inválido para jurisprudência.')
  }

  await deleteCollectionDocument({
    collectionName,
    documentId,
  })
}

export async function registerJurisprudenciaView({ tipo, documentId, currentUser }) {
  if (!hasLocalDatabase()) {
    return
  }

  const collectionName = resolveJurisprudenciaCollection(tipo)
  const { db } = getLocalServices()

  if (!collectionName || !db || !documentId || !currentUser?.uid) {
    return
  }

  await setDoc(
    doc(db, collectionName, documentId),
    {
      visualizacoes: arrayUnion({
        uid: currentUser.uid,
        nome: currentUser.displayName ?? currentUser.email ?? 'Usuário autenticado',
      }),
    },
    { merge: true },
  )
}

export function canDeleteJurisprudenciaRecord(record, currentUser) {
  return Boolean(record?.createdByUid && currentUser?.uid && record.createdByUid === currentUser.uid)
}

function extractOriginalVersion(record = {}) {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => ![
      'documentId',
      'originalVersion',
      'wasEdited',
      'editedAt',
      'editedAtTs',
      'editedBy',
      'editedByUid',
      'visualizacoes',
    ].includes(key)),
  )
}
