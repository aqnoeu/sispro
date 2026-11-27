import { HashRouter } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </HashRouter>
  )
}

export default App
