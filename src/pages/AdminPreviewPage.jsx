import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/useAuth'

export function AdminPreviewPage({ kind }) {
  const { currentUser, listProfiles } = useAuth()
  const [profiles,setProfiles]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{ if (!currentUser?.isCloud || !currentUser?.isAdmin || kind!=='users') return; let active=true; listProfiles().then(rows=>{if(active)setProfiles(rows)}).catch(e=>{if(active)setError(e.message)}); return ()=>{active=false} },[currentUser,kind,listProfiles])
  if (!currentUser?.isAdmin) return <Navigate to="/" replace />
  const users = kind === 'users'
  if (currentUser.isCloud) return <div className="page-stack"><PageHeader eyebrow="Administração" title={users?'Usuários':'Setores'} description="Contas autorizadas e perfis institucionais."/><section className="panel-card" style={{padding:24}}>{users ? <><p>Cadastro e alteração de permissões exclusivamente no painel seguro do Supabase.</p>{error && <p role="alert">{error}</p>}{profiles.map(p=><div key={p.user_id} className="document-card"><strong>{p.display_name}</strong><p>{p.role==='admin'?'Administrador':'Usuário'} · {p.active?'Ativo':'Inativo'}</p></div>)}</> : <p>Setores compartilhados ainda não habilitados. Os dados são isolados por conta.</p>}</section></div>
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
