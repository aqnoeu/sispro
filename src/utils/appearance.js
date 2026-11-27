const key = 'procuradorias.appearance.v1'
const memory = new Map()
export const defaults = Object.freeze({ menu:'side', expanded:false, motion:true })
export function normalizeAppearance(value) {
 return { menu:value?.menu === 'top' ? 'top' : 'side', expanded:value?.expanded === true, motion:value?.motion !== false }
}
export function loadAppearance(userId, storage) {
 const id = key + ':' + String(userId || 'local')
 try { return normalizeAppearance(JSON.parse(storage?.getItem(id) || 'null') ?? memory.get(id)) } catch { return normalizeAppearance(memory.get(id)) }
}
export function saveAppearance(userId, value, storage) {
 const id = key + ':' + String(userId || 'local')
 const result = normalizeAppearance(value)
 memory.set(id,result)
 try { storage?.setItem(id,JSON.stringify(result)) } catch { /* session fallback */ }
 return result
}
