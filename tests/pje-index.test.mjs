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

test('PJe rows with date and time on separate physical lines',()=>{
 const index=parsePjeIndex('Id.\nData da Assinatura\nDocumento\tTipo\n123456\t25/11/2026\tPetição de defesa\tContestação\n15:32\n234567\n25/11/2026\n14:18\nCertidão\tCertidão',['123456','234567'])
 assert.equal(index.get('123456').indexTime,'15:32');assert.equal(index.get('123456').title,'Petição de defesa')
 assert.equal(index.get('234567').indexTime,'14:18');assert.equal(index.get('234567').title,'Certidão')
})

test('navigation follows original PDF page order even when Drive IDs and upload times are scrambled',async()=>{
 const {orderPjeDocuments}=await import('../src/utils/documentTimeline.js')
 const docs=enrichDocuments([
  {id:'a',name:'Documento 107557240 (p. 106-106).pdf',date:'2026-11-28T02:53:00Z'},
  {id:'z',name:'Documento 107599175 (p. 83-83).pdf',date:'2026-11-28T02:55:00Z'},
  {id:'b',name:'Documento 107557235 (p. 100-101).pdf',date:'2026-11-28T02:54:00Z'},
  {id:'c',name:'Capa e páginas iniciais (p. 1-2).pdf'}
 ],[])
 assert.deepEqual(navigationDocuments(orderPjeDocuments(docs)).map(d=>d.id),['z','b','a'])
 assert.equal(docs[0].sortDate,'');assert.equal(docs[0].dateOrigin,'pje-desconhecida')
 assert.deepEqual(filterDocuments(navigationDocuments(orderPjeDocuments(docs)),{preserveOrder:true}).map(d=>d.id),['z','b','a'])
})
test('explicit PJe index order takes precedence over timestamp and PDF page order when complete',async()=>{
 const {orderPjeDocuments}=await import('../src/utils/documentTimeline.js')
 const index=parsePjeIndex('Id. Data da Assinatura Documento Tipo\n234567 26/11/2026 10:00 Certidão\tCertidão\n123456 25/11/2026 09:00 Petição\tPetição')
 const rows=[{id:'a',name:'Documento 123456 (p. 3-4).pdf'},{id:'b',name:'Documento 234567 (p. 5-6).pdf'}]
 const pairs=matchPjeIndex(rows,index),meta=pairs.map(({document,entry})=>({documentKey:document.id,...importedMetadata(entry)}))
 assert.deepEqual(orderPjeDocuments(enrichDocuments(rows,meta)).map(d=>d.id),['b','a'])
 assert.deepEqual(orderPjeDocuments(enrichDocuments(rows,meta.slice(0,1))).map(d=>d.id),['a','b'])
})

test('narrow PJe ID column wraps across lines and header has split signature label',()=>{
 const index=parsePjeIndex('Id. Data da Documento Tipo\nAssinatura\n10958\t20/10/2026 14:26\tCertidão - Análise\tCertidão - Análise\n0483\tTempestividade/Preparo\n10954\t19/10/2026 23:05\tContestação\tContestação\n9510',['109580483','109549510'])
 assert.equal(index.size,2);assert.equal(index.get('109580483').indexTime,'14:26');assert.equal(index.get('109549510').title,'Contestação')
})
test('physical PJe columns reconstruct wrapped IDs, document and type independently',async()=>{
 const {pjeTableRows}=await import('../src/utils/pjeIndex.js')
 const row=(y,...cells)=>({y,items:cells.map(([x,str,width=20])=>({x,str,width}))})
 const rows=[row(500,[14,'Id.',10],[65,'Data da',36],[142,'Documento',60],[570,'Tipo',24]),row(488,[62,'Assinatura',52]),row(475,[4,'10958',30],[42,'20/10/2026 14:26',90],[143,'Certidão - Análise Tempestividade/Preparo',280],[485,'Certidão - Análise',100]),row(463,[4,'0483',25],[490,'Tempestividade/Preparo',130]),row(451,[4,'10954',30],[42,'19/10/2026 23:05',90],[143,'Contestação',70],[540,'Contestação',70]),row(439,[4,'9510',25])]
 const index=parsePjeIndex(pjeTableRows(rows,700),['109580483','109549510'])
 assert.equal(index.size,2);assert.equal(index.get('109580483').title,'Certidão - Análise Tempestividade/Preparo');assert.equal(index.get('109580483').documentType,'Certidão - Análise Tempestividade/Preparo');assert.equal(index.get('109549510').indexOrder,2)
})
