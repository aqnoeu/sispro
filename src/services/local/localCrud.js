import { addDoc, collection, deleteDoc, doc, setDoc, writeBatch } from './database.js'
import { getLocalServices, hasLocalDatabase } from './client.js'

export async function createCollectionDocument({
  collectionName,
  values,
  idField = null,
  additionalValues = {},
}) {
  if (!hasLocalDatabase()) {
    throw new Error('Serviço de dados indisponível no momento.')
  }

  const { db } = getLocalServices()

  if (!db) {
    throw new Error('Base de dados indisponível.')
  }

  const payload = removeEmptyValues({
    ...values,
    ...additionalValues,
  })

  if (idField && payload[idField]) {
    const documentId = String(payload[idField]).trim()
    await setDoc(doc(db, collectionName, documentId), payload, { merge: true })
    return documentId
  }

  const docRef = await addDoc(collection(db, collectionName), payload)
  return docRef.id
}

export async function createCollectionDocumentsBatch({
  collectionName,
  documents,
}) {
  if (!hasLocalDatabase()) {
    throw new Error('Serviço de dados indisponível no momento.')
  }

  const { db } = getLocalServices()

  if (!db) {
    throw new Error('Base de dados indisponível.')
  }

  if (!Array.isArray(documents) || !documents.length) {
    return []
  }

  const batch = writeBatch(db)
  const savedIds = []

  documents.forEach(({ values = {}, idField = null, additionalValues = {} }) => {
    const payload = removeEmptyValues({
      ...values,
      ...additionalValues,
    })

    if (idField && payload[idField]) {
      const documentId = String(payload[idField]).trim()
      batch.set(doc(db, collectionName, documentId), payload, { merge: true })
      savedIds.push(documentId)
      return
    }

    const collectionRef = collection(db, collectionName)
    const documentRef = doc(collectionRef)
    batch.set(documentRef, payload)
    savedIds.push(documentRef.id)
  })

  await batch.commit()
  return savedIds
}

export async function updateCollectionDocument({
  collectionName,
  documentId,
  values,
  additionalValues = {},
}) {
  if (!hasLocalDatabase()) {
    throw new Error('Serviço de dados indisponível no momento.')
  }

  const { db } = getLocalServices()

  if (!db) {
    throw new Error('Base de dados indisponível.')
  }

  if (!documentId) {
    throw new Error('Documento não informado para atualização.')
  }

  const payload = removeEmptyValues({
    ...values,
    ...additionalValues,
  })

  await setDoc(doc(db, collectionName, documentId), payload, { merge: true })
}

export async function deleteCollectionDocument({ collectionName, documentId }) {
  if (!hasLocalDatabase()) {
    throw new Error('Serviço de dados indisponível no momento.')
  }

  const { db } = getLocalServices()

  if (!db) {
    throw new Error('Base de dados indisponível.')
  }

  if (!documentId) {
    throw new Error('Documento não informado para exclusão.')
  }

  await deleteDoc(doc(db, collectionName, documentId))
}

function removeEmptyValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

// Stage cross-collection changes; one batch commit uses the authorized RPC and one revision.
export function createCollectionTransaction() {
  const {db}=getLocalServices()
  if(!db||!hasLocalDatabase())throw new Error('Base de dados indisponível.')
  const batch=writeBatch(db)
  const payload=({values={},additionalValues={}})=>removeEmptyValues({...values,...additionalValues})
  return {
    create(o){const ref=doc(collection(db,o.collectionName));batch.set(ref,payload(o));return ref.id},
    update(o){if(!o.documentId)throw new Error('Documento não informado.');batch.set(doc(db,o.collectionName,o.documentId),payload(o),{merge:true})},
    delete(o){if(!o.documentId)throw new Error('Documento não informado.');batch.delete(doc(db,o.collectionName,o.documentId))},
    commit(){return batch.commit()}
  }
}
