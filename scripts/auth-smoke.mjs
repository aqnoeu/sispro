// Run only against the dedicated Sispro staging project. Never print passwords, tokens or response bodies.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
const url=process.env.VITE_SUPABASE_URL
const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.equal(url,'https://ntvxipvivhhjaebnnvcq.supabase.co','Wrong staging project')
assert.ok(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||''),'Publishable key required')
async function call(path,{method='GET',body,token,prefer}={}) {
  const headers={apikey:key,'Content-Type':'application/json'}
  if(token)headers.Authorization='Bearer '+token
  if(prefer)headers.Prefer=prefer
  const response=await fetch(url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)})
  let data=null
  try{data=await response.json()}catch{}
  return {status:response.status,ok:response.ok,data}
}
function check(condition,label){if(!condition)throw new Error('FAIL: '+label);console.log('PASS: '+label)}
const rest='/rest/v1/'
const auth='/auth/v1/'
const marker=randomUUID()
async function publicChecks(){
  const settings=await call(auth+'settings')
  check(settings.ok,'Auth settings endpoint')
  console.log('SETTINGS: disable_signup='+String(settings.data?.disable_signup)+'; anonymous='+String(settings.data?.external?.anonymous))
  const a=await call(rest+'sispro_profiles?select=user_id&limit=1')
  const b=await call(rest+'sispro_workspaces?select=user_id&limit=1')
  check([401,403].includes(a.status)&&[401,403].includes(b.status),'unauthenticated Data API blocked')
  const bad=await call(auth+'token?grant_type=password',{method:'POST',body:{email:'nonexistent-'+marker+'@example.invalid',password:randomUUID()}})
  check(!bad.ok&&[400,401,403,422].includes(bad.status),'invalid password grant rejected')
  return settings.data?.disable_signup===true&&settings.data?.external?.anonymous===false
}
async function login(prefix){
  const email=process.env['SISPRO_'+prefix+'_EMAIL'],password=process.env['SISPRO_'+prefix+'_PASSWORD']
  check(typeof email==='string'&&email.endsWith('@example.invalid')&&!!password,'disposable test identity configured: '+prefix)
  const r=await call(auth+'token?grant_type=password',{method:'POST',body:{email,password}})
  check(r.ok&&typeof r.data?.access_token==='string'&&r.data.access_token.split('.').length===3&&!!r.data?.refresh_token&&!!r.data?.user?.id,'real password grant and JWT: '+prefix)
  const session={id:r.data.user.id,token:r.data.access_token,refresh:r.data.refresh_token}
  const me=await call(auth+'user',{token:session.token})
  check(me.ok&&me.data?.id===session.id,'server validates JWT: '+prefix)
  return session
}
async function accounts(){
  const sessions=[]
  try{
    for(const name of ['A','B','ADMIN'])sessions.push(await login(name))
    const [a,b,c]=sessions
    check(new Set(sessions.map(s=>s.id)).size===3,'three distinct test identities')
    for(const [s,role] of [[a,'user'],[b,'user'],[c,'admin']]){
      const p=await call(rest+'sispro_profiles?select=user_id,role,active&user_id=eq.'+s.id,{token:s.token})
      check(p.ok&&p.data?.length===1&&p.data[0].role===role&&p.data[0].active===true,'authorized profile: '+role)
      const existing=await call(rest+'sispro_workspaces?select=user_id',{token:s.token})
      check(existing.ok&&existing.data?.length===0,'empty disposable workspace')
      if(s!==c){const w=await call(rest+'sispro_workspaces',{token:s.token,method:'POST',body:{user_id:s.id,data:{smoke:marker},revision:1},prefer:'return=representation'})
        check(w.ok&&w.data?.length===1,'own workspace created')}
    }
    const rows=await call(rest+'sispro_workspaces?select=user_id',{token:a.token})
    check(rows.ok&&rows.data?.length===1&&rows.data[0].user_id===a.id,'A sees only own workspace')
    const cross=await call(rest+'sispro_workspaces?user_id=eq.'+b.id,{token:a.token,method:'PATCH',body:{data:{forbidden:true}},prefer:'return=representation'})
    check([401,403].includes(cross.status)||(cross.ok&&cross.data?.length===0),'cross-user update blocked')
    const admin=await call(rest+'sispro_workspaces?select=user_id',{token:c.token})
    check(admin.ok&&admin.data?.length===0,'administrator cannot read other workspaces')
    const promote=await call(rest+'sispro_profiles?user_id=eq.'+a.id,{token:a.token,method:'PATCH',body:{role:'admin'},prefer:'return=representation'})
    check([401,403].includes(promote.status),'self-promotion denied')
  }finally{
    let failed=false
    for(const s of sessions){
      try{const out=await call(auth+'logout?scope=local',{token:s.token,method:'POST'})
        check(out.ok,'real logout')
        const refresh=await call(auth+'token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh}})
        check(!refresh.ok&&[400,401,403,422].includes(refresh.status),'refresh token rejected after logout')
      }catch{failed=true;console.error('FAIL: logout or token revocation')}
    }
    if(failed)throw new Error('Logout validation failed')
  }
}
try {
 const locked=await publicChecks()
 console.log('SIGNUP_LOCK_VERIFIED='+locked)
 if(process.argv.includes('--accounts')){check(locked,'public signup and anonymous sign-in disabled');await accounts()}
 else if(!locked)console.log('BLOCKER: Auth signup/anonymous configuration not verified')
}catch(e){console.error(e instanceof Error&&e.message.startsWith('FAIL: ')?e.message:'FAIL: configuration, network or test error');process.exitCode=1}
