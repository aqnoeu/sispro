import test from 'node:test'
import assert from 'node:assert/strict'
import { initializePreview, setDemoMode, database, collection, doc, getDocs, setDoc } from '../src/services/local/database.js'
test('preview nunca acessa armazenamento persistente mesmo ao desativar demonstração', async () => {
  const fail = () => { throw new Error('acesso persistente proibido') }
  globalThis.siproStorage = { read: fail, write: fail }
  initializePreview({ processos: { exemplo: { assunto: 'fictício' } } })
  setDemoMode(false)
  const ref = collection(database, 'processos')
  assert.equal((await getDocs(ref)).size, 1)
  await setDoc(doc(ref,'novo'), { assunto:'teste' })
  assert.equal((await getDocs(ref)).size, 2)
  delete globalThis.siproStorage
})
