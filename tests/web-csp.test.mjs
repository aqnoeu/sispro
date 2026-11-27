import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {applyConnectionPolicy,SISPRO_ORIGIN} from '../scripts/web-csp.mjs'
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8')
test('web CSP permits only the dedicated Supabase origin',()=>{
 const result=applyConnectionPolicy(html,'web')
 assert.match(result,/connect-src https:\/\/ntvxipvivhhjaebnnvcq\.supabase\.co;/)
 assert.equal(result,html.replace("connect-src 'none'",'connect-src '+SISPRO_ORIGIN))
})
test('desktop and Pages preview keep all original restrictions',()=>{
 for(const mode of ['production','development','preview'])assert.equal(applyConnectionPolicy(html,mode),html)
 assert.throws(()=>applyConnectionPolicy('<html/>','web'),/baseline/)
})
