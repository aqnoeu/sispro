import { AutosPage } from '../../pages/AutosPage'
import { useDeferredValue, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AppearanceProvider, useAppearance } from './AppearanceContext'
import { SettingsPage } from '../../pages/SettingsPage'
import { Topbar } from './Topbar'
import { useAuth } from '../../contexts/useAuth'
import { PageSearchProvider } from '../../contexts/PageSearchContext'
import { navigationItems, adminNavigationItems } from '../../data/mockData'
import { AgendaPage } from '../../pages/AgendaPage'
import { DashboardPage } from '../../pages/DashboardPage'
import { JurisprudenciaCadastroPage } from '../../pages/JurisprudenciaCadastroPage'
import { JurisprudenciaDetailPage } from '../../pages/JurisprudenciaDetailPage'
import { JurisprudenciaPage } from '../../pages/JurisprudenciaPage'
import { PerfilPage } from '../../pages/PerfilPage'
import { PrazosBatchPage } from '../../pages/PrazosBatchPage'
import { PrazosPage } from '../../pages/PrazosPage'
import { ProcessoDetailPage } from '../../pages/ProcessoDetailPage'
import { ProcessosPage } from '../../pages/ProcessosPage'

export function AppShell() {
 const { currentUser } = useAuth()
 return <AppearanceProvider key={currentUser?.uid+':'+(currentUser?.profileMode||'')} userId={currentUser?.uid}><Workspace /></AppearanceProvider>
}
function Workspace() {
  const { currentUser } = useAuth()
  const { appearance } = useAppearance()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearch = useDeferredValue(searchTerm)
  const isAdmin = currentUser?.isAdmin
  const isCeo=currentUser?.profileMode==='ceo'
  const items = isCeo ? [{path:'/',label:'Início'},{path:'/usuarios',label:'Usuários'},{path:'/setores',label:'Instituições'}] : isAdmin ? [...adminNavigationItems, ...navigationItems.filter(item => item.path !== '/')] : navigationItems
  const isReadOnlyJurisprudenciaRoute = location.pathname === '/jurisprudencia' || /^\/jurisprudencia\/(precedentes|pareceres|teses|referencias)\//.test(location.pathname)
  const shouldShowTopbar = location.pathname === '/perfil'

  function renderUserContent() {
    if (location.pathname === '/configuracoes') return <SettingsPage />
    if (location.pathname === '/perfil') {
      return <PerfilPage />
    }

    if (location.pathname === '/jurisprudencia') {
      return <JurisprudenciaPage />
    }

    if (location.pathname === '/jurisprudencia/cadastro') {
      return <JurisprudenciaCadastroPage />
    }

    if (/^\/jurisprudencia\/(precedentes|pareceres|teses|referencias)\//.test(location.pathname)) {
      return <JurisprudenciaDetailPage />
    }

    if (location.pathname === '/processos') {
      return <ProcessosPage />
    }

    if (/^\/processos\/[^/]+\/autos$/.test(location.pathname)) return <AutosPage />
    if (location.pathname.startsWith('/processos/')) {
      return <ProcessoDetailPage />
    }

    if (location.pathname === '/prazos') {
      return <PrazosPage />
    }

    if (location.pathname === '/prazos/lote') {
      return <PrazosBatchPage />
    }

    if (location.pathname === '/agenda') {
      return <AgendaPage />
    }

    if (location.pathname === '/setores' || location.pathname === '/usuarios') {
      return <Navigate to="/" replace />
    }

    return <DashboardPage />
  }

  return (
    <div className={`app-shell nav-${appearance.menu}${appearance.expanded ? ' nav-wide' : ' nav-compact'}${appearance.motion ? '' : ' motion-off'}`}>
      <a className="skip-workspace" href="#workspace" onClick={event => { event.preventDefault(); document.getElementById('workspace')?.focus() }}>Ir para área de trabalho</a>
      <Sidebar items={items} />
      {currentUser?.isTestPgm && <div className="demo-session-banner">PGM · Procuradoria de teste · Utilize somente dados fictícios</div>}
      {currentUser?.isDemo && <div className="demo-session-banner">Demonstração · Dados temporários · Sem acesso aos registros reais</div>}
      <div className="app-shell__body" id="workspace" tabIndex={-1}>
        {shouldShowTopbar ? (
          <Topbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showSearch={!isReadOnlyJurisprudenciaRoute}
          />
        ) : null}
        <PageSearchProvider searchTerm={deferredSearch}>
          <main key={location.pathname + location.hash} className="app-shell__content">
            {isCeo ? (location.pathname==='/' ? <section className="panel-card" style={{padding:24}}><h2>Administração da SISPRO · CEO</h2><p>Ambiente de gestão da plataforma. Use o seletor de perfil para acessar a Procuradoria de teste como PGM.</p><p>Cadastro de instituições, RH, Comercial e demais mecânicas serão habilitados conforme suas definições de acesso.</p></section> : ['/perfil','/configuracoes','/usuarios','/setores'].includes(location.pathname) ? <Outlet/> : <Navigate to="/" replace/>) : isAdmin ? <Outlet /> : renderUserContent()}
          </main>
        </PageSearchProvider>
      </div>
    </div>
  )
}
