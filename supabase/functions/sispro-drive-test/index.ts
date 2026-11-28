const origin='https://sispro-eight.vercel.app';
const redirect=origin+'/drive-callback.html';
const scope='https://www.googleapis.com/auth/drive.file';
const url=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const pub=Deno.env.get('SUPABASE_ANON_KEY')!;
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
const base64url=(b:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function rest(path:string,key:string,token:string,body?:unknown){
 const r=await fetch(url+path,{method:body===undefined?'GET':'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('storage');
 return await r.json();
}
async function owner(token:string){
 const u=await rest('/auth/v1/user',pub,token);
 if(!u?.id||u.is_anonymous)throw new Error('auth');
 const p=await rest('/rest/v1/sispro_profiles?select=user_id,active,role,platform_role&user_id=eq.'+encodeURIComponent(u.id),pub,token);
 const w=await rest('/rest/v1/sispro_test_pgm_workspaces?select=user_id,active&user_id=eq.'+encodeURIComponent(u.id),pub,token);
 if(!p?.some((x:any)=>x.user_id===u.id&&x.active&&x.role==='admin'&&x.platform_role==='ceo')||!w?.some((x:any)=>x.user_id===u.id&&x.active))throw new Error('auth');
 return u.id;
}
const read=(id:string)=>rest('/rest/v1/rpc/sispro_drive_test_secret_read',service,service,{target_user:id});
const write=(id:string,revision:number|null,value:unknown)=>rest('/rest/v1/rpc/sispro_drive_test_secret_write',service,service,{target_user:id,expected_revision:revision,new_value:value});
const status=(v:any)=>({configured:!!v?.client_id,connected:!!v?.refresh_token,account:v?.account||'',busy:false});
async function googleToken(v:any,extra:Record<string,string>){
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:v.client_id,client_secret:v.client_secret,...extra}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error('google'); const t=await r.json();if(!t.access_token)throw new Error('google');return t;
}
async function account(token:string){
 const r=await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('google');const u=(await r.json()).user;return u?.emailAddress||u?.displayName||'Conta Google';
}
Deno.serve(async req=>{
 if(req.headers.get('origin')!==origin)return respond({error:'Origem não autorizada.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond({error:'Método inválido.'},405);
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return respond({error:'Sessão não autorizada.'},401);
 let id:string;try{id=await owner(token)}catch{return respond({error:'Acesso restrito ao PGM de teste autorizado.'},403)}
 try{
  const raw=await req.text();if(raw.length>16000)return respond({error:'Solicitação inválida.'},400);
  const b=JSON.parse(raw);const current=await read(id),rev=current?.revision??null,v=current?.value??{};
  if(b.action==='status')return respond(status(v));
  if(b.action==='configure'){
   if(v.refresh_token)return respond({error:'Desconecte a conta antes de alterar a credencial.'},409);
   const client_id=typeof b.client_id==='string'?b.client_id.trim():'',client_secret=typeof b.client_secret==='string'?b.client_secret.trim():'';
   if(!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(client_id)||client_id.length>512||!client_secret||client_secret.length>512)return respond({error:'Informe o Client ID e o Client Secret do cliente Web.'},400);
   const next={client_id,client_secret};await write(id,rev,next);return respond(status(next));
  }
  if(!v.client_id)return respond({error:'Salve as credenciais primeiro.'},400);
  if(b.action==='start'){
   if(v.refresh_token)return respond({error:'Conta já conectada.'},409);
   const state=random(),verifier=random(),challenge=base64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
   await write(id,rev,{...v,state,verifier,expires:Date.now()+600000});
   const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');auth.search=new URLSearchParams({client_id:v.client_id,redirect_uri:redirect,response_type:'code',scope,state,code_challenge:challenge,code_challenge_method:'S256',access_type:'offline',prompt:'consent select_account'}).toString();
   return respond({url:auth.href,state});
  }
  if(b.action==='complete'){
   if(typeof b.code!=='string'||b.code.length>4096||!b.code||typeof b.state!=='string'||!v.state||v.state!==b.state||v.expires<Date.now())return respond({error:'Autorização inválida ou expirada. Conecte novamente.'},400);
   const clean={client_id:v.client_id,client_secret:v.client_secret};const consumed=await write(id,rev,clean);
   const t=await googleToken(v,{code:b.code,code_verifier:v.verifier,redirect_uri:redirect,grant_type:'authorization_code'});
   if(!t.refresh_token||!String(t.scope||'').split(' ').includes(scope))return respond({error:'Google não concedeu a autorização solicitada.'},400);
   const name=await account(t.access_token);const next={...clean,refresh_token:t.refresh_token,account:name};
   await owner(token);await write(id,consumed,next);return respond(status(next));
  }
  if(b.action==='check'){
   if(!v.refresh_token)return respond({error:'Conta não conectada.'},400);
   const t=await googleToken(v,{refresh_token:v.refresh_token,grant_type:'refresh_token'});return respond({ok:true,account:await account(t.access_token)});
  }
  if(b.action==='disconnect'){
   if(v.refresh_token){const r=await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:v.refresh_token}),signal:AbortSignal.timeout(15000)});if(!r.ok&&r.status!==400)throw new Error('google')}
   const clean={client_id:v.client_id,client_secret:v.client_secret};await write(id,rev,clean);return respond(status(clean));
  }
  return respond({error:'Operação inválida.'},400);
 }catch(e){return respond({error:e instanceof Error&&e.message==='google'?'Google não autorizou a operação. Confira o cliente Web, o URI de retorno e os usuários de teste.':'Não foi possível concluir a operação. Atualize e tente novamente.'},400)}
});
