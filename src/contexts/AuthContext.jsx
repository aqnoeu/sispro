import { useState } from 'react'
import { AuthContext } from './auth-context'
import { setDemoMode } from '../services/local/database'

const localUser = Object.freeze({ uid: 'sipro-local', displayName: 'Usuário local', role: 'Procurador', workspace: 'Procuradoria', sectorId: 'local', sectorName: 'Procuradoria', sectorSigla: 'PGM', isAdmin: false })
const demoUser = Object.freeze({ ...localUser, uid: 'sipro-demo-user', displayName: 'Usuário de demonstração', workspace: 'Setor de demonstração', sectorId: 'demo', sectorName: 'Setor de demonstração', sectorSigla: 'DEMO', isDemo: true })
const demoAdmin = Object.freeze({ ...localUser, uid: 'sipro-demo-admin', displayName: 'Administrador de demonstração', role: 'Administrador', workspace: 'Administração da Procuradoria', sectorId: 'pgm', sectorName: 'PGM', isAdmin: true, isDemo: true })

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  function enter(mode) {
    const user = { local: localUser, user: demoUser, admin: demoAdmin }[mode]
    if (!user) return
    setDemoMode(Boolean(user.isDemo))
    setCurrentUser(user)
  }
  function signOut() {
    setCurrentUser(null)
  }
  return <AuthContext.Provider value={{ currentUser, authReady: true, isLocalEnabled: true, enter, signOut }}>{children}</AuthContext.Provider>
}
