import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context'
import { setDemoMode, initializePreview, configureCloud } from '../services/local/database'
import { isCloud, isPreview, createPreviewData } from '../data/preview'
import { CloudClient } from '../services/cloud/client.js'
const cloud = isCloud ? new CloudClient({url:import.meta.env.VITE_SUPABASE_URL,key:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}) : null
if (cloud) configureCloud(cloud)
if (isPreview) initializePreview(createPreviewData())

const localUser = Object.freeze({ uid: 'sipro-local', displayName: 'Usuário local', role: 'Procurador', workspace: 'Procuradoria', sectorId: 'local', sectorName: 'Procuradoria', sectorSigla: 'PGM', isAdmin: false })
const demoUser = Object.freeze({ ...localUser, uid: 'sipro-demo-user', email: 'usuario@sipro.local', displayName: 'Usuário de demonstração', workspace: 'Setor de demonstração', sectorId: 'demo', sectorName: 'Setor de demonstração', sectorSigla: 'DEMO', isDemo: true })
const demoAdmin = Object.freeze({ ...localUser, uid: 'sipro-demo-admin', email: 'admin@sipro.local', displayName: 'Administrador de demonstração', role: 'Administrador', workspace: 'Administração da Procuradoria', sectorId: 'pgm', sectorName: 'PGM', isAdmin: true, isDemo: true })

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  useEffect(() => {
    if (!cloud || !currentUser) return
    const timer=setTimeout(() => { cloud.signOut().catch(()=>{}); setCurrentUser(null) }, Math.max(0,cloud.session.expires-Date.now()))
    return () => clearTimeout(timer)
  }, [currentUser])
  async function signIn(email,password) { if (!cloud) throw new Error('Login web indisponível.'); const user=await cloud.signIn(email,password); setCurrentUser(user) }
  async function switchProfile(mode) { if (!cloud) throw new Error('Subperfil indisponível.'); const user=await cloud.switchProfile(mode); setCurrentUser(user) }
  function enter(mode) {
    if (isCloud) return
    const user = { local: localUser, user: demoUser, admin: demoAdmin }[mode]
    if (!user || (isPreview && mode === 'local')) return
    setDemoMode(Boolean(user.isDemo))
    setCurrentUser(user)
  }
  function signOut() {
    if (cloud) cloud.signOut().catch(()=>{})
    setCurrentUser(null)
  }
  return <AuthContext.Provider value={{ currentUser, authReady: true, isLocalEnabled: !isCloud, cloudReady:cloud?.configured ?? false, enter, signIn, signOut, switchProfile, manageAccount:(body)=>cloud.manageAccount(body), adminTable:(...args)=>cloud.adminTable(...args), listProfiles:()=>cloud.listProfiles() }}>{children}</AuthContext.Provider>
}
