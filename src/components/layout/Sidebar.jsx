import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, FolderOpen, CalendarClock, CalendarDays, Scale, Users, Building2, Settings, PanelLeftOpen, PanelLeftClose, Menu, ArrowLeftRight, ChevronDown, UserRound, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import siproLogo from '../../assets/sipro.svg'
import { useAppearance } from './AppearanceContext'

const icons = { '/':LayoutDashboard, '/processos':FolderOpen, '/prazos':CalendarClock, '/agenda':CalendarDays, '/jurisprudencia':Scale, '/usuarios':Users, '/setores':Building2, '/configuracoes':Settings }
function NavIcon({ path }) { const Icon=icons[path] || LayoutDashboard; return <Icon aria-hidden="true" size={22} strokeWidth={1.8}/> }

export function Sidebar({ items }) {
  const [expanded, setExpanded] = useState(false)
  const { appearance, update } = useAppearance()
  const { currentUser, signOut, switchProfile } = useAuth()
  const [switching,setSwitching]=useState(false)
  const [switchError,setSwitchError]=useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const [accountOpen,setAccountOpen]=useState(false)
  const accountRef=useRef(null),accountButton=useRef(null)
  useEffect(()=>{setAccountOpen(false)},[location.pathname,currentUser?.profileMode])
  useEffect(()=>{if(!accountOpen)return;const outside=e=>{if(!accountRef.current?.contains(e.target))setAccountOpen(false)};const escape=e=>{if(e.key==='Escape'){setAccountOpen(false);accountButton.current?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}},[accountOpen])
  const switchLabel=currentUser?.profileMode==='pgm'?'Trocar para CEO':'Trocar para PGM'

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
          <div className="account-control" ref={accountRef}>
            <button ref={accountButton} type="button" className="user-chip user-chip--interactive account-trigger" aria-label="Menu do usuário" aria-expanded={accountOpen} aria-controls="account-options" onClick={()=>setAccountOpen(v=>!v)}>
              <span className="account-name"><strong>{currentUser?.displayName ?? 'Usuário'}</strong><small>{currentUser?.workspace ?? currentUser?.role ?? 'Perfil não informado'}</small></span><ChevronDown size={15} aria-hidden="true"/>
            </button>
            {accountOpen&&<div id="account-options" className="account-options" aria-label="Opções do usuário">
              <button type="button" onClick={()=>{setAccountOpen(false);navigate('/perfil')}}><UserRound size={17}/> Perfil</button>
              <button type="button" onClick={()=>{setAccountOpen(false);navigate('/configuracoes')}}><Settings size={17}/> Configurações</button>
              <button type="button" onClick={()=>{setAccountOpen(false);signOut();navigate('/login',{replace:true})}}><LogOut size={17}/> Sair</button>
            </div>}
          </div>
          {currentUser?.canTestPgm&&<button type="button" className="access-exit account-switch" aria-label={switchLabel} title={switchLabel} disabled={switching} onClick={async()=>{setAccountOpen(false);setSwitching(true);setSwitchError('');try{await switchProfile(currentUser.profileMode==='pgm'?'ceo':'pgm');navigate('/',{replace:true})}catch(e){setSwitchError(e.message)}finally{setSwitching(false)}}}><ArrowLeftRight size={21} aria-hidden="true"/></button>}
          {switchError&&<span className="account-switch-error" role="alert">{switchError}</span>}
        </div>
      </div>
    </header>
  )
}
