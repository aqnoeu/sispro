import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CollectionStatus } from '../components/ui/CollectionStatus'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'
import { pareceresJurisprudencia, precedentes, referenciasJuridicas, tesesJuridicas } from '../data/mockData'
import {
  canDeleteJurisprudenciaRecord,
  deleteJurisprudenciaRecord,
  resolveJurisprudenciaRouteSegment,
} from '../services/local/jurisprudencia'
import { useCollectionData } from '../services/local/useCollectionData'
import { formatDateLabel } from '../utils/dates'
import { rowBelongsToSector } from '../utils/sectorScope'

const tabs = [
  { id: 'precedente', label: 'Precedentes' },
  { id: 'parecer', label: 'Pareceres' },
  { id: 'tese', label: 'Teses' },
  { id: 'referencia', label: 'Referências' },
]

const singularLabelByTipo = {
  precedente: 'Precedente',
  parecer: 'Parecer',
  tese: 'Tese',
  referencia: 'Referência',
}

export function JurisprudenciaPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.isAdmin
  const [activeTab, setActiveTab] = useState('precedente')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOriginalId, setExpandedOriginalId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const scopeFilter = isAdmin ? null : (item) => rowBelongsToSector(item, currentUser?.sectorId)
  const searchTerms = useMemo(() => parseSearchTerms(searchQuery), [searchQuery])

  const precedentesCollection = useCollectionData({
    collectionName: 'precedentes',
    fallbackData: precedentes,
    orderByField: 'createdAtTs',
    orderDirection: 'desc',
    clientFilter: scopeFilter,
  })
  const pareceresCollection = useCollectionData({
    collectionName: 'pareceres_jurisprudencia',
    fallbackData: pareceresJurisprudencia,
    orderByField: 'createdAtTs',
    orderDirection: 'desc',
    clientFilter: scopeFilter,
  })
  const tesesCollection = useCollectionData({
    collectionName: 'teses_juridicas',
    fallbackData: tesesJuridicas,
    orderByField: 'createdAtTs',
    orderDirection: 'desc',
    clientFilter: scopeFilter,
  })
  const referenciasCollection = useCollectionData({
    collectionName: 'referencias_juridicas',
    fallbackData: referenciasJuridicas,
    orderByField: 'createdAtTs',
    orderDirection: 'desc',
    clientFilter: scopeFilter,
  })

  const rowsByTab = useMemo(() => ({
    precedente: [...precedentesCollection.rows].sort((left, right) => (right.dataTs || right.createdAtTs || 0) - (left.dataTs || left.createdAtTs || 0)),
    parecer: [...pareceresCollection.rows].sort((left, right) => (right.dataTs || right.createdAtTs || 0) - (left.dataTs || left.createdAtTs || 0)),
    tese: [...tesesCollection.rows].sort((left, right) => (right.createdAtTs || 0) - (left.createdAtTs || 0)),
    referencia: [...referenciasCollection.rows].sort((left, right) => (right.createdAtTs || 0) - (left.createdAtTs || 0)),
  }), [pareceresCollection.rows, precedentesCollection.rows, referenciasCollection.rows, tesesCollection.rows])

  const filteredRowsByTab = useMemo(() => ({
    precedente: (rowsByTab.precedente ?? []).map((row) => enrichRowWithSearch('precedente', row, searchTerms)).filter((row) => !searchTerms.length || row.matchCount > 0),
    parecer: (rowsByTab.parecer ?? []).map((row) => enrichRowWithSearch('parecer', row, searchTerms)).filter((row) => !searchTerms.length || row.matchCount > 0),
    tese: (rowsByTab.tese ?? []).map((row) => enrichRowWithSearch('tese', row, searchTerms)).filter((row) => !searchTerms.length || row.matchCount > 0),
    referencia: (rowsByTab.referencia ?? []).map((row) => enrichRowWithSearch('referencia', row, searchTerms)).filter((row) => !searchTerms.length || row.matchCount > 0),
  }), [rowsByTab, searchTerms])

  const loading = precedentesCollection.loading || pareceresCollection.loading || tesesCollection.loading || referenciasCollection.loading
  const error = precedentesCollection.error || pareceresCollection.error || tesesCollection.error || referenciasCollection.error
  const source = precedentesCollection.source === 'local' && pareceresCollection.source === 'local' && tesesCollection.source === 'local' && referenciasCollection.source === 'local'
    ? 'local'
    : 'stored'
  const activeRows = filteredRowsByTab[activeTab] ?? []

  async function handleDelete(tipo, row) {
    if (!canDeleteJurisprudenciaRecord(row, currentUser)) {
      return
    }

    const shouldDelete = window.confirm('Deseja excluir este registro de jurisprudência?')

    if (!shouldDelete) {
      return
    }

    setDeletingId(row.documentId ?? row.id)

    try {
      await deleteJurisprudenciaRecord({
        tipo,
        documentId: row.documentId ?? row.id,
      })
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Jurisprudência"
        title="Central de precedentes, pareceres e teses"
        description="Consulta institucional do acervo jurídico, com busca por palavras ou trechos exatos entre aspas, destaque visual dos achados e contagem de correspondências por registro."
        action={(
          <Link className="primary-button" to="/jurisprudencia/cadastro">
            Novo cadastro
          </Link>
        )}
      />

      <CollectionStatus
        loading={loading}
        error={error}
        source={source}
        empty={!rowsByTab.precedente.length && !rowsByTab.parecer.length && !rowsByTab.tese.length && !rowsByTab.referencia.length}
        label="jurisprudência"
      />

      <section className="jurisprudencia-search">
        <label className="search-field jurisprudencia-search__field">
          <span className="search-field__label">Buscar no acervo carregado</span>
          <input
            type="search"
            placeholder='Busque por palavras ou por trecho exato entre aspas, como "fornecimento de medicamento"'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        {searchTerms.length ? (
          <p className="jurisprudencia-search__hint">
            {searchTerms.length === 1 ? '1 critério ativo.' : `${searchTerms.length} critérios ativos.`} Aspas buscam o trecho exato, sem considerar as próprias aspas.
          </p>
        ) : null}
      </section>

      <section className="jurisprudencia-tabs" aria-label="Tipos de registro">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`jurisprudencia-tab${activeTab === tab.id ? ' jurisprudencia-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {searchTerms.length ? ` (${filteredRowsByTab[tab.id]?.length ?? 0})` : ''}
          </button>
        ))}
      </section>

      <section className="jurisprudencia-list">
        {activeRows.length ? activeRows.map((item) => {
          const viewers = Array.isArray(item.visualizacoes) ? item.visualizacoes : []
          const routeSegment = resolveJurisprudenciaRouteSegment(activeTab)
          const rowId = item.documentId ?? item.id
          const canDelete = canDeleteJurisprudenciaRecord(item, currentUser)
          const isExpanded = expandedOriginalId === rowId

          return (
            <article key={rowId} className="jurisprudencia-card">
              <div className="jurisprudencia-card__top">
                <span className="jurisprudencia-card__eyebrow">{singularLabelByTipo[activeTab] ?? 'Registro'}</span>
                <div className="jurisprudencia-card__actions">
                  <button type="button" className="table-link" onClick={() => navigate(`/jurisprudencia/${routeSegment}/${rowId}`)}>
                    Abrir
                  </button>
                  <button type="button" className="table-link" onClick={() => navigate(`/jurisprudencia/cadastro?modo=editar&tipo=${activeTab}&id=${rowId}`)}>
                    Editar
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      className="table-link table-link--danger"
                      onClick={() => handleDelete(activeTab, item)}
                      disabled={deletingId === rowId}
                    >
                      {deletingId === rowId ? 'Excluindo...' : 'Excluir'}
                    </button>
                  ) : null}
                </div>
              </div>

              <h4>{renderHighlightedText(item.ementa || 'Ementa não informada', searchTerms)}</h4>
              {item.tipoRegistro === 'precedente relevante' ? (
                <span className="jurisprudencia-badge">Precedente relevante</span>
              ) : null}
              {searchTerms.length ? (
                <div className="jurisprudencia-match-count">
                  {item.matchCount} {item.matchCount === 1 ? 'correspondência encontrada' : 'correspondências encontradas'}
                </div>
              ) : null}

              <dl className="jurisprudencia-meta">
                {renderCardFields(activeTab, item, searchTerms)}
                <div>
                  <dt>Link</dt>
                  <dd>
                    {item.link ? (
                      <a className="table-link" href={item.link} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                        Abrir
                      </a>
                    ) : 'Não informado'}
                  </dd>
                </div>
              </dl>

              {item.wasEdited ? (
                <div className="jurisprudencia-edit-note">
                  <strong>Registro editado</strong>
                  <span>
                    Última edição por {item.editedBy || 'Não informado'}
                    {item.editedAt ? ` em ${new Date(item.editedAt).toLocaleString('pt-BR')}` : ''}
                  </span>
                  {item.originalVersion ? (
                    <button type="button" className="table-link" onClick={() => setExpandedOriginalId(isExpanded ? '' : rowId)}>
                      {isExpanded ? 'Ocultar versão original' : 'Versão original'}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isExpanded && item.originalVersion ? (
                <div className="jurisprudencia-original-inline">
                  <strong>Versão original</strong>
                  <p>{renderHighlightedText(item.originalVersion.ementa || 'Ementa não informada', searchTerms)}</p>
                </div>
              ) : null}

              <div className="jurisprudencia-viewers">
                <span className="jurisprudencia-card__eyebrow">Já visualizaram</span>
                {viewers.length ? (
                  <div className="jurisprudencia-viewers__list">
                    {viewers.map((viewer) => (
                      <span key={viewer.uid ?? viewer.nome} className="jurisprudencia-viewer-chip">
                        {viewer.nome || 'Usuário'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>Nenhuma visualização registrada.</p>
                )}
              </div>
            </article>
          )
        }) : <div className="empty-state">{searchTerms.length ? 'Nenhum registro corresponde à busca informada.' : 'Nenhum registro cadastrado nesta aba.'}</div>}
      </section>
    </div>
  )
}

function renderCardFields(tipo, item, searchTerms) {
  if (tipo === 'precedente') {
    return (
      <>
        <div>
          <dt>Tribunal</dt>
          <dd>{renderHighlightedText(item.tribunal || 'Não informado', searchTerms)}</dd>
        </div>
        <div>
          <dt>Relator</dt>
          <dd>{renderHighlightedText(item.relator || 'Não informado', searchTerms)}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{renderHighlightedText(item.data || 'Não informada', searchTerms)}</dd>
        </div>
        <div>
          <dt>Ano</dt>
          <dd>{renderHighlightedText(item.ano || 'Não identificado', searchTerms)}</dd>
        </div>
        <div>
          <dt>Caso de referência</dt>
          <dd>{renderHighlightedText(item.casoReferencia || 'Não informado', searchTerms)}</dd>
        </div>
        <div className="jurisprudencia-meta__full">
          <dt>Tese</dt>
          <dd>{renderHighlightedText(item.tese || 'Não identificada', searchTerms)}</dd>
        </div>
      </>
    )
  }

  if (tipo === 'parecer') {
    return (
      <>
        <div>
          <dt>Data de emissão</dt>
          <dd>{renderHighlightedText(item.dataEmissao || 'Não informada', searchTerms)}</dd>
        </div>
        <div>
          <dt>Procurador responsável</dt>
          <dd>{renderHighlightedText(item.procuradorResponsavel || 'Não informado', searchTerms)}</dd>
        </div>
        <div>
          <dt>Processo administrativo</dt>
          <dd>{renderHighlightedText(item.processoAdministrativo || 'Não informado', searchTerms)}</dd>
        </div>
      </>
    )
  }

  if (tipo === 'referencia') {
    return (
      <>
        <div>
          <dt>Número / ano</dt>
          <dd>{renderHighlightedText(item.numeroAno || 'Não informado', searchTerms)}</dd>
        </div>
        <div>
          <dt>Tipo de referência</dt>
          <dd>{renderHighlightedText(item.tipoReferencia || 'Não informado', searchTerms)}</dd>
        </div>
        <div className="jurisprudencia-meta__full">
          <dt>Palavras-chave</dt>
          <dd>{renderHighlightedText(item.palavrasChave || 'Não informadas', searchTerms)}</dd>
        </div>
      </>
    )
  }

  return (
    <>
      <div>
        <dt>Área temática</dt>
        <dd>{renderHighlightedText(item.area || 'Não informada', searchTerms)}</dd>
      </div>
      <div className="jurisprudencia-meta__full">
        <dt>Vínculos</dt>
        <dd>{renderHighlightedText(item.referencias || 'Não informados', searchTerms)}</dd>
      </div>
      <div>
        <dt>Cadastro</dt>
        <dd>{renderHighlightedText(item.createdAt ? formatDateLabel(item.createdAt.slice(0, 10)) : 'Não informado', searchTerms)}</dd>
      </div>
    </>
  )
}

function parseSearchTerms(query) {
  const matches = String(query ?? '').match(/"([^"]+)"|(\S+)/g) ?? []

  return matches
    .map((match) => match.trim().replace(/^"(.*)"$/, '$1').trim())
    .filter(Boolean)
}

function enrichRowWithSearch(tipo, row, searchTerms) {
  const searchableValues = getSearchableValues(tipo, row)
  const matchCount = searchTerms.reduce(
    (total, term) => total + searchableValues.reduce((sum, value) => sum + countOccurrences(value, term), 0),
    0,
  )

  return {
    ...row,
    matchCount,
  }
}

function getSearchableValues(tipo, item) {
  if (tipo === 'precedente') {
    return [item.ementa, item.tribunal, item.relator, item.data, item.ano, item.casoReferencia, item.tese]
  }

  if (tipo === 'parecer') {
    return [item.ementa, item.dataEmissao, item.procuradorResponsavel, item.processoAdministrativo]
  }

  if (tipo === 'referencia') {
    return [item.numeroAno, item.tipoReferencia, item.ementa, item.palavrasChave, item.link]
  }

  return [item.ementa, item.area, item.referencias, item.createdAt]
}

function countOccurrences(value, term) {
  const source = String(value ?? '')
  const needle = String(term ?? '').trim()

  if (!source || !needle) {
    return 0
  }

  const matches = source.match(new RegExp(escapeRegExp(needle), 'gi'))
  return matches?.length ?? 0
}

function renderHighlightedText(text, searchTerms) {
  const source = String(text ?? '')

  if (!source || !searchTerms.length) {
    return source
  }

  const sortedTerms = [...searchTerms].sort((left, right) => right.length - left.length)
  const pattern = new RegExp(`(${sortedTerms.map((term) => escapeRegExp(term)).join('|')})`, 'gi')
  const parts = source.split(pattern)

  return parts.map((part, index) => {
    const isMatch = sortedTerms.some((term) => part.toLowerCase() === term.toLowerCase())

    return isMatch
      ? <mark key={`${part}-${index}`} className="jurisprudencia-highlight">{part}</mark>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>
  })
}

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
