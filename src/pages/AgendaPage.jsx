import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { RecordForm } from '../components/forms/RecordForm'
import { DataTable } from '../components/ui/DataTable'
import { CollectionStatus } from '../components/ui/CollectionStatus'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'
import { formConfigs } from '../data/formConfigs'
import { agenda, prazos } from '../data/mockData'
import { useCollectionData } from '../services/local/useCollectionData'
import { buildUserAccessContext, canAccessOwnedRow } from '../utils/accessScope'
import { compareByDateDesc, formatDayMonth, isToday } from '../utils/dates'

export function AgendaPage() {
  const { currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  const isAdmin = currentUser?.isAdmin
  const prefilledDate = searchParams.get('data') ?? ''
  const prefilledTipo = searchParams.get('tipo') ?? ''
  const { rows, loading, error, source } = useCollectionData({
    collectionName: 'agenda',
    fallbackData: agenda,
    orderByField: 'horario',
    clientFilter: isAdmin ? null : (item) => canAccessOwnedRow(item, currentUser),
  })
  const prazosCollection = useCollectionData({
    collectionName: 'prazos',
    fallbackData: prazos,
    orderByField: 'vencimento',
    clientFilter: isAdmin ? null : (item) => canAccessOwnedRow(item, currentUser),
  })
  const timelineRows = useMemo(
    () =>
      [
        ...rows.map((item) => ({
          id: `agenda-${item.id ?? item.titulo}`,
          tipo: item.tipo ?? 'Agenda',
          titulo: item.titulo ?? 'Compromisso sem titulo',
          referencia: item.local ?? '',
          ownerName: item.ownerName ?? 'Não informado',
          dataBase: item.horario,
          dataExibicao: formatDayMonth(item.horario),
        })),
        ...prazosCollection.rows.map((item) => ({
          id: `prazo-${item.id ?? item.processo ?? item.item}`,
          tipo: 'Prazo',
          titulo: item.parte ?? item.item ?? 'Prazo processual',
          referencia: item.processo ?? item.responsavel ?? '',
          ownerName: item.ownerName ?? item.responsavel ?? 'Não informado',
          dataBase: item.vencimento,
          dataExibicao: formatDayMonth(item.vencimento),
          destaque: isToday(item.vencimento) ? 'Hoje' : '',
        })),
      ].sort((left, right) => compareByDateDesc(left.dataBase, right.dataBase)),
    [prazosCollection.rows, rows],
  )

  if (isAdmin) {
    return <Navigate to="/" replace />
  }

  function handleScrollToForm() {
    document.getElementById('cadastro-agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const accessContext = buildUserAccessContext(currentUser)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Ofícios e agenda"
        title="Compromissos, expedientes e eventos institucionais"
        description={
          isAdmin
            ? 'A administração visualiza a agenda consolidada para leitura sistêmica de compromissos, audiências e expedientes.'
            : 'Compromissos e expedientes exibidos de forma privada para o procurador autenticado.'
        }
        action={
          <button type="button" className="secondary-button" onClick={handleScrollToForm}>
            Ir para cadastro
          </button>
        }
      />

      <CollectionStatus
        loading={loading || prazosCollection.loading}
        error={error || prazosCollection.error}
        source={source === 'local' && prazosCollection.source === 'local' ? 'local' : 'remote'}
        empty={!timelineRows.length}
        label="agenda"
      />

      <RecordForm
        config={formConfigs.agenda}
        formId="cadastro-agenda"
        initialValuesOverride={{
          horario: prefilledDate ? `${prefilledDate} 09:00` : '',
          tipo: prefilledTipo,
        }}
        additionalValues={accessContext}
        scopeMessage={
          isAdmin
            ? 'Este cadastro será salvo na leitura administrativa consolidada do sistema.'
            : `Este cadastro será salvo apenas no ambiente de ${currentUser?.displayName ?? 'usuário ativo'}.`
        }
      />

      <DataTable
        columns={[
          { key: 'tipo', label: 'Tipo' },
          {
            key: 'titulo',
            label: 'Compromisso',
            render: (row) => (
              <div>
                <strong>{row.titulo}</strong>
                {row.referencia ? <small>{row.referencia}</small> : null}
              </div>
            ),
          },
          ...(isAdmin ? [{ key: 'ownerName', label: 'Usuário' }] : []),
          { key: 'dataExibicao', label: 'Data' },
          { key: 'destaque', label: '' },
        ]}
        rows={timelineRows}
        emptyMessage="Nenhum item encontrado."
      />
    </div>
  )
}
