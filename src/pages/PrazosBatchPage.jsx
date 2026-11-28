import { useMemo, useState } from 'react'
import { canAccess } from '../utils/mechanicAccess.js'
import { Link, Navigate } from 'react-router-dom'
import { CollectionStatus } from '../components/ui/CollectionStatus'
import { DataTable } from '../components/ui/DataTable'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'
import { prazos as fallbackPrazos } from '../data/mockData'
import { hasLocalDatabase } from '../services/local/client'
import {
  buildPrazoDuplicateKey,
  createPrazosBatchWithProcessSync,
  findPrazoDuplicateKeys,
} from '../services/local/processoPrazoSync'
import { useCollectionData } from '../services/local/useCollectionData'
import { buildUserAccessContext, canAccessOwnedRow, getStableOwnerId } from '../utils/accessScope'

export function PrazosBatchPage() {
  const { currentUser } = useAuth()
  const canWrite = canAccess(currentUser,'prazos',2)&&canAccess(currentUser,'processos',2)
  const [rawInput, setRawInput] = useState('')
  const [previewRows, setPreviewRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const localEnabled = hasLocalDatabase()

  const { rows: existingRows, loading, error, source } = useCollectionData({
    collectionName: 'prazos',
    fallbackData: fallbackPrazos,
    orderByField: 'vencimento',
    clientFilter: (item) => canAccessOwnedRow(item, currentUser),
  })
  const existingPrazoKeys = useMemo(
    () => new Set(existingRows.map((row) => buildPrazoDuplicateKey(row)).filter(Boolean)),
    [existingRows],
  )

  if (!canWrite) {
    return <Navigate to="/" replace />
  }

  async function handleProcess() {
    setProcessing(true)
    setFeedback({ type: '', message: '' })

    try {
      const accessOwnerId = getStableOwnerId(currentUser)
      const databaseKeys = localEnabled
        ? await findPrazoDuplicateKeys({ ownerId: accessOwnerId, ownerUid: currentUser?.uid ?? '' })
        : existingPrazoKeys
      const result = parseSajBatch(rawInput, databaseKeys)
      setPreviewRows(result.rows)
      setSummary(result.summary)
    } catch (processError) {
      setFeedback({
        type: 'error',
        message: processError.message || 'Falha ao processar os dados do lote.',
      })
    } finally {
      setProcessing(false)
    }
  }

  async function handleSave() {
    if(!canWrite)return
    const validRows = previewRows.filter((row) => row.status !== 'Duplicado' && row.status !== 'Linha invalida')

    if (!validRows.length) {
      setFeedback({
        type: 'error',
        message: 'Nao ha registros validos para salvar.',
      })
      return
    }

    setSubmitting(true)
    setFeedback({ type: '', message: '' })

    try {
      const accessContext = buildUserAccessContext(currentUser)
      const results = await createPrazosBatchWithProcessSync({
        prazoValuesList: validRows.map((row) => ({
          processo: row.processo,
          parte: row.parte,
          item: row.item,
          setor: 'SAJ',
          orgao: row.orgao || '',
          assunto: row.item,
          fase: 'Acompanhamento de prazo',
          prioridade: 'Média',
          vencimento: row.saveVencimento,
          status: getPrazoStatus(row.saveVencimento),
          origem: 'Cadastro em lote SAJ',
        })),
        context: accessContext,
      })

      const createdProcessCount = results.filter((item) => item.processAction === 'created').length
      const updatedProcessCount = results.filter((item) => item.processAction === 'updated').length
      const duplicateCount = previewRows.filter((row) => row.status === 'Duplicado').length
      const invalidCount = previewRows.filter((row) => row.status === 'Linha invalida').length

      setFeedback({
        type: 'success',
        message: `${validRows.length} prazos salvos. ${createdProcessCount} processo(s) criado(s), ${updatedProcessCount} processo(s) atualizado(s), ${duplicateCount} duplicado(s) ignorado(s) e ${invalidCount} linha(s) invalida(s).`,
      })
      setRawInput('')
      setPreviewRows([])
      setSummary(null)
    } catch (saveError) {
      setFeedback({
        type: 'error',
        message: saveError.message || 'Falha ao salvar os prazos em lote.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleClear() {
    setRawInput('')
    setPreviewRows([])
    setSummary(null)
    setFeedback({ type: '', message: '' })
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Controle de prazos"
        title="Cadastro em lote via SAJ"
        description="O lote agora cria processos automaticamente quando o CNJ não existe e adiciona nova demanda quando o processo já está cadastrado."
        action={
          <div className="page-header__actions">
            <Link className="secondary-button" to="/prazos">
              Voltar para prazos
            </Link>
          </div>
        }
      />

      <CollectionStatus
        loading={loading}
        error={error}
        source={source}
        empty={!existingRows.length}
        label="cadastro em lote"
      />

      {!localEnabled ? (
        <div className="collection-status">
          O ambiente atual está em modo local. O lote só grava em `prazos` e `processos` quando o armazenamento local está ativo.
        </div>
      ) : null}

      <section className="batch-panel">
        <div className="batch-panel__intro">
          <div>
            <h4>Entrada de dados do SAJ</h4>
            <p>
              Cole abaixo os dados do SAJ. O sistema identifica número do processo, parte e vencimento,
              e passa a tratar o prazo como demanda do processo correspondente.
            </p>
          </div>
          <div className="batch-panel__helper">
            <span>Leitura automatica do SAJ</span>
            <strong>Data: primeira coluna com data</strong>
            <strong>Processo: coluna com numero CNJ</strong>
            <strong>Parte: ultima coluna textual preenchida</strong>
          </div>
        </div>

        <label className="form-field form-field--full">
          <span>Dados brutos do SAJ</span>
          <textarea
            className="batch-textarea"
            rows={12}
            placeholder={'01/04/2026 23:59:59\t0000000-00.2026.8.00.0000\tcontestacao estado\t\tNOME FICTÍCIO'}
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            disabled={submitting || processing}
          />
        </label>

        <div className="batch-actions">
          <button type="button" className="primary-button" onClick={handleProcess} disabled={!rawInput.trim() || submitting || processing}>
            {processing ? 'Processando...' : 'Processar Dados'}
          </button>
          <button type="button" className="secondary-button" onClick={handleClear} disabled={submitting || processing}>
            Limpar campo
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleSave}
            disabled={!previewRows.some((row) => row.status !== 'Duplicado' && row.status !== 'Linha invalida') || submitting || !localEnabled}
          >
            {submitting ? 'Salvando...' : 'Salvar no sistema'}
          </button>
        </div>

        {summary ? (
          <div className="batch-summary">
            <article>
              <strong>{summary.validCount}</strong>
              <span>Novas demandas</span>
            </article>
            <article>
              <strong>{summary.duplicateCount}</strong>
              <span>Duplicados</span>
            </article>
            <article>
              <strong>{summary.invalidCount}</strong>
              <span>Linhas invalidas</span>
            </article>
          </div>
        ) : null}

        {feedback.message ? (
          <div
            className={`form-feedback${feedback.type === 'error' ? ' form-feedback--error' : ' form-feedback--success'}`}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      <section className="batch-panel">
        <div className="panel-card__header">
          <h4>Pre-visualizacao</h4>
          <span>{previewRows.length ? `${previewRows.length} linhas processadas` : 'Nenhum dado processado ainda'}</span>
        </div>

        <DataTable
          columns={[
            { key: 'processo', label: 'Processo' },
            { key: 'parte', label: 'Parte' },
            { key: 'item', label: 'Demanda' },
            { key: 'vencimento', label: 'Vencimento' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'motivo', label: 'Observacao' },
          ]}
          rows={previewRows}
          emptyMessage="Cole os dados do SAJ e clique em Processar Dados para gerar a pre-visualizacao."
        />
      </section>
    </div>
  )
}

function parseSajBatch(rawInput, existingPrazoKeys) {
  const lines = String(rawInput)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const seenInBatch = new Set()

  const rows = lines.map((line, index) => {
    const columns = line.split('\t')
    const vencimento = extractDate(columns)
    const processo = extractProcessNumber(columns)
    const parte = extractPartyName(columns, processo)
    const item = extractDemand(columns, processo, parte)
    const duplicateKey = buildPrazoDuplicateKey({
      processo,
      vencimento,
      item,
    })

    if (!vencimento || !processo || !parte || !item) {
      return {
        id: `linha-${index + 1}`,
        processo: processo || 'Nao identificado',
        parte: parte || 'Nao identificado',
        item: item || 'Nao identificado',
        vencimento: formatPreviewDate(vencimento),
        status: 'Linha invalida',
        motivo: 'Colunas obrigatorias ausentes ou data invalida.',
      }
    }

    if (seenInBatch.has(duplicateKey)) {
      return {
        id: `linha-${index + 1}`,
        processo,
        parte,
        item,
        vencimento: formatPreviewDate(vencimento),
        status: 'Duplicado',
        motivo: 'Mesmo prazo repetido dentro do proprio lote.',
      }
    }

    seenInBatch.add(duplicateKey)

    if (existingPrazoKeys.has(duplicateKey)) {
      return {
        id: `linha-${index + 1}`,
        processo,
        parte,
        item,
        vencimento: formatPreviewDate(vencimento),
        status: 'Duplicado',
        motivo: 'Prazo ja existente para este processo.',
      }
    }

    return {
      id: `linha-${index + 1}`,
      processo,
      parte,
      item,
      vencimento,
      saveVencimento: vencimento,
      status: 'Novo',
      motivo: 'Pronto para cadastrar como nova demanda do processo.',
    }
  })

  return {
    rows: rows.map((row) => ({
      ...row,
      vencimento:
        row.status === 'Linha invalida' ? row.vencimento : formatPreviewDate(row.vencimento),
      saveVencimento: row.saveVencimento ?? '',
    })),
    summary: {
      validCount: rows.filter((row) => row.status === 'Novo').length,
      duplicateCount: rows.filter((row) => row.status === 'Duplicado').length,
      invalidCount: rows.filter((row) => row.status === 'Linha invalida').length,
    },
  }
}

function normalizeProcessNumber(value) {
  return String(value ?? '')
    .replace(/[^\d.-]/g, '')
    .trim()
}

function extractProcessNumber(columns) {
  const matchedColumn = columns.find((column) => isProcessNumber(column))
  return normalizeProcessNumber(matchedColumn)
}

function extractPartyName(columns, processNumber) {
  const cleanedColumns = columns
    .map((column) => normalizeText(column))
    .filter(Boolean)

  for (let index = cleanedColumns.length - 1; index >= 0; index -= 1) {
    const value = cleanedColumns[index]

    if (normalizeProcessNumber(value) === processNumber) {
      continue
    }

    if (normalizeDate(value)) {
      continue
    }

    if (isProcessNumber(value)) {
      continue
    }

    return value
  }

  return ''
}

function extractDemand(columns, processNumber, partyName) {
  const cleanedColumns = columns
    .map((column) => normalizeText(column))
    .filter(Boolean)

  const candidate = cleanedColumns.find((value) => {
    if (normalizeProcessNumber(value) === processNumber) {
      return false
    }

    if (value === partyName) {
      return false
    }

    if (normalizeDate(value) || isProcessNumber(value)) {
      return false
    }

    return true
  })

  return candidate || 'Prazo processual'
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDate(columns) {
  const matchedColumn = columns.find((column) => normalizeDate(column))
  return normalizeDate(matchedColumn)
}

function normalizeDate(value) {
  const cleanedValue = String(value ?? '').trim()
  const match = cleanedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/)

  if (!match) {
    return ''
  }

  const [, day, month, year] = match
  const normalizedDay = day.padStart(2, '0')
  const normalizedMonth = month.padStart(2, '0')
  const isoDate = `${year}-${normalizedMonth}-${normalizedDay}`
  const date = new Date(`${isoDate}T00:00:00Z`)

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(normalizedMonth) ||
    date.getUTCDate() !== Number(normalizedDay)
  ) {
    return ''
  }

  return isoDate
}

function isProcessNumber(value) {
  const normalizedValue = normalizeProcessNumber(value)
  return /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(normalizedValue)
}

function formatPreviewDate(isoDate) {
  if (!isoDate) {
    return 'Nao identificado'
  }

  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function getPrazoStatus(isoDate) {
  if (!isoDate) {
    return 'Planejado'
  }

  const today = new Date()
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const targetDate = new Date(`${isoDate}T00:00:00`)
  const diffInDays = Math.round((targetDate - currentDate) / 86400000)

  if (diffInDays <= 0) {
    return 'Hoje'
  }

  if (diffInDays <= 7) {
    return 'A vencer'
  }

  return 'Planejado'
}
