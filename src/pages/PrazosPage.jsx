import { canAccess } from '../utils/mechanicAccess.js'
import { WorkflowLabel } from '../components/ui/Labels'
import { WORKFLOW, workflow } from '../utils/labels'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { DataTable } from '../components/ui/DataTable'
import { CollectionStatus } from '../components/ui/CollectionStatus'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAuth } from '../contexts/useAuth'
import { prazos } from '../data/mockData'
import { hasLocalDatabase } from '../services/local/client'
import { createPrazoWithProcessSync } from '../services/local/processoPrazoSync'
import { useCollectionData } from '../services/local/useCollectionData'
import { buildUserAccessContext, canAccessOwnedRow } from '../utils/accessScope'
import { compareByDateDesc, formatDayMonth, isToday } from '../utils/dates'
import { usePageSearch } from './usePageSearch'

const EMPTY_FORM = {
  processo: '',
  parte: '',
  item: '',
  setor: 'Contencioso',
  orgao: '',
  assunto: '',
  fase: '',
  prioridade: 'Média',
  vencimento: '',
  status: 'Planejado',
  andamentoIntimacao: 'Nova intimação',
  observacoes: '',
  anexo: '',
  anexoUrl: '',
}

export function PrazosPage() {
  const { currentUser } = useAuth()
 const canWrite=canAccess(currentUser,'prazos',2)&&canAccess(currentUser,'processos',2)
  const [searchParams] = useSearchParams()
  const isAdmin = currentUser?.isAdmin
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const prefilledVencimento = searchParams.get('vencimento') ?? ''
  const localEnabled = hasLocalDatabase()
  const [formValues, setFormValues] = useState({
    ...EMPTY_FORM,
    vencimento: prefilledVencimento,
  })
  const { rows, loading, error, source } = useCollectionData({
    collectionName: 'prazos',
    fallbackData: prazos,
    orderByField: 'vencimento',
    clientFilter: isAdmin ? null : (item) => canAccessOwnedRow(item, currentUser),
  })
  const [workflowFilter,setWorkflowFilter]=useState('')
  const searchedRows = usePageSearch(rows)
  const filteredRows = searchedRows.filter(row=>!workflowFilter||workflow(row)===workflowFilter)
  const sortedRows = useMemo(
    () => [...filteredRows].sort((left, right) => compareByDateDesc(left.vencimento, right.vencimento)),
    [filteredRows],
  )

  if (!canAccess(currentUser,'prazos')) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if(!canWrite)return
    setSubmitting(true)
    setFeedback({ type: '', message: '' })

    try {
      const accessContext = buildUserAccessContext(currentUser)
      const result = await createPrazoWithProcessSync({
        prazoValues: formValues,
        context: accessContext,
      })

      setFeedback({
        type: 'success',
        message:
          result.processAction === 'created'
            ? 'Prazo salvo e processo criado automaticamente.'
            : 'Prazo salvo e adicionado como nova demanda ao processo existente.',
      })
      setFormValues(EMPTY_FORM)
    } catch (saveError) {
      setFeedback({
        type: 'error',
        message: saveError.message || 'Falha ao salvar o prazo.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Controle de prazos"
        title="Visão rápida do que vence e do que precisa de ação"
        description="Cada prazo agora pode criar o processo automaticamente ou alimentar um processo já existente como nova demanda vinculada."
        action={
          <div className="page-header__actions">
            {canWrite&&<Link className="secondary-button" to="/prazos/lote">
              Cadastro em Lote
            </Link>}
            <button type="button" className="primary-button" disabled={!canWrite} onClick={() => setShowForm((current) => !current)}>
              {showForm ? 'Fechar cadastro' : 'Cadastrar prazo'}
            </button>
          </div>
        }
      />

      <CollectionStatus
        loading={loading}
        error={error}
        source={source}
        empty={!rows.length}
        label="prazos"
      />

      {!localEnabled ? (
        <div className="collection-status">
          O ambiente atual está em modo local. Para gravar prazo e sincronizar com processos, ative o armazenamento local.
        </div>
      ) : null}

      {showForm ? (
        <section id="cadastro-prazos" className="form-panel">
          <div className="form-panel__header">
            <div>
              <h4>Cadastrar prazo</h4>
              <p>Se o processo já existir, o sistema cria apenas uma nova demanda dentro dele. Se não existir, cria o processo e o prazo juntos.</p>
              <small className="form-panel__scope">
                Novo prazo vinculado automaticamente a {currentUser?.displayName ?? 'usuário ativo'}.
              </small>
            </div>
          </div>

          <form className="record-form" onSubmit={handleSubmit}>
            <div className="record-form__grid">
              <Field label="Número do processo" value={formValues.processo} onChange={(value) => setFormValues((current) => ({ ...current, processo: value }))} required />
              <Field label="Parte" value={formValues.parte} onChange={(value) => setFormValues((current) => ({ ...current, parte: value }))} required />
              <Field label="Descrição do prazo" value={formValues.item} onChange={(value) => setFormValues((current) => ({ ...current, item: value }))} required />
              <Field label="Setor" value={formValues.setor} onChange={(value) => setFormValues((current) => ({ ...current, setor: value }))} required />
              <Field label="Órgão" value={formValues.orgao} onChange={(value) => setFormValues((current) => ({ ...current, orgao: value }))} />
              <Field label="Assunto do processo" value={formValues.assunto} onChange={(value) => setFormValues((current) => ({ ...current, assunto: value }))} />
              <Field label="Fase do processo" value={formValues.fase} onChange={(value) => setFormValues((current) => ({ ...current, fase: value }))} />
              <label className="form-field">
                <span>Prioridade</span>
                <select
                  value={formValues.prioridade}
                  onChange={(event) => setFormValues((current) => ({ ...current, prioridade: event.target.value }))}
                >
                  <option value="Crítica">Crítica</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </label>
              <Field label="Vencimento" value={formValues.vencimento} onChange={(value) => setFormValues((current) => ({ ...current, vencimento: value }))} placeholder="Sem vencimento" />
              <label className="form-field">
                <span>Status</span>
                <select
                  value={formValues.status}
                  onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="Hoje">Hoje</option>
                  <option value="A vencer">A vencer</option>
                  <option value="Planejado">Planejado</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </label>
              <label className="form-field"><span>Andamento da intimação</span><select value={formValues.andamentoIntimacao} onChange={e=>setFormValues(c=>({...c,andamentoIntimacao:e.target.value}))}>{WORKFLOW.map(v=><option key={v}>{v}</option>)}</select></label>
              <Field label="Nome da petição" value={formValues.anexo} onChange={(value) => setFormValues((current) => ({ ...current, anexo: value }))} />
              <Field label="Link da petição" value={formValues.anexoUrl} onChange={(value) => setFormValues((current) => ({ ...current, anexoUrl: value }))} />
              <label className="form-field form-field--full">
                <span>Observações</span>
                <textarea
                  rows={4}
                  value={formValues.observacoes}
                  onChange={(event) => setFormValues((current) => ({ ...current, observacoes: event.target.value }))}
                  placeholder="Contexto do prazo, urgência e anotações complementares."
                />
              </label>
            </div>

            <div className="record-form__actions">
              <button type="submit" className="primary-button" disabled={!canWrite || submitting || !localEnabled}>
                {submitting ? 'Salvando...' : 'Salvar prazo'}
              </button>
            </div>

            {feedback.message ? (
              <div className={`form-feedback${feedback.type === 'error' ? ' form-feedback--error' : ' form-feedback--success'}`}>
                {feedback.message}
              </div>
            ) : null}
          </form>
        </section>
      ) : null}

      <label className="form-field"><span>Filtrar andamento da intimação</span><select value={workflowFilter} onChange={e=>setWorkflowFilter(e.target.value)}><option value="">Todos</option>{WORKFLOW.map(v=><option key={v}>{v}</option>)}</select></label>
      <DataTable
        columns={[
          { key: 'id', label: 'Código' },
          {
            key: 'processo',
            label: 'Processo',
            render: (row) => row.processo ?? row.numeroProcesso ?? 'Não informado',
          },
          {
            key: 'parte',
            label: 'Parte',
            render: (row) => row.parte ?? row.item ?? 'Não informada',
          },
          { key: 'item', label: 'Item' },
          { key:'andamentoIntimacao',label:'Andamento',render:row=><WorkflowLabel row={row}/> },
          { key: 'setor', label: 'Setor' },
          { key: 'anexo', label: 'Documento', type: 'link', hrefKey: 'anexoUrl' },
          { key: 'responsavel', label: 'Responsável' },
          {
            key: 'vencimento',
            label: 'Vencimento',
            render: (row) => (
              <span className={`date-chip${isToday(row.vencimento) ? ' date-chip--today' : ''}`}>
                {row.vencimento?formatDayMonth(row.vencimento):'Sem prazo'}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge value={isToday(row.vencimento) ? 'Hoje' : row.status} />,
          },
        ]}
        rows={sortedRows}
        emptyMessage="Nenhum prazo encontrado."
        getRowClassName={(row) => (isToday(row.vencimento) ? 'data-table__row--today' : '')}
      />
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', required = false }) {
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
