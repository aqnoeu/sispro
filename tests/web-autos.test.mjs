import test from 'node:test'
import assert from 'node:assert/strict'
import {createWebDrive,makeZip,crc32,encodeBase64,decodeBase64} from '../src/utils/webAutos.js'
import {fromBase64,createFiles} from '../supabase/functions/sispro-drive-test/files.mjs'
test('base64 PDF roundtrip and rejection',()=>{const b=new TextEncoder().encode('%PDF-1.4');assert.deepEqual(decodeBase64(encodeBase64(b)),b);assert.deepEqual(fromBase64(encodeBase64(b)),b);assert.throws(()=>fromBase64(btoa('not pdf')))})
test('web adapter scopes requests and never receives credentials',async()=>{const calls=[];const d=createWebDrive(async body=>{calls.push(body);return body.action==='files-read'?{data:btoa('%PDF-1.4')}:[]});await d.listFiles('p1');await d.readFile('p1','drive:x');assert.deepEqual(calls,[{action:'files-list',processId:'p1'},{action:'files-read',processId:'p1',fileId:'drive:x'}])})
test('ZIP structure and CRC',async()=>{const b=new TextEncoder().encode('123456789');assert.equal(crc32(b),0xcbf43926);const result=new Uint8Array(await makeZip([{name:'a.txt',data:b}]).arrayBuffer());const v=new DataView(result.buffer);assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint32(result.length-22,true),0x06054b50)})
test('Drive cannot read a file outside the authorized folder',async()=>{const d=createFiles({token:'fake',userId:'u',processId:'p',numero:'QA',fetcher:async()=>new Response(JSON.stringify({files:[]}))});await assert.rejects(d.read('drive:outside'),/fora destes autos/)})

test('large web upload uses bounded chunks and resumes from acknowledged bytes',async()=>{
 const bytes=new Uint8Array(6*1024*1024+17);bytes.set(new TextEncoder().encode('%PDF-1.7'));const calls=[];let next=0,fail=true
 const d=createWebDrive(async b=>{calls.push(b.action);if(b.action==='files-upload-start')return {handle:'sealed',next:0};if(b.action==='files-upload-status')return {next};if(b.action==='files-upload-chunk'){assert.equal(b.offset,next);const chunk=decodeBase64(b.data);assert.ok(chunk.length<=2*1024*1024);next+=chunk.length;if(fail){fail=false;throw Error('network')}return next===bytes.length?{file:{id:'drive:large'}}:{next}}throw Error('unexpected')})
 assert.equal((await d.uploadBytes('p1','large.pdf',bytes)).id,'drive:large');assert.equal(next,bytes.length);assert.ok(calls.includes('files-upload-status'))
})
test('large web download reassembles bounded ranges',async()=>{
 const bytes=new Uint8Array(6*1024*1024+9);bytes.set(new TextEncoder().encode('%PDF-1.7'))
 const d=createWebDrive(async b=>{assert.equal(b.action,'files-read-block');const part=bytes.subarray(b.offset,b.offset+2*1024*1024);return {data:encodeBase64(part),total:bytes.length,next:b.offset+part.length}})
 assert.deepEqual(await d.readFile('p1','drive:x',bytes.length),bytes)
})
test('encrypted upload handles are bound to the user and process',async()=>{
 const {sealUpload,openUpload}=await import('../supabase/functions/sispro-drive-test/files.mjs')
 const state={userId:'u',processId:'p',total:6000000,sha:'a'.repeat(64),url:'https://www.googleapis.com/upload/drive/v3/files?upload_id=secret',expires:Date.now()+10000}
 const handle=await sealUpload('fake-secret',state);assert.ok(!handle.includes('upload_id'));assert.deepEqual(await openUpload('fake-secret',handle,'u','p'),state);await assert.rejects(openUpload('fake-secret',handle,'u','other'));await assert.rejects(openUpload('wrong-secret',handle,'u','p'))
})
