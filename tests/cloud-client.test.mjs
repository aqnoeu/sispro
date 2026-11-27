import test from 'node:test'
import assert from 'node:assert/strict'
import {CloudClient} from '../src/services/cloud/client.js'
const uid='00000000-0000-4000-8000-000000000001'
const config={url:'https://example.supabase.co',key:'sb_publishable_test'}
const ok=(body,status=200)=>({ok:status<400,status,json:async()=>body})
const fixture=(role='user')=>{const calls=[];let reply=[ok({access_token:'token',expires_in:300,user:{id:uid,email:'test@example.invalid'}}),ok([{user_id:uid,display_name:'Teste',role,active:true}])];const c=new CloudClient({...config,fetcher:async(url,opts)=>{calls.push({url,opts});return reply.shift()}});return {c,calls,reply}}
test('refuses missing configuration and secret keys',async()=>{const c=new CloudClient({...config,key:'sb_secret_fake',fetcher:()=>assert.fail('network')});assert.equal(c.configured,false);await assert.rejects(c.signIn('a','b'),/configurado/)})
test('role is read from server profile, not from login input',async()=>{const {c,calls}=fixture('admin');let user=await c.signIn('test@example.invalid','fake');assert.equal(user.isAdmin,true);assert.equal(calls[1].opts.headers.Authorization,'Bearer token');assert.equal(calls[0].opts.headers.apikey,config.key)})
test('missing profile blocks session',async()=>{const {c,reply}=fixture();reply[1]=ok([]);reply.push(ok(null,204));await assert.rejects(c.signIn('a','b'),/autorização/);assert.equal(c.session,null)})
test('own snapshot and compare-and-swap writes',async()=>{const {c,calls,reply}=fixture();await c.signIn('a','b');reply.push(ok([{data:{processos:{}},revision:3}]),ok([{revision:4}]));const state=await c.read();await c.write(state,{processos:{x:{}}});assert.match(calls[3].url,/revision=eq.3/);assert.equal(JSON.parse(calls[3].opts.body).revision,4)})
test('zero-row update reports conflict, logout blocks subsequent access',async()=>{const {c,reply}=fixture();await c.signIn('a','b');reply.push(ok([{data:{},revision:2}]),ok([]),ok(null,204));const s=await c.read();await assert.rejects(c.write(s,{}),/Conflito/);await c.signOut();await assert.rejects(c.read(),/Sessão/);await assert.rejects(c.write(s,{}),/Sessão/)})
