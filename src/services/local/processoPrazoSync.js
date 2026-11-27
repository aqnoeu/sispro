import { addDoc, collection, doc, getDocs, limit, or, query, setDoc, where, writeBatch } from './database.js'
import { getLocalServices, hasLocalDatabase } from './client.js'

export async function createPrazoWithProcessSync({ prazoValues, context }) {
  ensureLocalAvailable()
  const { db } = getLocalServices()
  const normalizedPrazo = normalizePrazoPayload(prazoValues, context)
  const processoSnapshot = await findProcessoByNumero(db, normalizedPrazo.processo)
  const existingProcesso = processoSnapshot?.docs[0]
  const nextPrazoEntry = buildPrazoEntry(normalizedPrazo)

  if (existingProcesso) {
    const processoData = existingProcesso.data()
    const currentPrazos = Array.isArray(processoData.prazos) ? processoData.prazos : []
    const currentHistorico = Array.isArray(processoData.historico) ? processoData.historico : []

    await setDoc(
      doc(db, 'processos', existingProcesso.id),
      removeEmptyValues({
        prazos: [...currentPrazos, nextPrazoEntry],
        historico: [
          ...currentHistorico,
          buildHistoricoEntry(normalizedPrazo, `Novo prazo registrado para o processo em ${formatDisplayDate(normalizedPrazo.vencimento)}.`),
        ],
        parte: processoData.parte ?? normalizedPrazo.parte,
        dataUltimoProtocolo: processoData.dataUltimoProtocolo ?? normalizedPrazo.vencimento,
        observacoes: processoData.observacoes ?? '',
      }),
      { merge: true },
    )
  } else {
    await addDoc(
      collection(db, 'processos'),
      removeEmptyValues({
        numero: normalizedPrazo.processo,
        parte: normalizedPrazo.parte,
        assunto: normalizedPrazo.assunto || normalizedPrazo.item || 'Processo cadastrado a partir de prazo',
        orgao: normalizedPrazo.orgao || 'Órgão não informado',
        fase: normalizedPrazo.fase || 'Acompanhamento de prazo',
        prioridade: normalizedPrazo.prioridade || 'Média',
        prazo: normalizedPrazo.vencimento,
        dataUltimoProtocolo: normalizedPrazo.vencimento,
        andamentoAtual: normalizedPrazo.andamentoAtual || 'Fazer',
        observacoes: normalizedPrazo.observacoes || 'Processo criado automaticamente a partir do cadastro de prazo.',
        ownerId: context.ownerId,
        ownerUid: context.ownerUid,
        ownerName: context.ownerName,
        responsavel: context.ownerName,
        setorId: context.setorId,
        setorNome: context.setorNome,
        tags: normalizedPrazo.tags ?? [],
        prazos: [nextPrazoEntry],
        historico: [
          buildHistoricoEntry(normalizedPrazo, `Processo criado automaticamente a partir do prazo com vencimento em ${formatDisplayDate(normalizedPrazo.vencimento)}.`),
        ],
      }),
    )
  }

  const prazoDocRef = await addDoc(
    collection(db, 'prazos'),
    removeEmptyValues({
      ...normalizedPrazo,
      ownerId: context.ownerId,
      ownerUid: context.ownerUid,
      ownerName: context.ownerName,
      responsavel: normalizedPrazo.responsavel || context.ownerName,
      setorId: context.setorId,
      setorNome: context.setorNome,
    }),
  )

  return {
    prazoId: prazoDocRef.id,
    processAction: existingProcesso ? 'updated' : 'created',
  }
}

export async function createPrazosBatchWithProcessSync({ prazoValuesList, context }) {
  ensureLocalAvailable()
  const { db } = getLocalServices()

  if (!Array.isArray(prazoValuesList) || !prazoValuesList.length) {
    return []
  }

  const savedResults = []

  for (const prazoValues of prazoValuesList) {
    const normalizedPrazo = normalizePrazoPayload(prazoValues, context)
    const processoSnapshot = await findProcessoByNumero(db, normalizedPrazo.processo)
    const existingProcesso = processoSnapshot?.docs[0]
    const batch = writeBatch(db)
    const prazoRef = doc(collection(db, 'prazos'))
    const nextPrazoEntry = buildPrazoEntry(normalizedPrazo)

    if (existingProcesso) {
      const processoData = existingProcesso.data()
      const currentPrazos = Array.isArray(processoData.prazos) ? processoData.prazos : []
      const currentHistorico = Array.isArray(processoData.historico) ? processoData.historico : []

      batch.set(
        doc(db, 'processos', existingProcesso.id),
        removeEmptyValues({
          prazos: [...currentPrazos, nextPrazoEntry],
          historico: [
            ...currentHistorico,
            buildHistoricoEntry(normalizedPrazo, `Novo prazo incluído por cadastro em lote para ${formatDisplayDate(normalizedPrazo.vencimento)}.`),
          ],
          parte: processoData.parte ?? normalizedPrazo.parte,
        }),
        { merge: true },
      )
    } else {
      const processoRef = doc(collection(db, 'processos'))
      batch.set(
        processoRef,
        removeEmptyValues({
          numero: normalizedPrazo.processo,
          parte: normalizedPrazo.parte,
          assunto: normalizedPrazo.assunto || normalizedPrazo.item || 'Processo cadastrado a partir de prazo em lote',
          orgao: normalizedPrazo.orgao || 'Órgão não informado',
          fase: normalizedPrazo.fase || 'Acompanhamento de prazo',
          prioridade: normalizedPrazo.prioridade || 'Média',
          prazo: normalizedPrazo.vencimento,
          dataUltimoProtocolo: normalizedPrazo.vencimento,
          andamentoAtual: normalizedPrazo.andamentoAtual || 'Fazer',
          observacoes: normalizedPrazo.observacoes || 'Processo criado automaticamente a partir do cadastro em lote de prazos.',
          ownerId: context.ownerId,
          ownerUid: context.ownerUid,
          ownerName: context.ownerName,
          responsavel: context.ownerName,
          setorId: context.setorId,
          setorNome: context.setorNome,
          tags: normalizedPrazo.tags ?? [],
          prazos: [nextPrazoEntry],
          historico: [
            buildHistoricoEntry(normalizedPrazo, `Processo criado automaticamente por lote com prazo em ${formatDisplayDate(normalizedPrazo.vencimento)}.`),
          ],
        }),
      )
    }

    batch.set(
      prazoRef,
      removeEmptyValues({
        ...normalizedPrazo,
        ownerId: context.ownerId,
        ownerUid: context.ownerUid,
        ownerName: context.ownerName,
        responsavel: normalizedPrazo.responsavel || context.ownerName,
        setorId: context.setorId,
        setorNome: context.setorNome,
      }),
    )

    await batch.commit()
    savedResults.push({
      prazoId: prazoRef.id,
      processAction: existingProcesso ? 'updated' : 'created',
      processo: normalizedPrazo.processo,
    })
  }

  return savedResults
}

export async function findPrazoDuplicateKeys({ ownerId, ownerUid = '' }) {
  ensureLocalAvailable()
  const { db } = getLocalServices()
  const constraints = []

  if (ownerId && ownerUid) {
    constraints.push(or(where('ownerId', '==', ownerId), where('ownerUid', '==', ownerUid)))
  } else if (ownerId) {
    constraints.push(where('ownerId', '==', ownerId))
  } else if (ownerUid) {
    constraints.push(where('ownerUid', '==', ownerUid))
  }

  const snapshot = await getDocs(
    constraints.length
      ? query(collection(db, 'prazos'), ...constraints)
      : collection(db, 'prazos'),
  )

  return new Set(
    snapshot.docs.map((docItem) => buildPrazoDuplicateKey(docItem.data())).filter(Boolean),
  )
}

export function buildPrazoDuplicateKey(values) {
  const processo = normalizeProcessNumber(values.processo ?? values.numeroProcesso)
  const vencimento = normalizeDate(values.vencimento)
  const item = normalizeText(values.item ?? values.parte)

  if (!processo || !vencimento || !item) {
    return ''
  }

  return `${processo}::${vencimento}::${item.toLowerCase()}`
}

async function findProcessoByNumero(db, numero) {
  return getDocs(
    query(collection(db, 'processos'), where('numero', '==', numero), limit(1)),
  )
}

function buildPrazoEntry(values) {
  return removeEmptyValues({
    id: `prazo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    item: values.item,
    vencimento: values.vencimento,
    status: values.status,
    parte: values.parte,
    origem: values.origem || 'Cadastro de prazo',
    nomeDocumento: values.anexo ?? values.nomeDocumento ?? '',
    linkPeticao: values.anexoUrl ?? values.linkPeticao ?? '',
    observacoes: values.observacoes ?? '',
    responsavel: values.responsavel ?? '',
  })
}

function buildHistoricoEntry(values, descricao) {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: values.vencimento,
    status: values.andamentoAtual || 'Fazer',
    descricao,
  }
}

function normalizePrazoPayload(values, context) {
  return removeEmptyValues({
    ...values,
    processo: normalizeProcessNumber(values.processo ?? values.numeroProcesso),
    item: values.item ?? values.parte ?? 'Prazo processual',
    parte: values.parte ?? values.item ?? 'Parte não informada',
    vencimento: normalizeDate(values.vencimento),
    status: values.status ?? 'Planejado',
    origem: values.origem ?? 'Cadastro individual',
    responsavel: values.responsavel ?? context.ownerName,
  })
}

function ensureLocalAvailable() {
  if (!hasLocalDatabase()) {
    throw new Error('Serviço de dados indisponível no momento.')
  }
}

function removeEmptyValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

function normalizeProcessNumber(value) {
  return String(value ?? '')
    .replace(/[^\d.-]/g, '')
    .trim()
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDate(value) {
  const cleanedValue = String(value ?? '').trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanedValue)) {
    return cleanedValue
  }

  const match = cleanedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)

  if (!match) {
    return cleanedValue
  }

  const [, day, month, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function formatDisplayDate(value) {
  const normalizedDate = normalizeDate(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return value
  }

  const [year, month, day] = normalizedDate.split('-')
  return `${day}/${month}/${year}`
}
