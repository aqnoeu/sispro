import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'

export function PerfilPage() {
  const { currentUser, changePassword } = useAuth()
  const [oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function submit(e){e.preventDefault();setError('');if(newPassword!==confirmation){setError('As senhas não coincidem.');return}setBusy(true);try{await changePassword(oldPassword,newPassword)}catch(e){setError(e.message)}finally{setOldPassword('');setNewPassword('');setConfirmation('');setBusy(false)}}
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
      {currentUser?.isCloud&&<section className="panel-card" style={{padding:24}}><h3>Alterar minha senha</h3><p>Confirme sua senha atual. Após a alteração, entre novamente.</p><form onSubmit={submit} style={{display:'grid',gap:12,maxWidth:480}}><label className="form-field">Senha atual<input type="password" autoComplete="current-password" required value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></label><label className="form-field">Nova senha<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label className="form-field">Confirmar nova senha<input type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="primary-button" disabled={busy}>Alterar senha</button></form></section>}
    </div>
  )
}
