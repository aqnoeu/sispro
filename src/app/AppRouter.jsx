import { AutosPage } from '../pages/AutosPage'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { LoginPage } from '../pages/LoginPage'
import { AdminPreviewPage } from '../pages/AdminPreviewPage'
import { ProcessoDetailPage } from '../pages/ProcessoDetailPage'
import { AppShell } from '../components/layout/AppShell'
import { AgendaPage } from '../pages/AgendaPage'
import { DashboardPage } from '../pages/DashboardPage'
import { JurisprudenciaCadastroPage } from '../pages/JurisprudenciaCadastroPage'
import { JurisprudenciaDetailPage } from '../pages/JurisprudenciaDetailPage'
import { JurisprudenciaPage } from '../pages/JurisprudenciaPage'
import { SettingsPage } from '../pages/SettingsPage'
import { PerfilPage } from '../pages/PerfilPage'
import { PrazosBatchPage } from '../pages/PrazosBatchPage'
import { PrazosPage } from '../pages/PrazosPage'
import { ProcessosPage } from '../pages/ProcessosPage'

export function AppRouter() {
  const location = useLocation()

  return (
    <Routes location={location} key={location.pathname}>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="jurisprudencia" element={<JurisprudenciaPage />} />
          <Route path="jurisprudencia/cadastro" element={<JurisprudenciaCadastroPage />} />
          <Route path="jurisprudencia/:tab/:documentId" element={<JurisprudenciaDetailPage />} />


          <Route path="processos" element={<ProcessosPage />} />
          <Route path="processos/:numero/autos" element={<AutosPage />} />
          <Route path="processos/:numero" element={<ProcessoDetailPage />} />
          <Route path="usuarios" element={<AdminPreviewPage kind="users" />} />
          <Route path="setores" element={<AdminPreviewPage kind="sectors" />} />
          <Route path="prazos" element={<PrazosPage />} />
          <Route path="prazos/lote" element={<PrazosBatchPage />} />
          <Route path="agenda" element={<AgendaPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProtectedRoute() { const { currentUser } = useAuth(); return currentUser ? <Outlet /> : <Navigate to="/login" replace /> }
