import { useEffect,useRef,useState } from 'react'
import { Cloud,Info,Link2,Save,RefreshCw,Unlink,ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
const callback='https://sispro-eight.vercel.app/drive-callback.html'
export function WebDriveSettings(){
 const {currentUser,driveRequest}=useAuth()
 const allowed=currentUser?.isTestPgm===true
 const request=useRef(driveRequest);useEffect(()=>{request.current=driveRequest},[driveRequest])
 const pending=useRef(null)
 const [status,setStatus]=useState(null),[clientId,setClientId]=useState(''),[secret,setSecret]=useState(''),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 function closePending(){const p=pending.current;if(p){clearTimeout(p.timer);p.channel.close();try{p.popup.close()}catch{/* already closed */}pending.current=null}}
 useEffect(()=>{if(!allowed)return;let live=true;request.current({action:'status'}).then(r=>{if(live)setStatus(r)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false;closePending()}},[allowed,currentUser?.uid])
 async function refresh(){setBusy(true);setError('');try{setStatus(await request.current({action:'status'}))}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function configure(e){e.preventDefault();setBusy(true);setMessage('');setError('');try{setStatus(await request.current({action:'configure',client_id:clientId.trim(),client_secret:secret.trim()}));setClientId('');setSecret('');setEditing(false);setMessage('Credenciais salvas. Conecte sua conta Google.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function connect(){
  if(!globalThis.BroadcastChannel){setError('Seu navegador não oferece suporte à autorização em janela separada.');return}
  const popup=window.open('about:blank','_blank','popup,width=600,height=720')
  if(!popup){setError('Permita a abertura da janela de autorização.');return}
  popup.opener=null;setBusy(true);setError('');setMessage('')
  try{
   const result=await request.current({action:'start'})
   const auth=new URL(result.url);if(auth.origin!=='https://accounts.google.com'||!result.state)throw new Error('URL de autorização inválida.')
   const channel=new BroadcastChannel('sispro-drive-'+result.state)
   const timer=setTimeout(()=>{closePending();setBusy(false);setError('Tempo de autorização esgotado. Tente novamente.')},600000)
   pending.current={popup,channel,timer}
   channel.onmessage=async e=>{if(e.data?.state!==result.state)return;closePending();try{if(e.data.error||!e.data.code)throw new Error('Autorização Google não concluída.');setStatus(await request.current({action:'complete',state:result.state,code:e.data.code}));setMessage('Conta Google autorizada.')}catch(err){setError(err.message)}finally{setBusy(false)}}
   popup.location.href=auth.href
  }catch(e){closePending();popup.close();setError(e.message);setBusy(false)}
 }
 async function action(name){setBusy(true);setError('');setMessage('');try{const r=await request.current({action:name});if(name==='check')setMessage('Comunicação com Google Drive confirmada: '+r.account);else{setStatus(r);setMessage('Conta desconectada.')}}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="panel-card drive-settings drive-web">
  <h3 className="process-icon-text"><Cloud size={21}/> Google Drive</h3>
  {!allowed?<p>O cadastro web está disponível inicialmente no subperfil PGM da Procuradoria de Teste.</p>:<>
   <p>Configure o cliente OAuth Web e autorize sua conta Google.</p>
   <div className="drive-state"><Info size={18}/>{!status?'Configuração não consultada':status.connected?'Conta autorizada: '+status.account:status.configured?'Credenciais configuradas · conta não conectada':'Não conectado'}</div>
   {status&&!status.connected&&(!status.configured||editing)&&<form className="drive-web-form" onSubmit={configure}>
    <label className="form-field">ID do cliente OAuth<input required maxLength={512} placeholder="…apps.googleusercontent.com" value={clientId} onChange={e=>setClientId(e.target.value)} autoComplete="off" spellCheck={false}/></label>
    <label className="form-field">Segredo do cliente OAuth<input type="password" required maxLength={512} value={secret} onChange={e=>setSecret(e.target.value)} autoComplete="new-password" spellCheck={false}/></label>
    <button type="submit" className="primary-button" disabled={busy||!clientId.trim()||!secret.trim()}><Save size={17}/> Salvar credenciais</button>
    {editing&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>{setEditing(false);setClientId('');setSecret('')}}>Cancelar</button>}
   </form>}
   {!status?<button className="secondary-button" disabled={busy} onClick={refresh}>Atualizar configuração</button>:status.connected?<div className="drive-actions"><button className="primary-button" disabled={busy} onClick={()=>action('check')}><RefreshCw size={17}/> Testar conexão</button><button className="secondary-button" disabled={busy} onClick={()=>action('disconnect')}><Unlink size={17}/> Desconectar</button></div>:<><button type="button" className="secondary-button drive-connect" disabled={busy||editing||!status.configured} onClick={connect}><Link2 size={17}/> Conectar conta Google</button>{status.configured&&!editing&&<button className="secondary-button" disabled={busy} onClick={()=>setEditing(true)}>Alterar credenciais</button>}</>}
   {busy&&<p role="status">Operação em andamento. Autorize no Google, se solicitado. {pending.current&&<button type="button" className="secondary-button" onClick={()=>{closePending();setBusy(false);setMessage('Autorização cancelada.')}}>Cancelar autorização</button>}</p>}
   {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="form-feedback form-feedback--error">{error}</p>}
   <p className="drive-safety"><ShieldCheck size={17}/> Segredos protegidos no servidor. Somente dados fictícios neste ambiente. Importe PDFs fictícios de até 5 MB nos autos após conectar a conta.</p>
   <details><summary>Como configurar no Google Cloud</summary><p>Ative a API do Drive, crie um cliente OAuth do tipo aplicativo da Web e adicione este URI de redirecionamento autorizado:</p><code className="drive-callback">{callback}</code><p>Se o aplicativo OAuth estiver em teste, inclua sua conta entre os usuários de teste.</p><div className="drive-actions"><a className="secondary-button" href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noreferrer">Ativar API</a><a className="secondary-button" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Criar credenciais</a></div></details>
  </>}
 </section>
}
