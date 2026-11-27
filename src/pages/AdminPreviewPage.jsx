import { Navigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'

export function AdminPreviewPage({ kind }) {
  const { currentUser } = useAuth()
  if (!currentUser?.isAdmin) return <Navigate to="/" replace />
  const users = kind === 'users'
  return <div className="page-stack">
    <PageHeader eyebrow="Administração · Demonstração" title={users ? 'Usuários' : 'Setores'} description={users ? 'Futura gestão de contas, lotações, perfis e acessos.' : 'Futura gestão dos ambientes institucionais da Procuradoria.'} />
    <section className="panel-card" style={{ padding: 24 }}>
      <h4>{users ? 'Perfis previstos' : 'Estrutura prevista'}</h4>
      <div className="document-grid">
        {(users ? [['Administrador','Governança e configuração institucional'],['Usuário comum','Rotina de processos, prazos e agenda']] : [['Setores','Nome, sigla e unidade responsável'],['Vínculos','Lotação de usuários e permissões']]).map(([title,desc]) => <article key={title} className="document-card"><strong>{title}</strong><p>{desc}</p></article>)}
      </div>
      <p>Prévia de navegação. O cadastro definitivo e a autenticação ainda não estão habilitados.</p>
    </section>
  </div>
}
