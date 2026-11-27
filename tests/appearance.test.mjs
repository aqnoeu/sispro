import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAppearance,saveAppearance,normalizeAppearance } from '../src/utils/appearance.js'
test('preferências isoladas por perfil e persistentes',()=>{const m=new Map();const storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};assert.deepEqual(loadAppearance('a',storage),{menu:'side',expanded:false,motion:true});saveAppearance('a',{menu:'top',expanded:true,motion:false},storage);assert.deepEqual(loadAppearance('a',storage),{menu:'top',expanded:true,motion:false});assert.equal(loadAppearance('b',storage).menu,'side');assert.equal(normalizeAppearance({menu:'invalid'}).menu,'side')})
