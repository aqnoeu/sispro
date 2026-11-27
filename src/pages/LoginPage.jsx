import { useState } from 'react'
import { Mail, LockKeyhole, UserRound, ShieldCheck } from 'lucide-react'
import { version } from '../../package.json'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import logo from '../assets/sipro.svg'
import { isPreview } from '../data/preview'

const demoProfiles = [
  { mode: 'user', name: 'Usuário comum', workspace: 'Ambiente jurídico setorial', email: 'usuario@sipro.local' },
  { mode: 'admin', name: 'Administrador', workspace: 'Administração da Procuradoria', email: 'admin@sipro.local' },
]

const loginIcons = { email:Mail, lock:LockKeyhole, user:UserRound, admin:ShieldCheck }
function LoginIcon({ name }) { const Icon=loginIcons[name]; return <Icon aria-hidden="true" size={22} strokeWidth={1.8}/> }

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
          <div className="login-brand-content">
            <img className="login-brand-symbol" src={logo} alt="" />
            <h1>Sistema<br />Procuradorias</h1>
            <p className="login-brand-subtitle">Gestão jurídica institucional</p>
            <span className="login-brand-accent" aria-hidden="true" />
            <p className="login-brand-description">Organize processos, prazos e compromissos da Procuradoria em um ambiente simples, claro e profissional.</p>
          </div>
          <p className="sipro-auth-footnote">{isPreview ? 'Prévia online · Dados fictícios' : 'Aplicativo Windows · Armazenamento local'}</p>
        </section>
        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-card__header">
            <h2 id="login-title">Entrar no sistema</h2>
            <p>Acesse o Sistema Procuradorias e gerencie o ambiente de gestão jurídica da Procuradoria.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>E-mail</span>
              <div className="login-input-wrap"><LoginIcon name="email"/><input type="email" placeholder="nome@sipro.local" autoComplete="off" value={email} required onChange={event => { setEmail(event.target.value); setError('') }} /></div>
            </label>
            <label className="form-field">
              <span>Senha</span>
              <div className="login-input-wrap"><LoginIcon name="lock"/><input type="password" placeholder="Não exigida na demonstração" disabled aria-describedby="demo-note" /></div>
            </label>
            <button type="submit" className="primary-button auth-form__submit">Entrar</button>
            {error && <div className="form-feedback form-feedback--error" role="alert">{error}</div>}
          </form>
          <div className="auth-demo">
            <strong>Acessos de demonstração</strong>
            <p id="demo-note" className="login-sr-only">Escolha um perfil e clique em Entrar. A senha está desabilitada na demonstração.</p>
            <div className="auth-demo__list">
              {demoProfiles.map(profile => (
                <button key={profile.mode} type="button" className={'auth-demo__user' + (email === profile.email ? ' sipro-demo-selected' : '')} aria-pressed={email === profile.email} onClick={() => { setEmail(profile.email); setError('') }}>
                  <span className="login-profile-icon"><LoginIcon name={profile.mode === 'admin' ? 'admin' : 'user'}/></span><span className="login-profile-text"><strong>{profile.name}</strong><span>{profile.workspace}</span><small>{profile.email}</small></span>
                </button>
              ))}
            </div>
            <p className="sipro-demo-note">{isPreview ? 'Prévia pública. Use somente dados inventados. Alterações são descartadas ao recarregar. Não é autenticação real.' : 'Dados temporários, separados do banco local existente. Esta tela ainda não constitui autenticação real.'}</p>
            {!isPreview && <button type="button" className="access-local auth-form__submit" onClick={() => choose('local')}>Abrir ambiente local existente</button>}
          </div>
        </section>
      </div>
      <footer className="login-credits">v{version} · Desenvolvido por @aqnoeu</footer>
    </main>
  )
}
