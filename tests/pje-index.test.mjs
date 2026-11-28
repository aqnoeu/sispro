import test from 'node:test'
import assert from 'node:assert/strict'
import {parsePjeIndex,attachPjeIndex,matchPjeIndex,importedMetadata} from '../src/utils/pjeIndex.js'
import {enrichDocuments,navigationDocuments,filterDocuments} from '../src/utils/documentTimeline.js'
test('PJe index preserves titles and exact timestamp, signature is not filing',()=>{
 const index=parsePjeIndex('Documentos\nId. Data da Assinatura Documento Tipo\n123456 25/11/2026 15:32:48\tPetição de defesa\tContestação\n234567 25/11/2026 14:18\tCertidão\tCertidão',['123456','234567'])
 assert.equal(index.get('123456').title,'Petição de defesa');assert.equal(index.get('123456').documentType,'Contestação');assert.equal(index.get('123456').indexTime,'15:32:48');assert.equal(index.get('123456').indexDateKind,'assinatura')
 const docs=[{id:'a',name:'Documento 123456 (p. 3-4).pdf',date:'2026-12-01'},{id:'b',name:'Documento 234567 (p. 5-5).pdf',date:'2026-12-01'},{id:'c',name:'Capa e páginas iniciais (p. 1-2).pdf'}]
 const pairs=matchPjeIndex(docs,index);const meta=pairs.map(({document,entry})=>({documentKey:document.id,...importedMetadata(entry)}))
 const enriched=enrichDocuments(docs,meta);assert.equal(enriched[0].dateOrigin,'assinatura');assert.equal(enriched[0].joinedAt,'');assert.equal(enriched[0].reference,'123456');assert.deepEqual(filterDocuments(navigationDocuments(enriched)).map(x=>x.id),['a','b']);assert.equal(navigationDocuments(enriched,true).length,3)
 assert.equal(attachPjeIndex([{id:'123456',name:docs[0].name}],index)[0].pje.title,'Petição de defesa')
})
test('index ignores unverified dates, unrelated IDs and conflicting rows',()=>{
 const text='Id. Data da Juntada Documento Tipo\n123456 31/02/2026 10:00 X\n234567 25/11/2026 15:00 A\n234567 25/11/2026 16:00 B\n345678 25/11/2026 15:00 C'
 assert.equal(parsePjeIndex(text,['123456','234567']).size,0)
 assert.equal(parsePjeIndex('123456 25/11/2026 10:00 Petição').size,0)
})
