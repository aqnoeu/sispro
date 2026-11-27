// Offline document store. Electron persists the data in its per-user directory.
const key = 'sipro-local-v1'
const bridge = () => globalThis.siproStorage
let demoMode = false
let previewOnly = false
let demoData = {}
export function setDemoMode(enabled) { demoMode = previewOnly || enabled }
export function initializePreview(seed) { previewOnly = true; demoMode = true; demoData = clone(seed) }
const read = () => demoMode ? clone(demoData) : bridge() ? bridge().read() : JSON.parse(globalThis.localStorage.getItem(key) || '{}')
const write = (data) => { if (demoMode) { demoData = clone(data); return } return bridge() ? bridge().write(data) : globalThis.localStorage.setItem(key, JSON.stringify(data)) }
const listeners = new Set()
const clone = (value) => JSON.parse(JSON.stringify(value))
const notify = () => { for (const listener of [...listeners]) queueMicrotask(listener) }
export const database = Object.freeze({ local: true })
export const collection = (_db, name) => ({ name })
export const doc = (dbOrCollection, name, id) => dbOrCollection.name ? { name: dbOrCollection.name, id: name || globalThis.crypto.randomUUID() } : { name, id: id || globalThis.crypto.randomUUID() }
export const where = (field, operator, value) => ({ type: 'where', field, operator, value })
export const or = (...constraints) => ({ type: 'or', constraints })
export const orderBy = (field, direction = 'asc') => ({ type: 'orderBy', field, direction })
export const limit = (count) => ({ type: 'limit', count })
export const query = (ref, ...constraints) => ({ ...ref, constraints })
export const arrayUnion = (...items) => ({ __siproArrayUnion: items })
const snapshot = (id, data) => ({ id, exists: () => data !== undefined, data: () => data === undefined ? undefined : clone(data) })
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function matches(row, rule) {
  if (rule.type === 'or') return rule.constraints.some(c => matches(row, c))
  const value = row[rule.field]
  switch (rule.operator) {
    case '==': return equal(value, rule.value)
    case '!=': return !equal(value, rule.value)
    case 'in': return rule.value.some(x => equal(value, x))
    case 'array-contains': return Array.isArray(value) && value.some(x => equal(x, rule.value))
    case '<': return value < rule.value
    case '<=': return value <= rule.value
    case '>': return value > rule.value
    case '>=': return value >= rule.value
    default: throw new Error('Filtro local não suportado: ' + rule.operator)
  }
}
function resolve(ref) {
  const rows = read()[ref.name] || {}
  if (ref.id) return snapshot(ref.id, Object.hasOwn(rows, ref.id) ? rows[ref.id] : undefined)
  let entries = Object.entries(rows)
  const constraints = ref.constraints || []
  for (const rule of constraints.filter(c => c.type === 'where' || c.type === 'or')) entries = entries.filter(([, row]) => matches(row, rule))
  for (const rule of constraints.filter(c => c.type === 'orderBy').reverse()) entries.sort((a, b) => { const x = a[1][rule.field], y = b[1][rule.field]; const comparison = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR'); return rule.direction === 'desc' ? -comparison : comparison })
  for (const rule of constraints.filter(c => c.type === 'limit')) entries = entries.slice(0, rule.count)
  const docs = entries.map(([id, data]) => snapshot(id, data))
  return { docs, empty: docs.length === 0, size: docs.length }
}
export async function getDocs(ref) { return resolve(ref) }
export function onSnapshot(ref, callback, error) {
  let active = true
  const listener = () => { if (!active) return; try { callback(resolve(ref)) } catch (e) { if (error) error(e); else console.error(e) } }
  listeners.add(listener); queueMicrotask(listener)
  return () => { active = false; listeners.delete(listener) }
}
function safeKey(value) { if (typeof value !== 'string' || !value || ['__proto__','constructor','prototype'].includes(value)) throw new Error('Identificador inválido.'); return value }
function apply(data, ref, payload, merge, remove = false) {
  const name = safeKey(ref.name), id = safeKey(ref.id)
  if (!Object.hasOwn(data, name)) data[name] = {}
  const table = data[name]
  if (remove) { delete table[id]; return }
  const prior = Object.hasOwn(table, id) ? table[id] : {}
  const next = merge ? { ...prior } : {}
  for (const [k, v] of Object.entries(payload)) {
    safeKey(k)
    if (v && typeof v === 'object' && Array.isArray(v.__siproArrayUnion)) {
      const arr = Array.isArray(prior[k]) ? [...prior[k]] : []
      for (const item of v.__siproArrayUnion) if (!arr.some(x => equal(x, item))) arr.push(item)
      next[k] = arr
    } else if (v !== undefined) next[k] = v
  }
  table[id] = next
}
function commit(operations) { const data = read(); for (const op of operations) apply(data, ...op); write(data); notify() }
export async function setDoc(ref, data, options = {}) { commit([[ref, data, !!options.merge]]) }
export async function addDoc(ref, data) { const target = doc(ref); await setDoc(target, data); return target }
export async function deleteDoc(ref) { commit([[ref, {}, false, true]]) }
export function writeBatch() { const ops = []; return { set(ref, data, options = {}) { ops.push([ref, data, !!options.merge]); return this }, delete(ref) { ops.push([ref, {}, false, true]); return this }, async commit() { commit(ops) } } }
