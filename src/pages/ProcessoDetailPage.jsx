import { createCollectionTransaction } from '../services/local/localCrud'
import { canAccess } from '../utils/mechanicAccess.js'
import { ArrowLeft, ArrowUpRight, Save, Plus, Trash2, FolderOpen, Tags, CalendarClock, ClipboardList, History, FilePenLine, CheckCircle2, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CollectionStatus } from '../components/ui/CollectionStatus'
import { useAuth } from '../contexts/useAuth'
import {
  processTags as fallbackTags,
  processos as fallbackProcessos,
  prazos as fallbackPrazos,
} from '../data/mockData'
import { hasLocalDatabase } from '../services/local/client'
import {
} from '../services/local/localCrud'
import { useCollectionData } from '../services/local/useCollectionData'
import { compareByDateDesc, formatDateLabel, formatDayMonth } from '../utils/dates'
import {
  buildTagAssignmentValue,
  enrichProcessoTags,
  getProcessoStatusTone,
  PROCESSO_STATUS_OPTIONS,
} from '../utils/processos'
import { buildUserAccessContext, canAccessOwnedRow } from '../utils/accessScope'
import { rowBelongsToSector } from '../utils/sectorScope'

const EMPTY_DRAFT = {
  parte: '',
  assunto: '',
  orgao: '',
  fase: '',
  prioridade: '',
  prazo: '',
  dataUltimoProtocolo: '',
  andamentoAtual: 'Fazer',
  observacoes: '',
  linkDocumento: '',
  nomeDocumento: '',
  tags: [],
  historico: [],
  prazos: [],
}
const PRAZO_STATUS_OPTIONS = ['Planejado', 'Em andamento', 'Protocolado', 'Concluído', 'Suspenso']

export function ProcessoDetailPage() {
  const { numero } = useParams()
  const { currentUser } = useAuth()
 const canWrite=canAccess(currentUser,'processos',2)&&canAccess(currentUser,'prazos',2)
  const isAdmin = currentUser?.isAdmin
  const localEnabled = hasLocalDatabase()
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [newHistoryEntry, setNewHistoryEntry] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const processosCollection = useCollectionData({
    collectionName: 'processos',
    fallbackData: fallbackProcessos,
    clientFilter: isAdmin ? null : (item) => canAccessOwnedRow(item, currentUser),
  })
  const tagsCollection = useCollectionData({
    collectionName: 'tags',
    fallbackData: fallbackTags,
    orderByField: 'name',
    clientFilter: isAdmin ? null : (item) => rowBelongsToSector(item, currentUser?.sectorId),
  })
  const prazosCollection = useCollectionData({
    collectionName: 'prazos',
    fallbackData: fallbackPrazos,
    clientFilter: isAdmin ? null : (item) => canAccessOwnedRow(item, currentUser),
  })

  const processo = useMemo(
    () => processosCollection.rows.find((item) => item.numero === numero) ?? null,
    [numero, processosCollection.rows],
  )
  const processTags = useMemo(
    () => enrichProcessoTags({ tags: buildTagAssignmentValue(draft.tags) }, tagsCollection.rows),
    [draft.tags, tagsCollection.rows],
  )
  const processDemandas = useMemo(() => {
    const prazoRows = prazosCollection.rows
      .filter((item) => item.processo === numero || item.numeroProcesso === numero)
      .map((item) => ({
        id: item.id ?? item.documentId,
        documentId: item.documentId ?? item.id ?? '',
        item: item.item ?? 'Prazo processual',
        parte: item.parte ?? processo?.parte ?? 'Parte não informada',
        vencimento: item.vencimento ?? '',
        status: item.status ?? 'Planejado',
        origem: item.origem ?? 'Cadastro de prazo',
        responsavel: item.responsavel ?? currentUser?.displayName ?? '',
        observacoes: item.observacoes ?? '',
        nomeDocumento: item.anexo ?? item.nomeDocumento ?? '',
        linkPeticao: item.anexoUrl ?? item.linkPeticao ?? '',
      }))
    const embeddedRows = Array.isArray(processo?.prazos)
      ? processo.prazos.map((item) => ({
          id: item.id ?? `prazo-${Math.random().toString(36).slice(2, 8)}`,
          documentId: '',
          item: item.item ?? 'Prazo processual',
          parte: item.parte ?? processo?.parte ?? 'Parte não informada',
          vencimento: item.vencimento ?? '',
          status: item.status ?? 'Planejado',
          origem: item.origem ?? 'Processo',
          responsavel: item.responsavel ?? currentUser?.displayName ?? '',
          observacoes: item.observacoes ?? '',
          nomeDocumento: item.nomeDocumento ?? item.anexo ?? '',
          linkPeticao: item.linkPeticao ?? item.anexoUrl ?? '',
        }))
      : []
    const mergedRows = [...prazoRows]

    embeddedRows.forEach((embeddedItem) => {
      const exists = prazoRows.some((prazoItem) =>
        prazoItem.item === embeddedItem.item &&
        prazoItem.vencimento === embeddedItem.vencimento &&
        prazoItem.status === embeddedItem.status,
      )
      if (!exists) {
        mergedRows.push(embeddedItem)
      }
    })

    return mergedRows.sort((left, right) => compareByDateDesc(left.vencimento, right.vencimento))
  }, [currentUser?.displayName, numero, processo?.parte, processo?.prazos, prazosCollection.rows])

  useEffect(() => {
    setDraft(EMPTY_DRAFT)
    setNewHistoryEntry('')
    setFeedback({ type: '', message: '' })
  }, [numero])

  useEffect(() => {
    if (!processo) {
      return
    }

    setDraft(createProcessDraft(processo, processDemandas))
  }, [processo, processDemandas])

  async function handleSave(event) {
    event.preventDefault()
    if(!canWrite)return

    if (!processo?.documentId && !processo?.id) {
      setFeedback({ type: 'error', message: 'Processo não localizado para atualização.' })
      return
    }

    setSubmitting(true)
    setFeedback({ type: '', message: '' })

    try {
      const tx=createCollectionTransaction()
      const accessContext = buildUserAccessContext(currentUser)
      const nextHistorico = newHistoryEntry.trim()
        ? [
            ...draft.historico,
            {
              id: `hist-${Date.now()}`,
              data: draft.dataUltimoProtocolo || draft.prazo,
              status: draft.andamentoAtual,
              descricao: newHistoryEntry.trim(),
            },
          ]
        : draft.historico

      const normalizedPrazos = draft.prazos.map((item) => ({
        ...item,
        item: String(item.item ?? '').trim(),
        parte: String(item.parte ?? '').trim() || draft.parte,
        vencimento: String(item.vencimento ?? '').trim(),
        status: String(item.status ?? '').trim() || 'Planejado',
        origem: String(item.origem ?? '').trim() || 'Cadastro de prazo',
        responsavel: String(item.responsavel ?? '').trim() || (currentUser?.displayName ?? ''),
        observacoes: String(item.observacoes ?? '').trim(),
        nomeDocumento: String(item.nomeDocumento ?? '').trim(),
        linkPeticao: String(item.linkPeticao ?? '').trim(),
      }))

      const removedPrazos = processDemandas.filter(
        (item) => item.documentId && !normalizedPrazos.some((draftItem) => draftItem.documentId === item.documentId),
      )

      await Promise.all(
        removedPrazos.map((item) => tx.delete({
          collectionName: 'prazos',
          documentId: item.documentId,
        })),
      )

      await tx.update({
        collectionName: 'processos',
        documentId: processo.documentId ?? processo.id,
        values: {
          parte: draft.parte,
          assunto: draft.assunto,
          orgao: draft.orgao,
          fase: draft.fase,
          prioridade: draft.prioridade,
          prazo: draft.prazo,
          dataUltimoProtocolo: draft.dataUltimoProtocolo,
          andamentoAtual: draft.andamentoAtual,
          observacoes: draft.observacoes,
          linkDocumento: draft.linkDocumento,
          nomeDocumento: draft.nomeDocumento,
          tags: buildTagAssignmentValue(draft.tags),
          historico: nextHistorico,
          prazos: normalizedPrazos.map((item) => ({
            id: item.id,
            item: item.item,
            parte: item.parte,
            vencimento: item.vencimento,
            status: item.status,
            origem: item.origem,
            responsavel: item.responsavel,
            observacoes: item.observacoes,
            nomeDocumento: item.nomeDocumento,
            linkPeticao: item.linkPeticao,
          })),
        },
        additionalValues: accessContext,
      })

      await Promise.all(
        normalizedPrazos
          .filter((item) => item.documentId)
          .map((item) =>
            tx.update({
              collectionName: 'prazos',
              documentId: item.documentId,
              values: {
                processo: processo.numero,
                numeroProcesso: processo.numero,
                item: item.item,
                parte: item.parte,
                vencimento: item.vencimento,
                status: item.status,
                origem: item.origem,
                responsavel: item.responsavel,
                anexo: item.nomeDocumento ?? '',
                anexoUrl: item.linkPeticao ?? '',
                observacoes: item.observacoes ?? '',
                assunto: draft.assunto,
                orgao: draft.orgao,
                fase: draft.fase,
                prioridade: draft.prioridade,
                andamentoAtual: draft.andamentoAtual,
              },
            }),
          ),
      )

      await Promise.all(
        normalizedPrazos
          .filter((item) => !item.documentId)
          .map((item) =>
            tx.create({
              collectionName: 'prazos',
              values: {
                processo: processo.numero,
                numeroProcesso: processo.numero,
                item: item.item,
                parte: item.parte,
                vencimento: item.vencimento,
                status: item.status,
                origem: item.origem,
                responsavel: item.responsavel,
                observacoes: item.observacoes,
                anexo: item.nomeDocumento ?? '',
                anexoUrl: item.linkPeticao ?? '',
                assunto: draft.assunto,
                orgao: draft.orgao,
                fase: draft.fase,
                prioridade: draft.prioridade,
                andamentoAtual: draft.andamentoAtual,
              },
              additionalValues: accessContext,
            }),
          ),
      )

      setDraft((current) => ({ ...current, historico: nextHistorico }))
      setNewHistoryEntry('')
      await tx.commit()
      setFeedback({ type: 'success', message: 'Alterações do processo salvas com sucesso.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao salvar o processo.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!processosCollection.loading && !processo && !processosCollection.error) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <div className="page-header__content">
            <span className="page-header__eyebrow">Processos judiciais</span>
            <h3>Processo não encontrado</h3>
            <p>O número informado não foi localizado no ambiente atual.</p>
          </div>
          <div className="page-header__action">
            <Link className="secondary-button" to="/processos">
              <ArrowLeft size={16} aria-hidden="true"/> Voltar para processos
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="process-detail-hero">
        <div>
          <span className="processos-hero__eyebrow">Processo individual</span>
          <h3>{processo?.numero ?? numero}</h3>
          <p>{draft.parte || processo?.parte || 'Parte não informada'}</p>
        </div>
        <div className="page-header__actions">
          <Link className="secondary-button" to="/processos">
            <ArrowLeft size={16} aria-hidden="true"/> Voltar para processos
          </Link>
          {draft.linkDocumento ? (
            <a className="primary-button" href={draft.linkDocumento} target="_blank" rel="noreferrer">
              <ArrowUpRight size={16} aria-hidden="true"/> Abrir documento
            </a>
          ) : null}
        </div>
      </section>

      <CollectionStatus
        loading={processosCollection.loading || tagsCollection.loading || prazosCollection.loading}
        error={processosCollection.error || tagsCollection.error || prazosCollection.error}
        source={
          processosCollection.source === 'local' &&
          tagsCollection.source === 'local' &&
          prazosCollection.source === 'local'
            ? 'local'
            : 'remote'
        }
        empty={!processo}
        label="processo"
      />

      {!localEnabled ? (
        <div className="collection-status">
          O ambiente atual está em modo local. A visualização está disponível, mas salvar alterações depende do armazenamento local.
        </div>
      ) : null}

      <section className="process-detail-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <h4 className="process-icon-text"><FolderOpen size={18} aria-hidden="true"/> Cabeçalho do processo</h4>
            <span>Informações estratégicas</span>
          </div>
          <dl className="process-detail-meta">
            <div>
              <dt>Número CNJ</dt>
              <dd>{processo?.numero}</dd>
            </div>
            <div>
              <dt>Parte</dt>
              <dd>{draft.parte}</dd>
            </div>
            <div>
              <dt>Órgão</dt>
              <dd>{draft.orgao}</dd>
            </div>
            <div>
              <dt>Assunto</dt>
              <dd>{draft.assunto}</dd>
            </div>
            <div>
              <dt>Fase</dt>
              <dd>{draft.fase}</dd>
            </div>
            <div>
              <dt>Prioridade</dt>
              <dd>{draft.prioridade}</dd>
            </div>
            <div>
              <dt>Status atual</dt>
              <dd><StatusChip value={draft.andamentoAtual} /></dd>
            </div>
            <div>
              <dt>Último protocolo</dt>
              <dd>{formatDayMonth(draft.dataUltimoProtocolo)}</dd>
            </div>
          </dl>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <h4 className="process-icon-text"><Tags size={18} aria-hidden="true"/> Área de tags</h4>
            <span>{processTags.length} tag(s) associada(s)</span>
          </div>
          <div className="process-detail-tags">
            {processTags.length ? processTags.map((tag) => <TagChip key={tag.documentId ?? tag.id} tag={tag} />) : <p>Sem tags associadas.</p>}
          </div>
          <div className="process-tag-selector">
            {tagsCollection.rows.map((tag) => {
              const tagId = tag.documentId ?? tag.id
              const isActive = draft.tags.includes(tagId)

              return (
                <button
                  key={tagId}
                  type="button"
                  className={`process-tag-option${isActive ? ' process-tag-option--active' : ''}`}
                  onClick={() => {
                    setDraft((current) => ({
                      ...current,
                      tags: isActive
                        ? current.tags.filter((item) => item !== tagId)
                        : [...current.tags, tagId],
                    }))
                  }}
                >
                  <span className="process-tag-chip" style={{ '--tag-color': tag.color ?? '#2563eb' }}>
                    {tag.name}
                  </span>
                </button>
              )
            })}
          </div>
        </article>
      </section>

      <section className="process-detail-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <h4 className="process-icon-text"><CalendarClock size={18} aria-hidden="true"/> Prazos e demandas do processo</h4>
            <span>{draft.prazos.length} demanda(s) vinculada(s)</span>
          </div>
          <div className="process-demand-list">
            {draft.prazos.length ? (
              draft.prazos.map((item, index) => (
                <div key={item.id} className="process-demand-item">
                  <div className="process-demand-item__top">
                    <strong>{item.item}</strong>
                    <StatusChip value={item.status} />
                  </div>
                  <div className="process-demand-item__meta">
                    <span>Vencimento: {formatDateLabel(item.vencimento)}</span>
                    <span>Parte: {item.parte}</span>
                    <span>Responsável: {item.responsavel || 'Não informado'}</span>
                    <span>Origem: {item.origem}</span>
                  </div>
                  <div className="record-form__grid">
                    <Field label="Descrição" value={item.item ?? ''} onChange={(value) => updateDraftDemanda(index, 'item', value, setDraft)} />
                    <Field label="Vencimento" value={item.vencimento ?? ''} onChange={(value) => updateDraftDemanda(index, 'vencimento', value, setDraft)} />
                    <Field label="Parte" value={item.parte ?? ''} onChange={(value) => updateDraftDemanda(index, 'parte', value, setDraft)} />
                    <Field label="Responsável" value={item.responsavel ?? ''} onChange={(value) => updateDraftDemanda(index, 'responsavel', value, setDraft)} />
                    <label className="form-field">
                      <span>Status</span>
                      <select
                        value={item.status ?? 'Planejado'}
                        onChange={(event) => updateDraftDemanda(index, 'status', event.target.value, setDraft)}
                      >
                        {PRAZO_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field label="Origem" value={item.origem ?? ''} onChange={(value) => updateDraftDemanda(index, 'origem', value, setDraft)} />
                    <Field label="Nome do documento" value={item.nomeDocumento ?? ''} onChange={(value) => updateDraftDemanda(index, 'nomeDocumento', value, setDraft)} />
                    <Field label="Link da petição" value={item.linkPeticao ?? ''} onChange={(value) => updateDraftDemanda(index, 'linkPeticao', value, setDraft)} />
                    <label className="form-field form-field--full">
                      <span>Observações do prazo</span>
                      <textarea
                        rows={3}
                        value={item.observacoes ?? ''}
                        onChange={(event) => updateDraftDemanda(index, 'observacoes', event.target.value, setDraft)}
                      />
                    </label>
                  </div>
                  {item.linkPeticao ? (
                    <a className="table-link" href={item.linkPeticao} target="_blank" rel="noreferrer">
                      {item.nomeDocumento || 'Abrir petição'}
                    </a>
                  ) : null}
                  <div className="record-form__actions">
                    <button
                      type="button"
                      className="secondary-button secondary-button--danger"
                      disabled={!canWrite||!canAccess(currentUser,'prazos',3)} onClick={() => removeDraftDemanda(index, setDraft)}
                    >
                      <Trash2 size={16} aria-hidden="true"/> Excluir prazo
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Nenhuma demanda vinculada a este processo até o momento.</div>
            )}
          </div>
          <div className="record-form__actions">
            <button
              type="button"
              className="secondary-button"
              disabled={!canWrite} onClick={() => addDraftDemanda(setDraft, draft, currentUser)}
            >
              <Plus size={16} aria-hidden="true"/> Adicionar prazo
            </button>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <h4 className="process-icon-text"><ClipboardList size={18} aria-hidden="true"/> Área de andamento</h4>
            <span>Histórico e atualização do fluxo</span>
          </div>
          <form className="record-form" onSubmit={handleSave}>
            <div className="record-form__grid">
              <Field label="Nome da parte" value={draft.parte} onChange={(value) => setDraft((current) => ({ ...current, parte: value }))} />
              <Field label="Assunto" value={draft.assunto} onChange={(value) => setDraft((current) => ({ ...current, assunto: value }))} />
              <Field label="Órgão" value={draft.orgao} onChange={(value) => setDraft((current) => ({ ...current, orgao: value }))} />
              <Field label="Fase" value={draft.fase} onChange={(value) => setDraft((current) => ({ ...current, fase: value }))} />
              <Field label="Prioridade" value={draft.prioridade} onChange={(value) => setDraft((current) => ({ ...current, prioridade: value }))} />
              <label className="form-field">
                <span>Status atual</span>
                <select
                  value={draft.andamentoAtual}
                  onChange={(event) => setDraft((current) => ({ ...current, andamentoAtual: event.target.value }))}
                >
                  {PROCESSO_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Próximo prazo" value={draft.prazo} onChange={(value) => setDraft((current) => ({ ...current, prazo: value }))} />
              <Field label="Último protocolo" value={draft.dataUltimoProtocolo} onChange={(value) => setDraft((current) => ({ ...current, dataUltimoProtocolo: value }))} />
              <Field label="Link do documento" value={draft.linkDocumento} onChange={(value) => setDraft((current) => ({ ...current, linkDocumento: value }))} />
              <Field label="Nome do documento" value={draft.nomeDocumento} onChange={(value) => setDraft((current) => ({ ...current, nomeDocumento: value }))} />
              <label className="form-field form-field--full">
                <span>Registrar nova alteração no histórico</span>
                <textarea
                  rows={3}
                  value={newHistoryEntry}
                  onChange={(event) => setNewHistoryEntry(event.target.value)}
                  placeholder="Descreva a mudança de andamento, o protocolo ou a correção realizada."
                />
              </label>
              <label className="form-field form-field--full">
                <span>Observações</span>
                <textarea
                  rows={5}
                  value={draft.observacoes}
                  onChange={(event) => setDraft((current) => ({ ...current, observacoes: event.target.value }))}
                  placeholder="Anotações livres, estratégia processual e pendências complementares."
                />
              </label>
            </div>

            <div className="record-form__actions process-detail-actions">
              <button type="submit" className="primary-button" disabled={!canWrite || submitting || !localEnabled}>
                <Save size={17} aria-hidden="true"/> {submitting ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDraft((current) => ({ ...current, andamentoAtual: 'Corrigir' }))}
              >
                Marcar para correção
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDraft((current) => ({ ...current, andamentoAtual: 'Produtividade' }))}
              >
                Marcar como produtividade
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDraft((current) => ({ ...current, andamentoAtual: 'Protocolar' }))}
              >
                Registrar protocolo
              </button>
            </div>

            {feedback.message ? (
              <div className={`form-feedback${feedback.type === 'error' ? ' form-feedback--error' : ' form-feedback--success'}`}>
                {feedback.message}
              </div>
            ) : null}
          </form>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <h4 className="process-icon-text"><History size={18} aria-hidden="true"/> Histórico de alterações</h4>
            <span>{draft.historico.length} registro(s)</span>
          </div>
          <div className="process-history-list">
            {draft.historico.length ? (
              draft.historico.map((item) => (
                <div key={item.id} className="process-history-item">
                  <div className="process-history-item__top">
                    <StatusChip value={item.status} />
                    <small>{formatDayMonth(item.data)}</small>
                  </div>
                  <p>{item.descricao}</p>
                </div>
              ))
            ) : (
              <div className="empty-state">Nenhuma movimentação registrada até o momento.</div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

function createProcessDraft(processo, demandas) {
  return {
    parte: processo.parte ?? '',
    assunto: processo.assunto ?? '',
    orgao: processo.orgao ?? '',
    fase: processo.fase ?? '',
    prioridade: processo.prioridade ?? '',
    prazo: processo.prazo ?? '',
    dataUltimoProtocolo: processo.dataUltimoProtocolo ?? '',
    andamentoAtual: processo.andamentoAtual ?? 'Fazer',
    observacoes: processo.observacoes ?? '',
    linkDocumento: processo.linkDocumento ?? '',
    nomeDocumento: processo.nomeDocumento ?? '',
    tags: buildTagAssignmentValue(processo.tags),
    historico: Array.isArray(processo.historico) ? processo.historico : [],
    prazos: Array.isArray(demandas) ? demandas : [],
  }
}

function updateDraftDemanda(index, field, value, setDraft) {
  setDraft((current) => ({
    ...current,
    prazos: current.prazos.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )),
  }))
}

function removeDraftDemanda(index, setDraft) {
  setDraft((current) => ({
    ...current,
    prazos: current.prazos.filter((_, itemIndex) => itemIndex !== index),
  }))
}

function addDraftDemanda(setDraft, draft, currentUser) {
  setDraft((current) => ({
    ...current,
    prazos: [
      ...current.prazos,
      {
        id: `prazo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        documentId: '',
        item: '',
        parte: draft.parte ?? '',
        vencimento: draft.prazo ?? '',
        status: 'Planejado',
        origem: 'Cadastro de prazo',
        responsavel: currentUser?.displayName ?? '',
        observacoes: '',
        nomeDocumento: '',
        linkPeticao: '',
      },
    ],
  }))
}

function Field({ label, value, onChange }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function StatusChip({ value }) {
  return <span className={`process-status-chip process-status-chip--${getProcessoStatusTone(value)}`}>{value}</span>
}

function TagChip({ tag }) {
  return (
    <span className="process-tag-chip" style={{ '--tag-color': tag.color ?? '#2563eb' }}>
      {tag.name}
    </span>
  )
}
