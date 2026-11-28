import test from 'node:test'
import assert from 'node:assert/strict'
import {createWebDrive,makeZip,crc32,encodeBase64,decodeBase64} from '../src/utils/webAutos.js'
import {fromBase64,createFiles} from '../supabase/functions/sispro-drive-test/files.mjs'
test('base64 PDF roundtrip and rejection',()=>{const b=new TextEncoder().encode('%PDF-1.4');assert.deepEqual(decodeBase64(encodeBase64(b)),b);assert.deepEqual(fromBase64(encodeBase64(b)),b);assert.throws(()=>fromBase64(btoa('not pdf')))})
test('web adapter scopes requests and never receives credentials',async()=>{const calls=[];const d=createWebDrive(async body=>{calls.push(body);return body.action==='files-read'?{data:btoa('%PDF-1.4')}:[]});await d.listFiles('p1');await d.readFile('p1','drive:x');assert.deepEqual(calls,[{action:'files-list',processId:'p1'},{action:'files-read',processId:'p1',fileId:'drive:x'}])})
test('ZIP structure and CRC',async()=>{const b=new TextEncoder().encode('123456789');assert.equal(crc32(b),0xcbf43926);const result=new Uint8Array(await makeZip([{name:'a.txt',data:b}]).arrayBuffer());const v=new DataView(result.buffer);assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint32(result.length-22,true),0x06054b50)})
test('Drive cannot read a file outside the authorized folder',async()=>{const d=createFiles({token:'fake',userId:'u',processId:'p',numero:'QA',fetcher:async()=>new Response(JSON.stringify({files:[]}))});await assert.rejects(d.read('drive:outside'),/fora destes autos/)})
