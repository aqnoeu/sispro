import { useDeferredValue, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
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
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearch = useDeferredValue(searchTerm)
  const isAdmin = currentUser?.isAdmin
  const items = isAdmin ? [...adminNavigationItems, ...navigationItems.filter(item => item.path !== '/')] : navigationItems
  const isReadOnlyJurisprudenciaRoute = location.pathname === '/jurisprudencia' || /^\/jurisprudencia\/(precedentes|pareceres|teses|referencias)\//.test(location.pathname)
  const shouldShowTopbar = location.pathname === '/perfil'

  function renderUserContent() {
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
    <div className="app-shell">
      <Sidebar items={items} />
      {currentUser?.isDemo && <div className="demo-session-banner">Demonstração · Dados temporários · Sem acesso aos registros reais</div>}
      <div className="app-shell__body">
        {shouldShowTopbar ? (
          <Topbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showSearch={!isReadOnlyJurisprudenciaRoute}
          />
        ) : null}
        <PageSearchProvider searchTerm={deferredSearch}>
          <main key={location.pathname + location.hash} className="app-shell__content">
            {isAdmin ? <Outlet /> : renderUserContent()}
          </main>
        </PageSearchProvider>
      </div>
    </div>
  )
}
