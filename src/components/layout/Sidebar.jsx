import { useState } from 'react'
import { LayoutDashboard, FolderOpen, CalendarClock, CalendarDays, Scale, Users, Building2, Settings, PanelLeftOpen, PanelLeftClose, Menu, ArrowLeftRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import siproLogo from '../../assets/sipro.svg'
import { isCloud, isPreview } from '../../data/preview'
import { useAppearance } from './AppearanceContext'

const icons = { '/':LayoutDashboard, '/processos':FolderOpen, '/prazos':CalendarClock, '/agenda':CalendarDays, '/jurisprudencia':Scale, '/usuarios':Users, '/setores':Building2, '/configuracoes':Settings }
function NavIcon({ path }) { const Icon=icons[path] || LayoutDashboard; return <Icon aria-hidden="true" size={22} strokeWidth={1.8}/> }

export function Sidebar({ items }) {
  const [expanded, setExpanded] = useState(false)
  const { appearance, update } = useAppearance()
  const { currentUser, isLocalEnabled, signOut, switchProfile } = useAuth()
  const [switching,setSwitching]=useState(false)
  const [switchError,setSwitchError]=useState('')
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

        <button type="button" className="mobile-nav-toggle" aria-expanded={expanded} aria-controls="main-navigation" onClick={() => setExpanded(value => !value)}><Menu aria-hidden="true" size={20} strokeWidth={1.8}/> Menu</button>
        <nav id="main-navigation" className={`site-nav${expanded ? ' site-nav--expanded' : ''}`} aria-label="Menu principal">
          {appearance.menu === 'side' && <button type="button" className="nav-expand" aria-label={appearance.expanded ? 'Recolher menu' : 'Expandir menu'} aria-expanded={appearance.expanded} onClick={()=>update({expanded:!appearance.expanded})}>{appearance.expanded ? <PanelLeftClose aria-hidden="true" size={22} strokeWidth={1.8}/> : <PanelLeftOpen aria-hidden="true" size={22} strokeWidth={1.8}/>}<span>{appearance.expanded ? 'Recolher' : 'Expandir'}</span></button>}
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
              {isCloud ? 'Armazenamento online' : isPreview ? 'Prévia pública' : isLocalEnabled ? 'Armazenamento local' : 'Modo local'}
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
          {currentUser?.canTestPgm && <><button type="button" className="access-exit" disabled={switching} onClick={async()=>{setSwitching(true);setSwitchError('');try{await switchProfile(currentUser.profileMode==='pgm'?'ceo':'pgm');navigate('/',{replace:true})}catch(e){setSwitchError(e.message)}finally{setSwitching(false)}}}><ArrowLeftRight size={16} aria-hidden="true"/> {currentUser.profileMode==='pgm'?'Voltar ao CEO':'Acessar PGM'}</button>{switchError&&<span role="alert">{switchError}</span>}</>}
          <button type="button" className="access-exit" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>Sair</button>
        </div>
      </div>
    </header>
  )
}
