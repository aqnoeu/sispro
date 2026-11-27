import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SISPRO_ORIGIN} from './web-csp.mjs'
const html=readFileSync('dist/index.html','utf8')
assert.ok(html.includes('connect-src '+SISPRO_ORIGIN+';'),'Web build must allow only Sispro Supabase')
assert.ok(html.includes("object-src 'none'")&&html.includes("form-action 'none'"),'Original security restrictions missing')
assert.ok(!html.includes("connect-src 'none'"),'Web connection blocked')
console.log('PASS: emitted HTML CSP permits the dedicated Supabase origin')
