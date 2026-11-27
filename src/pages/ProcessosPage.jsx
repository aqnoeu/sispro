import { useMemo, useState } from 'react'
import { FolderOpen, Pencil, Save, Plus, Trash2 } from 'lucide-react'
import { ProcessDialog } from '../components/ui/ProcessDialog'
import { useSearchParams } from 'react-router-dom'
import { CollectionStatus } from '../components/ui/CollectionStatus'
import { useAuth } from '../contexts/useAuth'
import { processos as fallbackProcessos, prazos as fallbackPrazos } from '../data/mockData'
import {
  createCollectionDocument,
  deleteCollectionDocument,
  updateCollectionDocument,
} from '../services/local/localCrud'
import { hasLocalDatabase } from '../services/local/client'
import { useCollectionData } from '../services/local/useCollectionData'
import { buildUserAccessContext, canAccessOwnedRow } from '../utils/accessScope'
import { compareByDateDesc, formatDateLabel, formatDayMonth } from '../utils/dates'
import {
  buildProcessoStats,
  filterProcessos,
  getProcessoStatusTone,
  PROCESSO_STATUS_OPTIONS,
} from '../utils/processos'

const PROCESSO_PRIORIDADES = ['Crítica', 'Alta', 'Média', 'Baixa']
const PRAZO_STATUS_OPTIONS = ['Planejado', 'Em andamento', 'Protocolado', 'Concluído', 'Suspenso']
const PROCESSO_EMPTY_FORM = {
  numero: '',
  assunto: '',
  orgao: '',
  fase: '',
  prioridade: 'Alta',
  prazo: '',
  parte: '',
  dataUltimoProtocolo: '',
  andamentoAtual: 'Fazer',
  linkDocumento: '',
  nomeDocumento: '',
  observacoes: '',
}

export function ProcessosPage() {
  const { currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  const isAdmin = currentUser?.isAdmin
  const localEnabled = hasLocalDatabase()
  const prefilledPrazo = searchParams.get('prazo') ?? ''
  const scopedClientFilter = useMemo(
    () => (isAdmin ? null : (item) => canAccessOwnedRow(item, currentUser)),
    [currentUser, isAdmin],
  )
  const processosCollection = useCollectionData({
    collectionName: 'processos',
    fallbackData: fallbackProcessos,
    orderByField: 'parte',
    clientFilter: scopedClientFilter,
  })
  const prazosCollection = useCollectionData({
    collectionName: 'prazos',
    fallbackData: fallbackPrazos,
    clientFilter: scopedClientFilter,
  })

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    prioridade: '',
    orgao: '',
    onlyCurrentMonth: false,
  })
  const [processForm, setProcessForm] = useState({
    ...PROCESSO_EMPTY_FORM,
    prazo: prefilledPrazo,
  })
  const [showCadastroModal, setShowCadastroModal] = useState(false)
  const [selectedProcessNumero, setSelectedProcessNumero] = useState('')
  const [editingSelectedProcess, setEditingSelectedProcess] = useState(false)
  const [editTab, setEditTab] = useState('geral')
  const [selectedProcessDraft, setSelectedProcessDraft] = useState({ orgao: '', prazos: [] })
  const [processFeedback, setProcessFeedback] = useState({ type: '', message: '' })
  const [selectedProcessFeedback, setSelectedProcessFeedback] = useState({ type: '', message: '' })
  const [submittingProcess, setSubmittingProcess] = useState(false)
  const [savingSelectedProcess, setSavingSelectedProcess] = useState(false)

  const filteredProcessos = useMemo(
    () => filterProcessos(processosCollection.rows, filters, []),
    [filters, processosCollection.rows],
  )
  const processoStats = useMemo(
    () => buildProcessoStats(filteredProcessos),
    [filteredProcessos],
  )
  const orgaos = useMemo(
    () => [...new Set(processosCollection.rows.map((item) => item.orgao).filter(Boolean))],
    [processosCollection.rows],
  )
  const selectedProcess = useMemo(
    () => processosCollection.rows.find((item) => item.numero === selectedProcessNumero) ?? null,
    [processosCollection.rows, selectedProcessNumero],
  )
  const selectedProcessDemandas = useMemo(
    () => {
      const prazoRows = prazosCollection.rows
        .filter((item) => (item.processo ?? item.numeroProcesso) === selectedProcessNumero)
      const embeddedRows = Array.isArray(selectedProcess?.prazos)
        ? selectedProcess.prazos.map((item) => ({
            ...item,
            documentId: '',
            anexo: item.nomeDocumento ?? '',
            anexoUrl: item.linkPeticao ?? '',
          }))
        : []
      const mergedRows = [...prazoRows]

      embeddedRows.forEach((embeddedItem) => {
        const exists = prazoRows.some((prazoItem) =>
          String(prazoItem.item ?? '') === String(embeddedItem.item ?? '') &&
          String(prazoItem.vencimento ?? '') === String(embeddedItem.vencimento ?? '') &&
          String(prazoItem.status ?? '') === String(embeddedItem.status ?? ''),
        )

        if (!exists) {
          mergedRows.push(embeddedItem)
        }
      })

      return mergedRows.sort((left, right) => compareByDateDesc(left.vencimento, right.vencimento))
    },
    [prazosCollection.rows, selectedProcess, selectedProcessNumero],
  )

  async function handleProcessSubmit(event) {
    event.preventDefault()
    setSubmittingProcess(true)
    setProcessFeedback({ type: '', message: '' })

    try {
      const accessContext = buildUserAccessContext(currentUser)
      await createCollectionDocument({
        collectionName: 'processos',
        values: {
          ...processForm,
          historico: [
            {
              id: `hist-${Date.now()}`,
              data: processForm.dataUltimoProtocolo || processForm.prazo,
              status: processForm.andamentoAtual,
              descricao: 'Cadastro inicial do processo no monitoramento processual.',
            },
          ],
        },
        additionalValues: accessContext,
      })

      setProcessFeedback({
        type: 'success',
        message: 'Processo cadastrado com sucesso no monitoramento processual.',
      })
      setProcessForm(PROCESSO_EMPTY_FORM)
      setShowCadastroModal(false)
    } catch (error) {
      setProcessFeedback({
        type: 'error',
        message: error.message || 'Não foi possível cadastrar o processo.',
      })
    } finally {
      setSubmittingProcess(false)
    }
  }

  function closeSelectedProcessModal() {
    setSelectedProcessNumero('')
    setEditingSelectedProcess(false)
    setSelectedProcessDraft({ orgao: '', prazos: [] })
    setSelectedProcessFeedback({ type: '', message: '' })
  }

  function handleStartEditSelectedProcess() {
    if (!selectedProcess) {
      return
    }

    setEditTab('geral')
    setEditingSelectedProcess(true)
    setSelectedProcessDraft({
      observacoes: selectedProcess.observacoes ?? '',
      orgao: selectedProcess.orgao ?? '',
      prazos: selectedProcessDemandas.map((item) => ({
        id: item.id ?? item.documentId ?? `prazo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        documentId: item.documentId ?? '',
        item: item.item ?? 'Prazo processual',
        vencimento: item.vencimento ?? '',
        status: item.status ?? 'Planejado',
        parte: item.parte ?? selectedProcess.parte ?? '',
        responsavel: item.responsavel ?? currentUser?.displayName ?? '',
        origem: item.origem ?? 'Cadastro de prazo',
        nomeDocumento: item.nomeDocumento ?? item.anexo ?? '',
        linkPeticao: item.linkPeticao ?? item.anexoUrl ?? '',
        observacoes: item.observacoes ?? '',
      })),
    })
    setSelectedProcessFeedback({ type: '', message: '' })
  }

  function handleCancelEditSelectedProcess() {
    setEditingSelectedProcess(false)
    setSelectedProcessDraft({ orgao: '', prazos: [] })
    setSelectedProcessFeedback({ type: '', message: '' })
  }

  function updateSelectedProcessPrazo(index, field, value) {
    setSelectedProcessDraft((current) => ({
      ...current,
      prazos: current.prazos.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }))
    setSelectedProcessFeedback({ type: '', message: '' })
  }

  function handleAddSelectedProcessPrazo() {
    setSelectedProcessDraft((current) => ({
      ...current,
      prazos: [
        ...current.prazos,
        {
          id: `prazo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          documentId: '',
          item: '',
          vencimento: selectedProcess?.prazo ?? '',
          status: 'Planejado',
          parte: selectedProcess?.parte ?? '',
          responsavel: currentUser?.displayName ?? '',
          origem: 'Cadastro de prazo',
          nomeDocumento: '',
          linkPeticao: '',
          observacoes: '',
        },
      ],
    }))
  }

  function handleRemoveSelectedProcessPrazo(index) {
    setSelectedProcessDraft((current) => ({
      ...current,
      prazos: current.prazos.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handleSaveSelectedProcess() {
    if (!selectedProcess?.documentId) {
      setSelectedProcessFeedback({ type: 'error', message: 'Processo não localizado para edição.' })
      return
    }

    const invalidPrazo = selectedProcessDraft.prazos.find(
      (item) => !String(item.item ?? '').trim() || !String(item.vencimento ?? '').trim(),
    )

    if (invalidPrazo) {
      setEditTab('demandas')
      setSelectedProcessFeedback({ type: 'error', message: 'Todos os prazos precisam ter descrição e vencimento.' })
      return
    }

    setSavingSelectedProcess(true)
    setSelectedProcessFeedback({ type: '', message: '' })

    try {
      const accessContext = buildUserAccessContext(currentUser)
      const normalizedPrazos = selectedProcessDraft.prazos.map((item) => ({
        ...item,
        item: String(item.item ?? '').trim(),
        vencimento: String(item.vencimento ?? '').trim(),
        status: String(item.status ?? '').trim() || 'Planejado',
        parte: String(item.parte ?? '').trim() || selectedProcess.parte,
        responsavel: String(item.responsavel ?? '').trim() || (currentUser?.displayName ?? ''),
        origem: String(item.origem ?? '').trim() || 'Cadastro de prazo',
        nomeDocumento: String(item.nomeDocumento ?? '').trim(),
        linkPeticao: String(item.linkPeticao ?? '').trim(),
        observacoes: String(item.observacoes ?? '').trim(),
      }))

      const deletedPrazos = selectedProcessDemandas.filter(
        (item) => item.documentId && !normalizedPrazos.some((draftItem) => draftItem.documentId === item.documentId),
      )

      await Promise.all(
        deletedPrazos.map((item) => deleteCollectionDocument({
          collectionName: 'prazos',
          documentId: item.documentId,
        })),
      )

      await Promise.all(
        normalizedPrazos
          .filter((item) => item.documentId)
          .map((item) => updateCollectionDocument({
            collectionName: 'prazos',
            documentId: item.documentId,
            values: {
              processo: selectedProcess.numero,
              numeroProcesso: selectedProcess.numero,
              orgao: selectedProcessDraft.orgao,
              item: item.item,
              vencimento: item.vencimento,
              status: item.status,
              parte: item.parte,
              responsavel: item.responsavel,
              origem: item.origem,
              anexo: item.nomeDocumento,
              anexoUrl: item.linkPeticao,
              observacoes: item.observacoes,
            },
          })),
      )

      await Promise.all(
        normalizedPrazos
          .filter((item) => !item.documentId)
          .map((item) => createCollectionDocument({
            collectionName: 'prazos',
            values: {
              processo: selectedProcess.numero,
              numeroProcesso: selectedProcess.numero,
              orgao: selectedProcessDraft.orgao,
              item: item.item,
              vencimento: item.vencimento,
              status: item.status,
              parte: item.parte,
              responsavel: item.responsavel,
              origem: item.origem,
              anexo: item.nomeDocumento,
              anexoUrl: item.linkPeticao,
              observacoes: item.observacoes,
            },
            additionalValues: accessContext,
          })),
      )

      const nextPrimaryPrazo = normalizedPrazos
        .map((item) => item.vencimento)
        .filter(Boolean)
        .sort((left, right) => compareByDateDesc(right, left))[0] ?? selectedProcess.prazo

      await updateCollectionDocument({
        collectionName: 'processos',
        documentId: selectedProcess.documentId,
        values: {
          orgao: selectedProcessDraft.orgao,
          observacoes: selectedProcessDraft.observacoes ?? '',
          prazo: nextPrimaryPrazo,
          prazos: normalizedPrazos.map((item) => ({
            id: item.id,
            item: item.item,
            vencimento: item.vencimento,
            status: item.status,
            parte: item.parte,
            responsavel: item.responsavel,
            origem: item.origem,
            nomeDocumento: item.nomeDocumento,
            linkPeticao: item.linkPeticao,
            observacoes: item.observacoes,
          })),
        },
      })

      setEditingSelectedProcess(false)
      setSelectedProcessFeedback({ type: 'success', message: 'Processo atualizado com sucesso.' })
    } catch (error) {
      setSelectedProcessFeedback({ type: 'error', message: error.message || 'Falha ao salvar alterações do processo.' })
    } finally {
      setSavingSelectedProcess(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="processos-hero">
        <div className="processos-hero__content">
          <span className="processos-hero__eyebrow">Processos judiciais</span>
          <h3>Monitoramento processual e prioridades</h3>
          <p>
            Esta página exibe os processos vinculados ao ambiente do usuário autenticado, com foco em
            acompanhamento estratégico e priorização operacional.
          </p>
        </div>

        <div className="processos-hero__actions">
          <button
            type="button"
            className="primary-button processos-hero__primary"
            onClick={() => {
              setProcessFeedback({ type: '', message: '' })
              setShowCadastroModal(true)
            }}
          >
            Cadastrar Processo
          </button>
        </div>
      </section>

      {processosCollection.loading || processosCollection.error ? (
        <CollectionStatus
          loading={processosCollection.loading}
          error={processosCollection.error}
          source={processosCollection.source}
          empty={!processosCollection.rows.length}
          label="processos"
        />
      ) : null}

      {!localEnabled ? (
        <div className="collection-status">
          O ambiente atual está em modo local. A interface de processos está pronta, mas cadastros e edições exigem configuração do armazenamento local.
        </div>
      ) : null}

      <section className="processos-kpis">
        <IndicatorCard label="Processos no mês" value={processoStats.month} tone="blue" />
        <IndicatorCard label="Processos a fazer" value={processoStats.fazer} tone="gold" />
        <IndicatorCard label="Processos para corrigir" value={processoStats.corrigir} tone="danger" />
        <IndicatorCard label="Processos para protocolar" value={processoStats.protocolar} tone="green" />
      </section>

      <section id="pesquisa-processos" className="processos-search-card">
        <div className="panel-card__header">
          <h4>Pesquisa e filtros</h4>
          <span>Busca por CNJ, parte, assunto, órgão e status</span>
        </div>

        <div className="processos-filters">
          <label className="form-field">
            <span>Pesquisar processo</span>
            <input
              type="text"
              placeholder="Número CNJ, parte, assunto ou órgão"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </label>

          <label className="form-field">
            <span>Andamento</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">Todos</option>
              {PROCESSO_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Prioridade</span>
            <select
              value={filters.prioridade}
              onChange={(event) => setFilters((current) => ({ ...current, prioridade: event.target.value }))}
            >
              <option value="">Todas</option>
              {PROCESSO_PRIORIDADES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Órgão</span>
            <select
              value={filters.orgao}
              onChange={(event) => setFilters((current) => ({ ...current, orgao: event.target.value }))}
            >
              <option value="">Todos</option>
              {orgaos.map((orgao) => (
                <option key={orgao} value={orgao}>
                  {orgao}
                </option>
              ))}
            </select>
          </label>

          <label className="processos-checkbox">
            <input
              type="checkbox"
              checked={filters.onlyCurrentMonth}
              onChange={(event) => setFilters((current) => ({ ...current, onlyCurrentMonth: event.target.checked }))}
            />
            <span>Mostrar apenas processos do mês</span>
          </label>
        </div>
      </section>

      <section className="processos-layout">
        <div className="processos-main">
          <section className="panel-card">
            <div className="panel-card__header">
              <h4>Lista de processos</h4>
              <span>{filteredProcessos.length} registro(s) encontrados</span>
            </div>

            <div className="processos-list">
              {filteredProcessos.length ? (
                filteredProcessos.map((processo) => (
                  <button
                    key={processo.id ?? processo.numero}
                    type="button"
                    className="processo-row processo-row--static"
                    onClick={() => setSelectedProcessNumero(processo.numero)}
                  >
                    <div className="processo-row__identity">
                      <span className="processo-row__eyebrow">Processo</span>
                      <strong>{processo.numero}</strong>
                      <p>{processo.parte}</p>
                    </div>

                    <div className="processo-row__summary processo-row__summary--stacked">
                      <div>
                        <span className="processo-row__label">Órgão</span>
                        <strong>{processo.orgao || 'Órgão não informado'}</strong>
                      </div>
                      <div>
                        <span className="processo-row__label">Última atuação</span>
                        <strong>{processo.nomeDocumento || 'Primeiro Protocolo'}</strong>
                      </div>
                    </div>

                    <div className="processo-row__spacer" aria-hidden="true" />

                    <div className="processo-row__actions">
                      <div className="processo-row__badge-group">
                        <span className="processo-row__micro-label">Ação</span>
                        <StatusChip value={processo.andamentoAtual} />
                      </div>

                      <div className="processo-row__badge-group">
                        <span className="processo-row__micro-label">Prazo</span>
                        <span className="processo-row__date-chip">{formatDayMonth(processo.prazo)}</span>
                      </div>

                    </div>

                    <div className="processo-row__ornament" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </div>
                  </button>
                ))
              ) : (
                <div className="empty-state">Nenhum processo encontrado para os filtros atuais.</div>
              )}
            </div>
          </section>
        </div>
      </section>

      {showCadastroModal ? (
        <div className="auth-modal-backdrop">
          <section className="auth-modal processos-modal">
            <div className="panel-card__header">
              <h4>Cadastrar processo</h4>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowCadastroModal(false)
                  setProcessFeedback({ type: '', message: '' })
                }}
              >
                Fechar
              </button>
            </div>

            <form className="record-form" onSubmit={handleProcessSubmit}>
              <div className="record-form__grid">
                <TextField label="Número CNJ" value={processForm.numero} onChange={(value) => setProcessForm((current) => ({ ...current, numero: value }))} required />
                <TextField label="Nome da parte" value={processForm.parte} onChange={(value) => setProcessForm((current) => ({ ...current, parte: value }))} required />
                <TextField label="Assunto" value={processForm.assunto} onChange={(value) => setProcessForm((current) => ({ ...current, assunto: value }))} required />
                <TextField label="Órgão" value={processForm.orgao} onChange={(value) => setProcessForm((current) => ({ ...current, orgao: value }))} required />
                <TextField label="Fase" value={processForm.fase} onChange={(value) => setProcessForm((current) => ({ ...current, fase: value }))} required />
                <SelectField label="Prioridade" value={processForm.prioridade} options={PROCESSO_PRIORIDADES} onChange={(value) => setProcessForm((current) => ({ ...current, prioridade: value }))} />
                <SelectField label="Andamento atual" value={processForm.andamentoAtual} options={PROCESSO_STATUS_OPTIONS} onChange={(value) => setProcessForm((current) => ({ ...current, andamentoAtual: value }))} />
                <TextField label="Próximo prazo" value={processForm.prazo} onChange={(value) => setProcessForm((current) => ({ ...current, prazo: value }))} placeholder="25/03/2026" required />
                <TextField label="Data do último protocolo" value={processForm.dataUltimoProtocolo} onChange={(value) => setProcessForm((current) => ({ ...current, dataUltimoProtocolo: value }))} placeholder="21/03/2026" required />
                <TextField label="Link do documento" value={processForm.linkDocumento} onChange={(value) => setProcessForm((current) => ({ ...current, linkDocumento: value }))} placeholder="https://..." />
                <TextField label="Nome do documento" value={processForm.nomeDocumento} onChange={(value) => setProcessForm((current) => ({ ...current, nomeDocumento: value }))} placeholder="peticao-final.pdf" />
                <label className="form-field form-field--full">
                  <span>Observações</span>
                  <textarea
                    rows={4}
                    value={processForm.observacoes}
                    onChange={(event) => setProcessForm((current) => ({ ...current, observacoes: event.target.value }))}
                    placeholder="Anotações complementares, estratégia processual e detalhes operacionais."
                  />
                </label>
              </div>

              <div className="record-form__actions">
                <button type="submit" className="primary-button" disabled={submittingProcess || !localEnabled}>
                  {submittingProcess ? 'Salvando...' : 'Salvar processo'}
                </button>
              </div>

              {processFeedback.message ? (
                <div className={`form-feedback${processFeedback.type === 'error' ? ' form-feedback--error' : ' form-feedback--success'}`}>
                  {processFeedback.message}
                </div>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}

      {selectedProcess ? (
        <ProcessDialog editing={editingSelectedProcess} saving={savingSelectedProcess} onClose={closeSelectedProcessModal}
          title={selectedProcess.numero} icon={<FolderOpen size={24} aria-hidden="true"/>}
          footer={editingSelectedProcess ? <>
            <button type="button" className="secondary-button" onClick={handleCancelEditSelectedProcess} disabled={savingSelectedProcess}>Cancelar</button>
            <button type="button" className="primary-button" onClick={handleSaveSelectedProcess} disabled={savingSelectedProcess || !localEnabled}><Save size={17} aria-hidden="true"/>{savingSelectedProcess ? 'Salvando...' : 'Salvar alterações'}</button>
          </> : <>
            <button type="button" className="secondary-button" onClick={closeSelectedProcessModal}>Fechar</button>
            <button type="button" className="primary-button" onClick={handleStartEditSelectedProcess} disabled={!localEnabled}><Pencil size={17} aria-hidden="true"/>Editar processo</button>
          </>}
          tabs={editingSelectedProcess ? <div className="process-dialog-tabs" role="group" aria-label="Seções de edição">{[['geral','Dados gerais'],['demandas','Demandas e prazos'],['obs','Observações']].map(([id,label])=><button key={id} type="button" aria-pressed={editTab===id} onClick={()=>setEditTab(id)}>{label}</button>)}</div> : null}
          feedback={selectedProcessFeedback.message ? <div role={selectedProcessFeedback.type==='error'?'alert':'status'} className={`form-feedback form-feedback--${selectedProcessFeedback.type}`}>{selectedProcessFeedback.message}</div> : null}>
          {(!editingSelectedProcess || editTab==='geral') && <section className="process-modal__section process-dialog-summary">
            <div className="process-dialog-fields">
              <div><span>Parte</span><strong>{selectedProcess.parte || 'Não informada'}</strong></div>
              <div>{editingSelectedProcess ? <TextField label="Órgão" value={selectedProcessDraft.orgao} onChange={value=>setSelectedProcessDraft(current=>({...current,orgao:value}))}/> : <><span>Órgão</span><strong>{selectedProcess.orgao || 'Não informado'}</strong></>}</div>
            </div>
            <div className="process-dialog-tags"><span>Tags</span>{Array.isArray(selectedProcess.tags) && selectedProcess.tags.length ? <div>{selectedProcess.tags.map((tag,index)=><span className="process-dialog-tag" key={index}>{typeof tag==='string'?tag:tag?.label || tag?.nome || 'Tag'}</span>)}</div> : <p>Nenhuma tag cadastrada.</p>}</div>
          </section>}
          {(!editingSelectedProcess || editTab==='demandas') && (
              <section className="process-modal__section">
                <div className="panel-card__header">
                  <h4>Demandas e prazos</h4>
                  <span>{editingSelectedProcess ? selectedProcessDraft.prazos.length : selectedProcessDemandas.length} registro(s)</span>
                </div>
                <div className="process-demand-list">
                  {(editingSelectedProcess ? selectedProcessDraft.prazos : selectedProcessDemandas).length ? (
                    (editingSelectedProcess ? selectedProcessDraft.prazos : selectedProcessDemandas).map((item, index) => (
                      <div key={item.id ?? item.documentId ?? `prazo-${index}`} className="process-demand-item">
                        <div className="process-demand-item__top">
                          <strong>{item.item ?? 'Prazo processual'}</strong>
                          <StatusChip value={item.status ?? 'Planejado'} />
                        </div>
                        <div className="process-demand-item__meta">
                          <span>Vencimento: {formatDateLabel(item.vencimento)}</span>
                          <span>Parte: {item.parte ?? selectedProcess.parte}</span>
                          <span>Responsável: {item.responsavel ?? 'Não informado'}</span>
                        </div>
                        {editingSelectedProcess ? (
                          <>
                            <div className="record-form__grid">
                              <TextField label="Descrição" value={item.item ?? ''} onChange={(value) => updateSelectedProcessPrazo(index, 'item', value)} required />
                              <TextField label="Vencimento" value={item.vencimento ?? ''} onChange={(value) => updateSelectedProcessPrazo(index, 'vencimento', value)} placeholder="25/03/2026" required />
                              <TextField label="Parte" value={item.parte ?? ''} onChange={(value) => updateSelectedProcessPrazo(index, 'parte', value)} />
                              <TextField label="Responsável" value={item.responsavel ?? ''} onChange={(value) => updateSelectedProcessPrazo(index, 'responsavel', value)} />
                              <SelectField label="Status" value={item.status ?? 'Planejado'} options={PRAZO_STATUS_OPTIONS} onChange={(value) => updateSelectedProcessPrazo(index, 'status', value)} />
                              <TextField label="Origem" value={item.origem ?? ''} onChange={(value) => updateSelectedProcessPrazo(index, 'origem', value)} />
                              <TextField label="Nome do documento" value={item.nomeDocumento ?? item.anexo ?? ''} onChange={(value) => updateSelectedProcessPrazo(index, 'nomeDocumento', value)} />
                              <TextField label="Link da petição" value={item.linkPeticao ?? item.anexoUrl ?? ''} onChange={(value) => updateSelectedProcessPrazo(index, 'linkPeticao', value)} placeholder="https://..." />
                              <label className="form-field form-field--full">
                                <span>Observações</span>
                                <textarea
                                  rows={3}
                                  value={item.observacoes ?? ''}
                                  onChange={(event) => updateSelectedProcessPrazo(index, 'observacoes', event.target.value)}
                                />
                              </label>
                            </div>
                            <div className="record-form__actions">
                              <button
                                type="button"
                                className="secondary-button secondary-button--danger"
                                onClick={() => handleRemoveSelectedProcessPrazo(index)}
                                disabled={savingSelectedProcess || !localEnabled}
                              >
                                <Trash2 size={16} aria-hidden="true"/> Excluir prazo
                              </button>
                            </div>
                          </>
                        ) : item.anexoUrl ? (
                          <a className="table-link" href={item.anexoUrl} target="_blank" rel="noreferrer">
                            {item.anexo || 'Abrir petição'}
                          </a>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">Nenhuma demanda vinculada a este processo.</div>
                  )}
                </div>
                {editingSelectedProcess ? (
                  <div className="record-form__actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleAddSelectedProcessPrazo}
                      disabled={savingSelectedProcess || !localEnabled}
                    >
                      <Plus size={17} aria-hidden="true"/> Adicionar novo prazo
                    </button>
                  </div>
                ) : null}
              </section>

          )}
          {(!editingSelectedProcess || editTab==='obs') && <section className="process-modal__section process-modal__section--observacoes">
            <div className="panel-card__header"><h4>Observações</h4></div>
            {editingSelectedProcess ? <label className="form-field"><span>Observações do processo</span><textarea rows={6} value={selectedProcessDraft.observacoes ?? ''} onChange={event=>setSelectedProcessDraft(current=>({...current,observacoes:event.target.value}))}/></label> : <p>{selectedProcess.observacoes || 'Sem observações registradas para este processo.'}</p>}
          </section>}
        </ProcessDialog>
      ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function IndicatorCard({ label, value, tone }) {
  return (
    <article className={`processos-kpi processos-kpi--${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  )
}

function StatusChip({ value }) {
  return <span className={`process-status-chip process-status-chip--${getProcessoStatusTone(value)}`}>{value}</span>
}

function TextField({ label, value, onChange, placeholder = '', required = false }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
