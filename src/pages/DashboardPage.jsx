import { canOpenRoute, canAccess } from '../utils/mechanicAccess.js'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { agenda, precedentes, processos, prazos, setores, usuarios } from '../data/mockData'
import { CollectionStatus } from '../components/ui/CollectionStatus'
import { useAuth } from '../contexts/useAuth'
import { useCollectionData } from '../services/local/useCollectionData'
import { canAccessOwnedRow } from '../utils/accessScope'
import { compareByDateDesc, formatDateLabel, formatDayMonth, toDateKey } from '../utils/dates'
import { getProcessoStatusTone } from '../utils/processos'
import { rowBelongsToSector } from '../utils/sectorScope'
import { usePageSearch } from './usePageSearch'

export function DashboardPage() {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.isAdmin
  const ownedRowsFilter = useMemo(
    () => (isAdmin ? null : (item) => canAccessOwnedRow(item, currentUser)),
    [currentUser, isAdmin],
  )
  const processosCollection = useCollectionData({
    collectionName: 'processos',
    fallbackData: processos,
    orderByField: 'assunto',
    clientFilter: ownedRowsFilter,
  })
  const prazosCollection = useCollectionData({
    collectionName: 'prazos',
    fallbackData: prazos,
    orderByField: 'vencimento',
    clientFilter: ownedRowsFilter,
  })
  const agendaCollection = useCollectionData({
    collectionName: 'agenda',
    fallbackData: agenda,
    orderByField: 'horario',
    clientFilter: ownedRowsFilter,
  })
  const usuariosCollection = useCollectionData({
    collectionName: 'usuarios',
    fallbackData: usuarios,
    orderByField: 'nome',
  })
  const setoresCollection = useCollectionData({
    collectionName: 'setores',
    fallbackData: setores,
    orderByField: 'nome',
  })
  const latestPrecedentCollection = useCollectionData({
    collectionName: 'precedentes',
    fallbackData: precedentes,
    orderByField: 'createdAtTs',
    orderDirection: 'desc',
    limitCount: 1,
    clientFilter: isAdmin ? null : (item) => rowBelongsToSector(item, currentUser?.sectorId),
  })
  const filteredProcessos = usePageSearch(processosCollection.rows)
  const searchedPrazos = usePageSearch(prazosCollection.rows)
  const filteredPrazos = useMemo(
    () => [...searchedPrazos].sort((left, right) => compareByDateDesc(left.vencimento, right.vencimento)),
    [searchedPrazos],
  )
  const filteredAgenda = usePageSearch(agendaCollection.rows)

  const loading =
    processosCollection.loading ||
    prazosCollection.loading ||
    agendaCollection.loading ||
    usuariosCollection.loading ||
    setoresCollection.loading
  const error =
    processosCollection.error ||
    prazosCollection.error ||
    agendaCollection.error ||
    usuariosCollection.error ||
    setoresCollection.error
  const source =
    processosCollection.source === 'local' &&
    prazosCollection.source === 'local' &&
    agendaCollection.source === 'local' &&
    usuariosCollection.source === 'local' &&
    setoresCollection.source === 'local'
      ? 'local'
      : 'remote'

  if (isAdmin) {
    return (
      <AdminDashboard
        currentUser={currentUser}
        usuariosRows={usuariosCollection.rows}
        setoresRows={setoresCollection.rows}
        processosRows={filteredProcessos}
        prazosRows={filteredPrazos}
        agendaRows={filteredAgenda}
        loading={loading}
        error={error}
        source={source}
      />
    )
  }

  return (
    <ProcuradorDashboard
      currentUser={currentUser}
      latestPrecedent={latestPrecedentCollection.rows[0] ?? null}
      filteredProcessos={filteredProcessos}
      filteredPrazos={filteredPrazos}
      filteredAgenda={filteredAgenda}
    />
  )
}

function ProcuradorDashboard({
  currentUser,
  latestPrecedent,
  filteredProcessos,
  filteredPrazos,
  filteredAgenda,
}) {
  const navigate = useNavigate()
  const [showPrecedentNotice, setShowPrecedentNotice] = useState(Boolean(latestPrecedent))
  const [selectedProcessNumero, setSelectedProcessNumero] = useState('')
  const calendarItems = useMemo(
    () => [
      ...filteredPrazos.map((item) => ({
        id: item.id ?? `prazo-${item.item ?? 'sem-id'}`,
        title: item.parte ?? item.item ?? 'Prazo sem descrição',
        subtitle: [item.processo ?? item.numeroProcesso, item.responsavel ?? 'Sem responsável']
          .filter(Boolean)
          .join(' • '),
        type: 'Prazo',
        dateKey: toDateKey(item.vencimento),
        timeLabel: formatDayMonth(item.vencimento),
        processNumero: item.processo ?? item.numeroProcesso ?? '',
      })),
      ...filteredProcessos.map((item) => ({
        id: item.numero ?? `processo-${item.assunto ?? 'sem-id'}`,
        title: item.assunto ?? 'Processo sem assunto',
        subtitle: item.fase ?? 'Fase não informada',
        type: 'Processo',
        dateKey: toDateKey(item.prazo),
        timeLabel: formatDayMonth(item.prazo),
        processNumero: item.numero,
      })),
      ...filteredAgenda.map((item) => ({
        id: item.id ?? `agenda-${item.titulo ?? 'sem-id'}`,
        title: item.titulo ?? 'Evento sem título',
        subtitle: item.local ?? 'Local não informado',
        type: item.tipo ?? 'Agenda',
        dateKey: toDateKey(item.horario),
        timeLabel: formatDayMonth(item.horario),
      })),
    ].filter((item) => item.dateKey),
    [filteredAgenda, filteredPrazos, filteredProcessos],
  )
  const dashboardStats = [
    { label: 'Processos cadastrados', value: String(filteredProcessos.length), trend: 'Acompanhamentos registrados' },
    { label: 'Prazos cadastrados', value: String(filteredPrazos.length), trend: 'Controle atual do setor' },
    {
      label: 'Reuniões cadastradas',
      value: String(filteredAgenda.filter((item) => String(item.tipo ?? '').toLowerCase() === 'reuniao').length),
      trend: 'Compromissos classificados como reunião',
    },
    { label: 'Compromissos totais', value: String(filteredAgenda.length), trend: 'Agenda operacional cadastrada' },
  ]
  const todayKey = getTodayKey()
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)
  const [calendarView, setCalendarView] = useState('month')
  const [visibleMonthDate, setVisibleMonthDate] = useState(getDateFromKey(todayKey))
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const selectedDayItems = calendarItems.filter((item) => item.dateKey === selectedDateKey)
  const selectedDayVisibleItems = useMemo(
    () => selectedDayItems.filter((item) => item.type !== 'Processo'),
    [selectedDayItems],
  )
  const selectedProcess = useMemo(
    () => filteredProcessos.find((item) => item.numero === selectedProcessNumero) ?? null,
    [filteredProcessos, selectedProcessNumero],
  )
  const selectedProcessDemandas = useMemo(
    () => [...filteredPrazos]
      .filter((item) => (item.processo ?? item.numeroProcesso) === selectedProcessNumero)
      .sort((left, right) => compareByDateDesc(left.vencimento, right.vencimento)),
    [filteredPrazos, selectedProcessNumero],
  )
  const selectedDayOperationalItems = useMemo(
    () => [
      ...filteredPrazos
        .filter((item) => toDateKey(item.vencimento) === selectedDateKey)
        .map((item) => ({
          id: item.id ?? item.documentId ?? `prazo-${item.item ?? 'sem-id'}`,
          type: 'Prazo',
          title: item.parte ?? item.item ?? 'Prazo sem descrição',
          subtitle: [item.processo ?? item.numeroProcesso, item.item ?? 'Demanda processual']
            .filter(Boolean)
            .join(' • '),
          timeLabel: formatDayMonth(item.vencimento),
          status: item.status ?? 'Sem status',
        })),
      ...filteredAgenda
        .filter((item) => toDateKey(item.horario) === selectedDateKey)
        .map((item) => ({
          id: item.id ?? `agenda-${item.titulo ?? 'sem-id'}`,
          type: item.tipo ?? 'Agenda',
          title: item.titulo ?? 'Evento sem título',
          subtitle: item.local ?? 'Local não informado',
          timeLabel: formatDayMonth(item.horario),
          status: item.tipo ?? 'Agenda',
        })),
    ],
    [filteredAgenda, filteredPrazos, selectedDateKey],
  )
  const calendarMonth = useMemo(
    () => buildCalendarMonth(visibleMonthDate),
    [visibleMonthDate],
  )
  const selectedDateLabel = formatDateLabel(selectedDateKey)
  const quickActions = buildQuickActions(selectedDateKey).filter(a=>{const root=a.href.split('?')[0].slice(1);return canAccess(currentUser,root,2)&&(root!=='prazos'||canAccess(currentUser,'processos',2))})
  const precedentSummary = truncateText(latestPrecedent?.ementa ?? '', 200)

  useEffect(() => {
    setShowPrecedentNotice(Boolean(latestPrecedent))
  }, [latestPrecedent?.documentId, latestPrecedent?.id])

  useEffect(() => {
    if (!latestPrecedent) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShowPrecedentNotice(false)
    }, 12000)

    return () => window.clearTimeout(timeoutId)
  }, [latestPrecedent?.documentId, latestPrecedent?.id])

  function handleQuickAction(href) {
    if(quickActions.some(a=>a.href===href))navigate(href)
  }

  return (
    <div className="page-stack">
      {latestPrecedent && showPrecedentNotice ? (
        <button
          type="button"
          className="precedent-notice"
          onClick={() => navigate(`/jurisprudencia/precedentes/${latestPrecedent.documentId ?? latestPrecedent.id}`)}
        >
          <div>
            <span className="precedent-notice__eyebrow">Novo precedente favorável</span>
            <strong>{precedentSummary || 'Novo precedente favorável cadastrado'}</strong>
            <small>
              {latestPrecedent.createdAt
                ? new Date(latestPrecedent.createdAt).toLocaleDateString('pt-BR')
                : 'Cadastro recente'}
            </small>
          </div>
          <span className="precedent-notice__cta">Abrir</span>
        </button>
      ) : null}

      <section className="hero-panel">
        <div className="hero-panel__content">
          <span className="hero-panel__eyebrow">Ambiente jurídico setorial</span>
          <h3>Organização de processos, prazos e compromissos com isolamento por setor e por procurador.</h3>
          <p>
            O acesso atual está autenticado para {currentUser?.displayName ?? 'o usuário ativo'}.
            Processos, prazos e agenda permanecem vinculados ao setor
            {` ${currentUser?.sectorName ?? 'autenticado'}`}, sem conexão com os demais ambientes.
          </p>

          <div className="hero-actions">
            {canOpenRoute(currentUser,'/jurisprudencia')&&<Link className="hero-action hero-action--blue" to="/jurisprudencia">
              Jurisprudência
            </Link>}
            {canOpenRoute(currentUser,'/jurisprudencia/cadastro')&&<Link className="hero-action hero-action--green" to="/jurisprudencia/cadastro">
              Novo registro
            </Link>}
            {canOpenRoute(currentUser,'/agenda')&&<Link className="hero-action hero-action--gold" to="/agenda">
              Agenda
            </Link>}
          </div>
        </div>

        <div className="hero-panel__aside">
          <div className="hero-badge">{currentUser?.sectorSigla ?? 'SETOR'}</div>
          <strong>Ambiente setorial</strong>
          <p>{currentUser?.workspace ?? currentUser?.sectorName ?? 'Ambiente privado do procurador autenticado'}.</p>
        </div>
      </section>

      <section className="showcase-grid">
        <article className="schedule-card">
          <div className="panel-card__header">
            <h4>Prazos e reuniões</h4>
            <span>{selectedDateLabel}</span>
          </div>

          <div className="schedule-list">
            {selectedDayOperationalItems.length ? (
              selectedDayOperationalItems.map((item) => (
                <div key={item.id} className="schedule-item">
                  <div className="schedule-item__date">{item.timeLabel}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <span>{item.status}</span>
                </div>
              ))
            ) : (
              <div className="calendar-card__empty">
                Nenhum prazo ou reunião registrado para a data selecionada.
              </div>
            )}
          </div>
        </article>

        <article className="calendar-card">
          <div className="panel-card__header">
            <h4>Agenda institucional</h4>
            <span>{calendarView === 'month' ? calendarMonth.monthLabel : `${selectedDayVisibleItems.length} itens no dia`}</span>
          </div>
          {calendarView === 'month' ? (
            <>
              <div className="calendar-card__toolbar">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setVisibleMonthDate(getShiftedMonthDate(visibleMonthDate, -1))}
                >
                  Mês anterior
                </button>
                <div className="calendar-card__month">{calendarMonth.monthLabel}</div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setVisibleMonthDate(getShiftedMonthDate(visibleMonthDate, 1))}
                >
                  Próximo mês
                </button>
              </div>
              <div className="calendar-grid" role="grid" aria-label={`Calendário de ${calendarMonth.monthLabel}`}>
                {calendarMonth.weekdays.map((day) => (
                  <div key={day} className="calendar-grid__weekday">
                    {day}
                  </div>
                ))}
                {calendarMonth.days.map((day) => {
                  const dayItems = calendarItems.filter((item) => item.dateKey === day.dateKey)
                  const dayTypes = [...new Set(dayItems.map((item) => getTypeTone(item.type)))]
                  const isSelected = day.dateKey === selectedDateKey
                  const isToday = day.dateKey === todayKey

                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      className={`calendar-grid__day${day.isCurrentMonth ? '' : ' calendar-grid__day--muted'}${isSelected ? ' calendar-grid__day--selected' : ''}${isToday ? ' calendar-grid__day--today' : ''}`}
                      onClick={() => {
                        setSelectedDateKey(day.dateKey)
                        setVisibleMonthDate(getDateFromKey(day.dateKey))
                        setCalendarView('day')
                        setShowQuickCreate(false)
                      }}
                    >
                      <span>{day.dayNumber}</span>
                      <div className="calendar-grid__markers">
                        {dayTypes.map((tone) => (
                          <i key={tone} className={`calendar-grid__marker calendar-grid__marker--${tone}`} />
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="calendar-detail calendar-detail--inline">
              <div className="calendar-detail__header">
                <strong>{selectedDateLabel}</strong>
                <small>Visualize os itens do dia, navegue entre datas e inclua novos registros rapidamente.</small>
              </div>

              <div className="calendar-detail__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const previousDate = getRelativeDateKey(selectedDateKey, -1)
                    setSelectedDateKey(previousDate)
                    setVisibleMonthDate(getDateFromKey(previousDate))
                    setShowQuickCreate(false)
                  }}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setCalendarView('month')
                    setShowQuickCreate(false)
                  }}
                >
                  Mês
                </button>
                <button
                  type="button"
                  className={`secondary-button secondary-button--accent${showQuickCreate ? ' secondary-button--active' : ''}`}
                  disabled={!quickActions.length} onClick={() => setShowQuickCreate((current) => !current)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const nextDate = getRelativeDateKey(selectedDateKey, 1)
                    setSelectedDateKey(nextDate)
                    setVisibleMonthDate(getDateFromKey(nextDate))
                    setShowQuickCreate(false)
                  }}
                >
                  &gt;
                </button>
              </div>

              {showQuickCreate ? (
                <div className="calendar-quick-create calendar-quick-create--compact">
                  <div className="calendar-quick-create__header">
                    <strong>Novo cadastro em {selectedDateLabel}</strong>
                  </div>
                  <div className="calendar-quick-create__actions">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        className="calendar-quick-create__button"
                        onClick={() => handleQuickAction(action.href)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="calendar-card__events">
                {selectedDayVisibleItems.length ? (
                  selectedDayVisibleItems.map((item) => (
                    item.type === 'Prazo' && item.processNumero ? (
                      <button
                        key={item.id}
                        type="button"
                        className="calendar-card__event calendar-card__event--button"
                        onClick={() => setSelectedProcessNumero(item.processNumero)}
                      >
                        <div className="calendar-card__event-top">
                          <strong>{item.title}</strong>
                          <span className={`calendar-event-tag calendar-event-tag--${getTypeTone(item.type)}`}>
                            {item.type}
                          </span>
                        </div>
                        <small>{item.timeLabel}{item.subtitle ? ` • ${item.subtitle}` : ''}</small>
                      </button>
                    ) : (
                      <div key={item.id} className="calendar-card__event">
                        <div className="calendar-card__event-top">
                          <strong>{item.title}</strong>
                          <span className={`calendar-event-tag calendar-event-tag--${getTypeTone(item.type)}`}>
                            {item.type}
                          </span>
                        </div>
                        <small>{item.timeLabel}{item.subtitle ? ` • ${item.subtitle}` : ''}</small>
                      </div>
                    )
                  ))
                ) : (
                  <div className="calendar-card__empty">
                    Nenhum processo, prazo ou reunião registrado para esta data.
                  </div>
                )}
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="stats-strip">
        {dashboardStats.map((item) => (
          <article key={item.label} className="metric-card">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            <small>{item.trend}</small>
          </article>
        ))}
      </section>

      {selectedProcess ? (
        <div className="auth-modal-backdrop">
          <section className="auth-modal processos-modal">
            <div className="panel-card__header">
              <h4>Detalhes do processo</h4>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedProcessNumero('')}
              >
                Fechar
              </button>
            </div>

            <div className="process-modal__content">
              <dl className="process-detail-meta">
                <div>
                  <dt>Número CNJ</dt>
                  <dd>{selectedProcess.numero}</dd>
                </div>
                <div>
                  <dt>Parte</dt>
                  <dd>{selectedProcess.parte}</dd>
                </div>
                <div>
                  <dt>Assunto</dt>
                  <dd>{selectedProcess.assunto}</dd>
                </div>
                <div>
                  <dt>Órgão</dt>
                  <dd>{selectedProcess.orgao}</dd>
                </div>
                <div>
                  <dt>Fase</dt>
                  <dd>{selectedProcess.fase}</dd>
                </div>
                <div>
                  <dt>Prioridade</dt>
                  <dd>{selectedProcess.prioridade}</dd>
                </div>
                <div>
                  <dt>Status atual</dt>
                  <dd><ProcessStatusChip value={selectedProcess.andamentoAtual} /></dd>
                </div>
                <div>
                  <dt>Último protocolo</dt>
                  <dd>{formatDayMonth(selectedProcess.dataUltimoProtocolo)}</dd>
                </div>
              </dl>

              <section className="panel-card process-modal__section">
                <div className="panel-card__header">
                  <h4>Demandas e prazos</h4>
                  <span>{selectedProcessDemandas.length} item(ns)</span>
                </div>
                <div className="process-demand-list">
                  {selectedProcessDemandas.length ? (
                    selectedProcessDemandas.map((item) => (
                      <div key={item.id ?? item.documentId} className="process-demand-item">
                        <div className="process-demand-item__top">
                          <strong>{item.item ?? 'Prazo processual'}</strong>
                          <ProcessStatusChip value={item.status ?? 'Planejado'} />
                        </div>
                        <div className="process-demand-item__meta">
                          <span>Vencimento: {formatDateLabel(item.vencimento)}</span>
                          <span>Parte: {item.parte ?? selectedProcess.parte}</span>
                          <span>Responsável: {item.responsavel ?? 'Não informado'}</span>
                        </div>
                        {item.anexoUrl ? (
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
              </section>

              {selectedProcess.observacoes ? (
                <section className="panel-card process-modal__section">
                  <div className="panel-card__header">
                    <h4>Observações</h4>
                    <span>Resumo operacional</span>
                  </div>
                  <p>{selectedProcess.observacoes}</p>
                </section>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function ProcessStatusChip({ value }) {
  return <span className={`process-status-chip process-status-chip--${getProcessoStatusTone(value)}`}>{value}</span>
}

function AdminDashboard({
  currentUser,
  usuariosRows,
  setoresRows,
  processosRows,
  prazosRows,
  agendaRows,
  loading,
  error,
  source,
}) {
  const usersByProfile = useMemo(() => {
    const counters = {
      Administrador: 0,
      Procurador: 0,
      Assessoria: 0,
      Estágio: 0,
    }

    usuariosRows.forEach((item) => {
      const perfil = String(item.perfil ?? '').toLowerCase()
      if (perfil.includes('admin')) counters.Administrador += 1
      else if (perfil.includes('procurador')) counters.Procurador += 1
      else if (perfil.includes('assessor')) counters.Assessoria += 1
      else if (perfil.includes('estagi')) counters.Estágio += 1
    })

    return counters
  }, [usuariosRows])

  const accessStatus = useMemo(() => {
    const counters = {
      ativos: 0,
      pendentes: 0,
      bloqueados: 0,
    }

    usuariosRows.forEach((item) => {
      const status = String(item.status ?? '').toLowerCase()
      if (status.includes('ativo')) counters.ativos += 1
      else if (status.includes('pendente')) counters.pendentes += 1
      else if (status.includes('bloque')) counters.bloqueados += 1
    })

    return counters
  }, [usuariosRows])

  const adminStats = [
    { label: 'Setores cadastrados', value: String(setoresRows.length), trend: 'Ambientes independentes configurados' },
    { label: 'Usuários cadastrados', value: String(usuariosRows.length), trend: 'Base total de acessos' },
    { label: 'Processos cadastrados', value: String(processosRows.length), trend: 'Registros operacionais acompanhados' },
    { label: 'Prazos cadastrados', value: String(prazosRows.length), trend: 'Controle institucional de vencimentos' },
  ]

  return (
    <div className="page-stack">
      <section className="hero-panel hero-panel--admin">
        <div className="hero-panel__content">
          <span className="hero-panel__eyebrow">Painel administrativo PGM</span>
          <h3>Governança de setores, usuários e bases institucionais da Procuradoria.</h3>
          <p>
            O acesso atual está autenticado para {currentUser?.displayName ?? 'o administrador ativo'}.
            Esta área foi estruturada para gestão administrativa da Procuradoria, com foco em
            ambientes setoriais independentes, usuários, permissões e acompanhamento geral das operações.
          </p>

          <div className="hero-actions">
            <Link className="hero-action hero-action--blue" to="/setores">
              Gerenciar setores
            </Link>
            <Link className="hero-action hero-action--green" to="/usuarios">
              Gerenciar usuários
            </Link>
            <Link className="hero-action hero-action--gold" to="/">
              Visão geral
            </Link>
          </div>
        </div>

        <div className="hero-panel__aside">
          <div className="hero-badge">ADM</div>
          <strong>Central da PGM</strong>
          <p>{currentUser?.workspace ?? 'Administração da Procuradoria'}.</p>
        </div>
      </section>

      <CollectionStatus
        loading={loading}
        error={error}
        source={source}
        empty={!usuariosRows.length && !setoresRows.length && !processosRows.length && !prazosRows.length && !agendaRows.length}
        label="painel administrativo"
      />

      <section className="stats-strip">
        {adminStats.map((item) => (
          <article key={item.label} className="metric-card">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            <small>{item.trend}</small>
          </article>
        ))}
      </section>

      <section className="feature-grid">
        <article className="feature-card feature-card--blue">
          <div className="feature-card__icon">U</div>
          <div>
            <h4>Cadastro de usuários</h4>
            <p>Crie procuradores, administradores, assessores e estagiários com lotação e gestor responsável.</p>
          </div>
          <Link className="feature-card__link" to="/usuarios">
            Abrir usuários
          </Link>
        </article>

        <article className="feature-card feature-card--green">
          <div className="feature-card__icon">E</div>
          <div>
            <h4>Cadastro de setores</h4>
            <p>Defina nome, sigla e funções de cada ambiente da Procuradoria sem misturar os dados operacionais.</p>
          </div>
          <Link className="feature-card__link" to="/setores">
            Ver setores
          </Link>
        </article>

        <article className="feature-card feature-card--gold">
          <div className="feature-card__icon">D</div>
          <div>
            <h4>Visão operacional</h4>
            <p>Acompanhe os volumes de processos, prazos e compromissos cadastrados nos ambientes da Procuradoria.</p>
          </div>
          <Link className="feature-card__link" to="/">
            Ver painel
          </Link>
        </article>
      </section>

      <section className="content-grid">
        <article className="calendar-card">
          <div className="panel-card__header">
            <h4>Governança de perfis e setores</h4>
            <span>Panorama atual de acessos</span>
          </div>

          <div className="document-grid">
            <article className="document-card">
              <strong>Setores ativos</strong>
              <p>{setoresRows.filter((item) => String(item.status ?? '').toLowerCase() === 'ativo').length} ambientes em operação.</p>
            </article>
            {Object.entries(usersByProfile).map(([label, value]) => (
              <article key={label} className="document-card">
                <strong>{label}</strong>
                <p>{value} usuários neste grupo.</p>
              </article>
            ))}
            <article className="document-card">
              <strong>Acessos ativos</strong>
              <p>{accessStatus.ativos} ativos, {accessStatus.pendentes} pendentes e {accessStatus.bloqueados} bloqueados.</p>
            </article>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <h4>Informações gerais do sistema</h4>
            <span>Leitura executiva</span>
          </div>

          <div className="process-list">
            <div className="process-list__item">
              <strong>Processos</strong>
              <p>{processosRows.length} processos cadastrados nos ambientes ativos.</p>
            </div>
            <div className="process-list__item">
              <strong>Prazos e agenda</strong>
              <p>{prazosRows.length} prazos e {agendaRows.length} compromissos registrados para acompanhamento geral.</p>
            </div>
            <div className="process-list__item">
              <strong>Governança operacional</strong>
              <p>A administração central pode criar setores, distribuir acessos e acompanhar dados gerais da PGM.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function buildCalendarMonth(baseDate) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const days = []

  for (let index = startOffset; index > 0; index -= 1) {
    const day = new Date(year, month, 1 - index)
    days.push(getCalendarDay(day, month))
  }

  for (let dayNumber = 1; dayNumber <= lastDay.getDate(); dayNumber += 1) {
    days.push(getCalendarDay(new Date(year, month, dayNumber), month))
  }

  let trailingDay = 1

  while (days.length % 7 !== 0) {
    const nextDay = new Date(year, month + 1, trailingDay)
    days.push(getCalendarDay(nextDay, month))
    trailingDay += 1
  }

  return {
    monthLabel: baseDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    }),
    weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    days,
  }
}

function getCalendarDay(date, currentMonth) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return {
    dateKey: `${year}-${month}-${day}`,
    dayNumber: date.getDate(),
    isCurrentMonth: date.getMonth() === currentMonth,
  }
}

function getTypeTone(type) {
  const normalizedType = String(type ?? '').toLowerCase()

  if (normalizedType.includes('prazo')) {
    return 'gold'
  }

  if (normalizedType.includes('processo')) {
    return 'blue'
  }

  return 'green'
}

function getRelativeDateKey(dateKey, offsetDays) {
  const nextDate = getDateFromKey(dateKey)
  nextDate.setDate(nextDate.getDate() + offsetDays)

  const year = nextDate.getFullYear()
  const month = String(nextDate.getMonth() + 1).padStart(2, '0')
  const day = String(nextDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getShiftedMonthDate(baseDate, offsetMonths) {
  const nextDate = new Date(baseDate)
  nextDate.setMonth(nextDate.getMonth() + offsetMonths)
  return nextDate
}

function buildQuickActions(dateKey) {
  const formattedDate = formatDateForForms(dateKey)

  return [
    { label: 'Evento', href: `/agenda?data=${formattedDate}&tipo=Reuniao#cadastro-agenda` },
    { label: 'Prazo', href: `/prazos?vencimento=${formattedDate}#cadastro-prazos` },
    { label: 'Processo', href: `/processos?prazo=${formattedDate}#cadastro-processos` },
  ]
}

function formatDateForForms(dateKey) {
  const [year, month, day] = dateKey.split('-')
  return `${day}/${month}/${year}`
}

function truncateText(value, maxLength) {
  const text = String(value ?? '').trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 3).trim()}...`
}
