import { canAccess } from '../utils/mechanicAccess.js'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { doc, onSnapshot } from '../services/local/database'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'
import { pareceresJurisprudencia, precedentes, referenciasJuridicas, tesesJuridicas } from '../data/mockData'
import { getLocalServices, hasLocalDatabase } from '../services/local/client'
import {
  canDeleteJurisprudenciaRecord,
  deleteJurisprudenciaRecord,
  registerJurisprudenciaView,
  resolveJurisprudenciaCollection,
  resolveJurisprudenciaTipoFromRoute,
} from '../services/local/jurisprudencia'

const fallbackRowsByTipo = {
  precedente: precedentes,
  parecer: pareceresJurisprudencia,
  tese: tesesJuridicas,
  referencia: referenciasJuridicas,
}

export function JurisprudenciaDetailPage() {
  const { tab, documentId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(hasLocalDatabase())
  const [error, setError] = useState('')
  const [showOriginalVersion, setShowOriginalVersion] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const tipo = resolveJurisprudenciaTipoFromRoute(tab)
  const collectionName = resolveJurisprudenciaCollection(tipo)

  const fallbackRecord = useMemo(() => {
    const rows = fallbackRowsByTipo[tipo] ?? []
    return rows.find((item) => item.id === documentId || item.documentId === documentId) ?? null
  }, [documentId, tipo])

  useEffect(() => {
    if (!tipo) {
      setLoading(false)
      return undefined
    }

    if (!hasLocalDatabase()) {
      setRecord(fallbackRecord)
      setLoading(false)
      return undefined
    }

    const { db } = getLocalServices()

    if (!db || !documentId || !collectionName) {
      setRecord(fallbackRecord)
      setLoading(false)
      return undefined
    }

    const unsubscribe = onSnapshot(
      doc(db, collectionName, documentId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setRecord(fallbackRecord)
          setLoading(false)
          return
        }

        setRecord({
          documentId: snapshot.id,
          ...snapshot.data(),
          id: snapshot.data().id ?? snapshot.id,
        })
        setLoading(false)
      },
      (nextError) => {
        setError(nextError.message)
        setRecord(fallbackRecord)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [collectionName, documentId, fallbackRecord, tipo])

  useEffect(() => {
    if (!record || !tipo || !documentId || !canAccess(currentUser,'jurisprudencia',2)) {
      return undefined
    }

    registerJurisprudenciaView({
      tipo,
      documentId,
      currentUser,
    }).catch(() => {})

    return undefined
  }, [currentUser, documentId, record, tipo])

  async function handleDelete() {
    if (!record || !canAccess(currentUser,'jurisprudencia',3) || !canDeleteJurisprudenciaRecord(record, currentUser)) {
      return
    }

    const shouldDelete = window.confirm('Deseja excluir este registro de jurisprudência?')

    if (!shouldDelete) {
      return
    }

    setDeleting(true)

    try {
      await deleteJurisprudenciaRecord({
        tipo,
        documentId: record.documentId ?? record.id,
      })
      navigate('/jurisprudencia')
    } catch (nextError) {
      setError(nextError.message || 'Não foi possível excluir o registro.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="empty-state">Carregando registro...</div>
  }

  if (error) {
    return <div className="empty-state">{error}</div>
  }

  if (!record || !tipo) {
    return <div className="empty-state">Registro não encontrado.</div>
  }

  const viewers = Array.isArray(record.visualizacoes) ? record.visualizacoes : []
  const canDelete = canAccess(currentUser,'jurisprudencia',3) && canDeleteJurisprudenciaRecord(record, currentUser)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Jurisprudência"
        title={`Detalhe de ${labelFromTipo(tipo)}`}
        description="Consulta integral do registro, com autoria, histórico de edição e visualizações do ambiente."
        action={(
          <div className="jurisprudencia-actions">
            <Link className="secondary-button" to="/jurisprudencia">
              Voltar
            </Link>
            {canAccess(currentUser,'jurisprudencia',2)&&<Link
              className="secondary-button"
              to={`/jurisprudencia/cadastro?modo=editar&tipo=${tipo}&id=${record.documentId ?? record.id}`}
            >
              Editar
            </Link>}
            {canDelete ? (
              <button type="button" className="secondary-button secondary-button--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            ) : null}
          </div>
        )}
      />

      <article className="jurisprudencia-detail">
        <div className="jurisprudencia-detail__header">
          <span className="jurisprudencia-card__eyebrow">{capitalizeLabel(tipo)}</span>
          <h3>{record.ementa || 'Ementa não informada'}</h3>
          {record.wasEdited ? (
            <div className="jurisprudencia-edit-note">
              <strong>Registro editado</strong>
              <span>
                Última edição por {record.editedBy || 'Não informado'}
                {record.editedAt ? ` em ${new Date(record.editedAt).toLocaleString('pt-BR')}` : ''}
              </span>
              {record.originalVersion ? (
                <button type="button" className="table-link" onClick={() => setShowOriginalVersion((current) => !current)}>
                  {showOriginalVersion ? 'Ocultar versão original' : 'Versão original'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <dl className="jurisprudencia-detail__grid">
          {renderPrimaryFields(tipo, record)}
          <div>
            <dt>Gabinete responsável</dt>
            <dd>{record.gabinete || 'Não informado'}</dd>
          </div>
          <div>
            <dt>Usuário responsável</dt>
            <dd>{record.createdBy || 'Não informado'}</dd>
          </div>
          <div>
            <dt>Cadastro</dt>
            <dd>{record.createdAt ? new Date(record.createdAt).toLocaleString('pt-BR') : 'Não informado'}</dd>
          </div>
          <div>
            <dt>Link</dt>
            <dd>
              {record.link ? (
                <a className="table-link" href={record.link} target="_blank" rel="noreferrer">
                  Abrir referência
                </a>
              ) : 'Não informado'}
            </dd>
          </div>
        </dl>

        {showOriginalVersion && record.originalVersion ? (
          <section className="jurisprudencia-original-version">
            <span className="jurisprudencia-card__eyebrow">Versão original</span>
            <dl className="jurisprudencia-detail__grid">
              {renderPrimaryFields(tipo, record.originalVersion)}
              <div>
                <dt>Ementa original</dt>
                <dd>{record.originalVersion.ementa || 'Não informada'}</dd>
              </div>
              <div>
                <dt>Link original</dt>
                <dd>{record.originalVersion.link || 'Não informado'}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className="jurisprudencia-viewers">
          <span className="jurisprudencia-card__eyebrow">Visualizações</span>
          {viewers.length ? (
            <div className="jurisprudencia-viewers__list">
              {viewers.map((viewer) => (
                <span key={viewer.uid ?? viewer.nome} className="jurisprudencia-viewer-chip">
                  {viewer.nome || 'Usuário'}
                </span>
              ))}
            </div>
          ) : (
            <p>Nenhuma visualização registrada até o momento.</p>
          )}
        </section>
      </article>
    </div>
  )
}

function renderPrimaryFields(tipo, record) {
  if (tipo === 'precedente') {
    return (
      <>
        <div>
          <dt>Tribunal</dt>
          <dd>{record.tribunal || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Relator</dt>
          <dd>{record.relator || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{record.data || 'Não informada'}</dd>
        </div>
        <div>
          <dt>Ano</dt>
          <dd>{record.ano || 'Não identificado'}</dd>
        </div>
        <div>
          <dt>Caso de referência</dt>
          <dd>{record.casoReferencia || 'Não informado'}</dd>
        </div>
        <div className="jurisprudencia-meta__full">
          <dt>Tese</dt>
          <dd>{record.tese || 'Não identificada'}</dd>
        </div>
        <div>
          <dt>Número do processo</dt>
          <dd>{record.numeroProcesso || 'Não informado'}</dd>
        </div>
      </>
    )
  }

  if (tipo === 'parecer') {
    return (
      <>
        <div>
          <dt>Data de emissão</dt>
          <dd>{record.dataEmissao || 'Não informada'}</dd>
        </div>
        <div>
          <dt>Procurador responsável</dt>
          <dd>{record.procuradorResponsavel || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Processo administrativo</dt>
          <dd>{record.processoAdministrativo || 'Não informado'}</dd>
        </div>
      </>
    )
  }

  if (tipo === 'referencia') {
    return (
      <>
        <div>
          <dt>Número / ano</dt>
          <dd>{record.numeroAno || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Tipo de referência</dt>
          <dd>{record.tipoReferencia || 'Não informado'}</dd>
        </div>
        <div className="jurisprudencia-meta__full">
          <dt>Palavras-chave</dt>
          <dd>{record.palavrasChave || 'Não informadas'}</dd>
        </div>
      </>
    )
  }

  return (
    <>
      <div>
        <dt>Área temática</dt>
        <dd>{record.area || 'Não informada'}</dd>
      </div>
      <div>
        <dt>Vínculos</dt>
        <dd>{record.referencias || 'Não informados'}</dd>
      </div>
    </>
  )
}

function capitalizeLabel(value) {
  const text = String(value ?? '')
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function labelFromTipo(tipo) {
  if (tipo === 'precedente') {
    return 'precedente'
  }

  if (tipo === 'parecer') {
    return 'parecer'
  }

  if (tipo === 'tese') {
    return 'tese'
  }

  if (tipo === 'referencia') {
    return 'referência'
  }

  return 'registro'
}
