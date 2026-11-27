import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import siproLogo from '../../assets/sipro.svg'
import { isPreview } from '../../data/preview'
import { useAppearance } from './AppearanceContext'

const icons = { '/configuracoes':'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 4-2 2v3l-3 2-1 3H9l-1-3-3-2v-3l-2-2 2-4 3-1z', '/':'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', '/processos':'M3 7h7l2 2h9v11H3z M3 7V4h7l2 3', '/prazos':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2', '/agenda':'M4 6h16v15H4z M8 3v6 M16 3v6 M4 11h16', '/jurisprudencia':'M12 3v18 M5 6h14 M5 6l-3 8h6z M19 6l-3 8h6z M8 21h8', '/usuarios':'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2', '/setores':'M3 4h18v16H3z M9 4v16 M15 4v16' }
function NavIcon({ path }) { return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={icons[path] || icons['/']}/></svg> }

export function Sidebar({ items }) {
  const [expanded, setExpanded] = useState(false)
  const { appearance, update } = useAppearance()
  const { currentUser, isLocalEnabled, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  function handleNavigate(path) {
    navigate(path)
    setExpanded(false)
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand-mark">
          <div className="brand-mark__shield">
            <img src={siproLogo} alt="" className="brand-mark__image" />
          </div>
          <div>
            <strong>Sistema Procuradorias</strong>
            <small>{currentUser?.isAdmin ? 'Administração, governança e setores' : currentUser?.sectorName ?? 'Ambiente setorial'}</small>
          </div>
        </div>

        <button type="button" className="mobile-nav-toggle" aria-expanded={expanded} aria-controls="main-navigation" onClick={() => setExpanded(value => !value)}><span aria-hidden="true">☰</span> Menu</button>
        <nav id="main-navigation" className={`site-nav${expanded ? ' site-nav--expanded' : ''}`} aria-label="Menu principal">
          {appearance.menu === 'side' && <button type="button" className="nav-expand" aria-label={appearance.expanded ? 'Recolher menu' : 'Expandir menu'} aria-expanded={appearance.expanded} onClick={()=>update({expanded:!appearance.expanded})}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m4-11 3 3-3 3"/></svg><span>{appearance.expanded ? 'Recolher' : 'Expandir'}</span></button>}
          {[...items,{path:'/configuracoes',label:'Configurações'}].map((item) => (
            <button
              key={item.path}
              type="button"
              aria-label={item.label}
              title={item.label}
              data-tooltip={item.label}
              className={`site-nav__link${(item.path === '/' ? location.pathname === '/' : location.pathname === item.path || location.pathname.startsWith(item.path + '/')) ? ' site-nav__link--active' : ''}`}
              aria-current={(item.path === '/' ? location.pathname === '/' : location.pathname === item.path || location.pathname.startsWith(item.path + '/')) ? 'page' : undefined}
              onClick={() => handleNavigate(item.path)}
            >
              <NavIcon path={item.path}/><span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="site-header__meta">
          {(
            <span className={`status-pill${isLocalEnabled ? ' status-pill--ok' : ''}`}>
              {isPreview ? 'Prévia pública' : isLocalEnabled ? 'Armazenamento local' : 'Modo local'}
            </span>
          )}
          <button
            type="button"
            className="user-chip user-chip--interactive"
            onClick={() => navigate('/perfil')}
          >
            <strong>{currentUser?.displayName ?? 'Autenticação pendente'}</strong>
            <small>{currentUser?.workspace ?? currentUser?.role ?? currentUser?.email ?? 'Sem usuário ativo'}</small>
          </button>
          <button type="button" className="access-exit" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>Sair</button>
        </div>
      </div>
    </header>
  )
}
