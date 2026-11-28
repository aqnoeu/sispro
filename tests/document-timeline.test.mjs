import test from 'node:test';import assert from 'node:assert/strict';import {dateKey,enrichDocuments,filterDocuments,groupTimeline,validateMetadata} from '../src/utils/documentTimeline.js';
test('datas brasileiras e ISO válidas; datas impossíveis rejeitadas',()=>{assert.equal(dateKey('02/12/2026'),'2026-12-02');assert.equal(dateKey('2026-11-30T12:00:00Z'),'2026-11-30');assert.equal(dateKey('31/02/2026'),'');assert.equal(dateKey(''),'' )});
test('juntada informada não se confunde com data de armazenamento ou prazo',()=>{const rows=enrichDocuments([{id:'a',name:'Certidão',source:'local',date:'2026-11-27T00:00:00Z'},{id:'b',name:'Petição',source:'link',date:'02/12/2026'},{id:'c',name:'Sem data',source:'drive'}],[{documentKey:'a',type:'Certidão',joinedAt:'2026-10-01',reference:'123'}]);assert.equal(rows[0].sortDate,'2026-10-01');assert.equal(rows[0].dateOrigin,'juntada');assert.equal(rows[1].joinedAt,'');assert.equal(rows[1].dateOrigin,'referência');assert.deepEqual(filterDocuments(rows).map(r=>r.id),['b','a','c']);assert.deepEqual(filterDocuments(rows,{ascending:true}).map(r=>r.id),['a','b','c']);assert.equal(filterDocuments(rows,{search:'certidao',type:'Certidão',source:'local',from:'2026-10-01',to:'2026-10-01'}).length,1);assert.equal(groupTimeline(filterDocuments(rows)).length,3)});
test('metadados validados e referência opcional',()=>{assert.deepEqual(validateMetadata({type:'Sentença',joinedAt:'',reference:' 42 '}),{type:'Sentença',joinedAt:'',reference:'42'});assert.throws(()=>validateMetadata({type:'x'}));assert.throws(()=>validateMetadata({type:'Sentença',joinedAt:'2026-02-31'}))});

test('judicial chronology overrides scrambled index order; ties keep principal before attachments',async()=>{
 const {compareJudicial,groupJudicialAttachments}=await import('../src/utils/documentTimeline.js')
 const mk=(id,day,time,order,type)=>({id,sortDate:day,sortTime:time,indexDate:day,indexTime:time,indexDateKind:'assinatura',pjeOrder:order,pjeType:type,kind:'document'})
 const rows=[mk('old','2026-09-23','19:21',1,'Petição Inicial'),mk('a','2026-10-19','23:05',4,'Documento de comprovação'),mk('p','2026-10-19','23:05',3,'Contestação'),mk('new','2026-10-20','14:26',2,'Certidão'),mk('orphan','2026-10-19','23:05',6,'Outros documentos')]
 rows.sort((a,b)=>compareJudicial(a,b))
 assert.deepEqual(rows.map(d=>d.id),['new','p','a','orphan','old'])
 const groups=groupJudicialAttachments(rows);assert.deepEqual(groups.map(g=>[g.main.id,g.children.map(d=>d.id)]),[['new',[]],['p',['a']],['orphan',[]],['old',[]]])
})
