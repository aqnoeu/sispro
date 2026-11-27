import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import siproLogo from '../../assets/sipro.svg'
import { isPreview } from '../../data/preview'

export function Sidebar({ items }) {
  const { currentUser, isLocalEnabled, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  function handleNavigate(path) {
    navigate(path)
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

        <nav className="site-nav" aria-label="Menu principal">
          {items.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`site-nav__link${location.pathname === item.path ? ' site-nav__link--active' : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              {item.label}
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
