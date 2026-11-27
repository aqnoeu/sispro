import test from 'node:test'
import assert from 'node:assert/strict'
import { database, collection, doc, setDoc, getDocs, setDemoMode } from '../src/services/local/database.js'
test('demonstração não toca no banco real e mantém sessão temporária', async () => {
  let real = {}
  globalThis.siproStorage = { read: () => structuredClone(real), write: value => { real = structuredClone(value) } }
  const ref = collection(database, 'processos')
  setDemoMode(false)
  await setDoc(doc(ref, 'real'), { assunto: 'registro real' })
  setDemoMode(true)
  assert.equal((await getDocs(ref)).size, 0)
  await setDoc(doc(ref, 'demo'), { assunto: 'registro de teste' })
  assert.equal((await getDocs(ref)).docs[0].id, 'demo')
  assert.deepEqual(Object.keys(real.processos), ['real'])
  setDemoMode(false)
  assert.equal((await getDocs(ref)).docs[0].id, 'real')
  setDemoMode(true)
  assert.equal((await getDocs(ref)).docs[0].id, 'demo')
  setDemoMode(false)
  delete globalThis.siproStorage
})
