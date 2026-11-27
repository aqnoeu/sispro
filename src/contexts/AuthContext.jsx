import { AuthContext } from './auth-context'
const currentUser = Object.freeze({ uid: 'sipro-local', displayName: 'Usuário local', role: 'Procurador', workspace: 'Procuradoria', sectorId: 'local', sectorName: 'Procuradoria', sectorSigla: 'PGM', isAdmin: false })
const value = Object.freeze({ currentUser, authReady: true, isLocalEnabled: true })
export function AuthProvider({ children }) { return <AuthContext.Provider value={value}>{children}</AuthContext.Provider> }
