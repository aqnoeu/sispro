import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'

export function PerfilPage() {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.isAdmin

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Perfil do usuário"
        title={currentUser?.displayName ?? 'Perfil não identificado'}
        description={isAdmin
          ? 'Área de identificação institucional do acesso administrativo da Procuradoria.'
          : 'Área de identificação do usuário autenticado, com vínculo ao gabinete e ao ambiente setorial em uso.'}
      />

      <section className="profile-panel">
        <div className="profile-panel__hero">
          <div className="profile-avatar">
            {(currentUser?.displayName ?? 'U').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span className="profile-panel__eyebrow">{isAdmin ? 'Acesso administrativo' : 'Acesso individualizado'}</span>
            <h3>{currentUser?.displayName ?? 'Usuário autenticado'}</h3>
            <p>{currentUser?.workspace ?? currentUser?.sectorName ?? 'Ambiente não informado'}</p>
          </div>
        </div>

        <div className="profile-grid">
          <article className="profile-card">
            <span>Nome</span>
            <strong>{currentUser?.displayName ?? 'Não informado'}</strong>
          </article>
          <article className="profile-card">
            <span>Gabinete / ambiente</span>
            <strong>{currentUser?.workspace ?? 'Não informado'}</strong>
          </article>
          <article className="profile-card">
            <span>Setor</span>
            <strong>{currentUser?.sectorName ?? 'Não informado'}</strong>
          </article>
          <article className="profile-card">
            <span>Sigla</span>
            <strong>{currentUser?.sectorSigla ?? 'Não informada'}</strong>
          </article>
          <article className="profile-card">
            <span>Perfil</span>
            <strong>{currentUser?.role ?? (isAdmin ? 'Administrador' : 'Usuário')}</strong>
          </article>
          <article className="profile-card">
            <span>E-mail</span>
            <strong>{currentUser?.email ?? 'Não informado'}</strong>
          </article>
        </div>
      </section>
    </div>
  )
}
