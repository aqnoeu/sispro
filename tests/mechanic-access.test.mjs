import test from 'node:test'
import assert from 'node:assert/strict'
import {canAccess,canOpenRoute} from '../src/utils/mechanicAccess.js'
for(const n of [0,1,2,3])test('nível '+n,()=>{
 const u={isCloud:true,profileMode:'standard',levels:{processos:n,jurisprudencia:n}}
 assert.equal(canAccess(u,'processos'),n>=1)
 assert.equal(canAccess(u,'processos',2),n>=2)
 assert.equal(canAccess(u,'processos',3),n>=3)
 assert.equal(canOpenRoute(u,'/processos'),n>=1)
 assert.equal(canOpenRoute(u,'/jurisprudencia/cadastro'),n>=2)
 assert.equal(canOpenRoute(u,'/processos/123/autos'),false)
 assert.equal(canAccess(u,'unknown'),false)
})
test('CEO e PGM preservados',()=>{for(const profileMode of ['ceo','pgm'])assert.equal(canAccess({isCloud:true,profileMode},'processos',3),true)})
