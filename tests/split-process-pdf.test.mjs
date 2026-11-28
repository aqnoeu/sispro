import test from 'node:test'
import assert from 'node:assert/strict'
import {PDFDocument} from 'pdf-lib'
import {groupPjePages,splitProcessPdf} from '../src/utils/splitProcessPdf.js'
import {extractProcessFields} from '../src/utils/processPdfFields.js'
test('PJe pages are grouped by document ID and sequential page numbers; no pages lost',async()=>{
 const groups=groupPjePages(['Capa','Num. 123456 - Pág. 1','Num. 123456 - Pág. 2','sem marcador','Num. 234567 - Pág. 1'])
 assert.deepEqual(groups.map(g=>[g.id,g.start,g.end]),[['',1,1],['123456',2,3],['',4,4],['234567',5,5]])
 const pdf=await PDFDocument.create();for(let i=0;i<5;i++)pdf.addPage()
 const data=await pdf.save(),file={name:'autos.pdf',arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}
 const parts=await splitProcessPdf(file,groups)
 assert.deepEqual(await Promise.all(parts.map(async p=>(await PDFDocument.load(p.bytes)).getPageCount())),[1,2,1,1])
})
test('unmarked PDF stays whole',()=>{assert.deepEqual(groupPjePages(['a','b']).map(g=>[g.start,g.end,g.identified]),[[1,2,false]])})
test('PJe cover recognizes Número and active party',()=>{const r=extractProcessFields('Número: 0000001-00.2026.8.08.0011\nPESSOA FICTÍCIA (AUTOR)');assert.equal(r.fields.numero,'0000001-00.2026.8.08.0011');assert.equal(r.fields.parte,'PESSOA FICTÍCIA')})
