import test from 'node:test'
import assert from 'node:assert/strict'
import {createPdfSessionCache} from '../src/utils/pdfSessionCache.js'
test('cache deduplicates in-flight reads, evicts and clears',async()=>{
 const cache=createPdfSessionCache(8,2);let calls=0;const read=()=>{calls++;return new Blob(['abcd'])}
 await Promise.all([cache.get('a',read),cache.get('a',read)]);await cache.get('a',read);assert.equal(calls,1)
 await cache.get('b',read);await cache.get('c',read);await cache.get('a',read);assert.equal(calls,4)
 cache.clear();await cache.get('a',read);assert.equal(calls,5)
})
