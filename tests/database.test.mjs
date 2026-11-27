import test from 'node:test';
import assert from 'node:assert/strict';
import { database, collection, doc, addDoc, setDoc, deleteDoc, getDocs, query, where, or, orderBy, limit, arrayUnion, writeBatch, onSnapshot } from '../src/services/local/database.js';
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
test('base vazia, CRUD, filtros, lotes, observação e persistência', async () => {
  const c = collection(database, 'processos'); assert.equal((await getDocs(c)).size, 0);
  const a = await addDoc(c, { numero: 'A', rank: 2, tags: [] });
  const b = doc(database, 'processos', 'b'); const batch = writeBatch(); batch.set(b, { numero: 'B', rank: 1 }); batch.set(a, { tags: arrayUnion('novo', 'novo') }, { merge: true }); await batch.commit();
  assert.deepEqual((await getDocs(a)).data().tags, ['novo']);
  const result = await getDocs(query(c, or(where('numero', '==', 'A'), where('numero', '==', 'B')), orderBy('rank'), limit(1))); assert.equal(result.docs[0].id, 'b');
  let last; const unsubscribe = onSnapshot(c, s => { last = s.size }); await deleteDoc(b); await Promise.resolve(); assert.equal(last, 1); unsubscribe();
  assert.equal(JSON.parse([...storage.values()][0]).processos[a.id].numero, 'A');
  await assert.rejects(setDoc(doc(database, 'processos', '__proto__'), {}));
});
