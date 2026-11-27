import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import logo from '../assets/sipro.svg'

export function LoginPage() {
  const { currentUser, enter } = useAuth()
  const navigate = useNavigate()
  if (currentUser) return <Navigate to="/" replace />
  function choose(mode) { enter(mode); navigate('/', { replace: true }) }
  return (
    <main className="access-screen">
      <section className="access-brand">
        <img src={logo} alt="" />
        <span>SIPRO</span>
        <h1>Sistema Procuradorias</h1>
        <p>Processos, prazos e governança em um só ambiente.</p>
        <small>Aplicativo Windows · Dados locais</small>
      </section>
      <section className="access-panel" aria-labelledby="access-title">
        <span className="access-eyebrow">Bem-vindo ao SIPRO</span>
        <h2 id="access-title">Escolha seu perfil</h2>
        <p>Conheça os dois ambientes antes de configurar a autenticação definitiva.</p>
        <button className="access-role" onClick={() => choose('user')}>
          <span className="access-role-icon" aria-hidden="true">U</span>
          <span><strong>Usuário comum</strong><small>Processos, prazos, agenda e jurisprudência do setor.</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <button className="access-role" onClick={() => choose('admin')}>
          <span className="access-role-icon admin" aria-hidden="true">A</span>
          <span><strong>Administrador</strong><small>Painel institucional, usuários, setores e governança.</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <p className="access-notice">Modo demonstração: sem senha, com dados temporários separados do banco local. Não constitui controle de acesso real.</p>
        <button className="access-local" onClick={() => choose('local')}>Abrir ambiente local existente</button>
        <small className="access-footer">Sem conexão com Firebase · Versão 1.0.1</small>
      </section>
    </main>
  )
}
