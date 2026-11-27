import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import logo from '../assets/sipro.svg'

const demoProfiles = [
  { mode: 'user', name: 'Usuário comum', workspace: 'Ambiente jurídico setorial', email: 'usuario@sipro.local' },
  { mode: 'admin', name: 'Administrador', workspace: 'Administração da Procuradoria', email: 'admin@sipro.local' },
]

export function LoginPage() {
  const { currentUser, enter } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  if (currentUser) return <Navigate to="/" replace />

  function choose(mode) { enter(mode); navigate('/', { replace: true }) }
  function handleSubmit(event) {
    event.preventDefault()
    const profile = demoProfiles.find(item => item.email === email.trim().toLowerCase())
    if (!profile) {
      setError('Selecione um dos perfis de demonstração abaixo.')
      return
    }
    choose(profile.mode)
  }

  return (
    <main className="auth-page">
      <div className="auth-layout sipro-auth-layout">
        <section className="auth-hero">
          <div className="sipro-auth-brand">
            <img src={logo} alt="" />
            <div><strong>Sistema Procuradorias</strong><span>Gestão jurídica institucional</span></div>
          </div>
          <span className="auth-hero__eyebrow">Ambiente jurídico</span>
          <h1>Gestão jurídica institucional</h1>
          <p>Organização dos processos, prazos e compromissos da Procuradoria, com ambientes destinados à rotina jurídica e à administração institucional.</p>
          <div className="auth-hero__highlights">
            <article><strong>Ambiente individualizado de trabalho</strong></article>
            <article><strong>Processos, prazos e informações em um só lugar</strong></article>
            <article><strong>Gestão de usuários e setores</strong></article>
          </div>
          <p className="sipro-auth-footnote">Sistema local para Windows · Sem Firebase</p>
        </section>
        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-card__header">
            <h2 id="login-title">Entrar no sistema</h2>
            <p>Selecione um acesso de demonstração para conhecer o ambiente de gestão da Procuradoria.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>E-mail</span>
              <input type="email" placeholder="nome@sipro.local" autoComplete="off" value={email} required onChange={event => { setEmail(event.target.value); setError('') }} />
            </label>
            <label className="form-field">
              <span>Senha</span>
              <input type="password" placeholder="Não exigida na demonstração" disabled aria-describedby="demo-note" />
            </label>
            <button type="submit" className="primary-button auth-form__submit">Entrar</button>
            {error && <div className="form-feedback form-feedback--error" role="alert">{error}</div>}
          </form>
          <div className="auth-demo">
            <strong>Acessos locais para demonstração</strong>
            <p id="demo-note">Escolha um perfil e clique em Entrar. A senha e as permissões definitivas ainda não estão configuradas.</p>
            <div className="auth-demo__list">
              {demoProfiles.map(profile => (
                <button key={profile.mode} type="button" className={'auth-demo__user' + (email === profile.email ? ' sipro-demo-selected' : '')} aria-pressed={email === profile.email} onClick={() => { setEmail(profile.email); setError('') }}>
                  <strong>{profile.name}</strong>
                  <span>{profile.workspace}</span>
                  <small>{profile.email}</small>
                </button>
              ))}
            </div>
            <p className="sipro-demo-note">Dados temporários, separados do banco local existente. Esta tela ainda não constitui autenticação real.</p>
            <button type="button" className="access-local auth-form__submit" onClick={() => choose('local')}>Abrir ambiente local existente</button>
          </div>
        </section>
      </div>
    </main>
  )
}
