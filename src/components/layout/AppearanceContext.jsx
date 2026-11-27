import { createContext, useContext, useState } from 'react'
import { loadAppearance, saveAppearance } from '../../utils/appearance'
const Context = createContext(null)
function storage() { try { return globalThis.localStorage } catch { return undefined } }
export function AppearanceProvider({ userId, children }) {
 const [appearance,setAppearance] = useState(() => loadAppearance(userId,storage()))
 function update(patch) { const next=saveAppearance(userId,{...appearance,...patch},storage()); setAppearance(next) }
 return <Context.Provider value={{appearance,update}}>{children}</Context.Provider>
}
export function useAppearance() { return useContext(Context) }
