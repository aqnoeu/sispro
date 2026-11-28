import { useEffect,useRef,useState } from 'react'
import { FolderOpen,FileUp,Save,X,ClipboardList,CalendarClock,NotebookPen,FileText,Download,ChevronLeft,ChevronRight } from 'lucide-react'
import { readProcessPdf } from '../../utils/readProcessPdf'
import { useAuth } from '../../contexts/useAuth'
import { canAccess } from '../../utils/mechanicAccess'
import { createWebDrive,WEB_MAX_FILE_BYTES,makeZip } from '../../utils/webAutos'
import { MAX_FILE_BYTES } from '../../utils/autos'
const labels={numero:'Número CNJ',parte:'Nome da parte',assunto:'Assunto',orgao:'Órgão',fase:'Fase'}
export function ProcessCreateDialog({values,onChange,busy,canSave,feedback,priorities,statuses,onSubmit,onClose}){
 const {currentUser,driveRequest}=useAuth()
 const dialog=useRef(null),picker=useRef(null),live=useRef(true)
 const [tab,setTab]=useState('general'),[reading,setReading]=useState(false),[notice,setNotice]=useState(''),[validation,setValidation]=useState('')
 const [documents,setDocuments]=useState([]),[position,setPosition]=useState(0),[savedId,setSavedId]=useState(''),[uploading,setUploading]=useState(false),[uploaded,setUploaded]=useState(0),[failed,setFailed]=useState([]),[progress,setProgress]=useState('')
 const completed=useRef(new Set()),driveRef=useRef(null)
 const canAttach=canAccess(currentUser,'autos',2)&&!currentUser?.isDemo&&(!!globalThis.siproFiles||!!currentUser?.isTestPgm)
 const locked=busy||reading||uploading
 useEffect(()=>{live.current=true;const el=dialog.current;el.showModal();return()=>{live.current=false;if(el.open)el.close()}},[])
 const change=(key,value)=>onChange(old=>({...old,[key]:value}))
 async function read(file){
  if(!file)return;setReading(true);setNotice('Lendo PDF…');setValidation('')
  try{
   const result=await readProcessPdf(file,(n,total)=>{if(live.current)setNotice('Lendo página '+n+' de '+total+'…')})
   if(!live.current)return
   setDocuments(result.documents);setPosition(0);completed.current.clear();setUploaded(0);setFailed([])
   onChange(old=>{const next={...old};for(const [k,v] of Object.entries(result.fields))if(labels[k]&&!String(old[k]||'').trim())next[k]=v;return next})
   setTab('general')
   setNotice((result.hasText?'Confira os campos sugeridos.':'PDF sem texto selecionável; preencha os dados manualmente.')+' '+result.documents.length+' arquivo(s) preparado(s).'+(result.ambiguous.length?' Campos ambíguos não foram preenchidos.':''))
  }catch(e){if(live.current)setNotice(e.message||'Não foi possível ler o PDF.')}
  finally{if(live.current){setReading(false);if(picker.current)picker.current.value=''}}
 }
 function download(){
  const url=URL.createObjectURL(makeZip(documents.map((d,i)=>({name:String(i+1).padStart(3,'0')+'-'+d.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_'),data:d.bytes}))))
  const a=document.createElement('a');a.href=url;a.download='documentos-processuais.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)
 }
 async function attach(id){
  setUploading(true);setValidation('');setTab('documents');setFailed([])
  const errors=[]
  try{
   if(!canAttach)throw Error('Armazenamento de autos indisponível neste perfil.')
   const bridge=globalThis.siproFiles,web=!!currentUser?.isTestPgm
   if(web&&!driveRef.current)driveRef.current=createWebDrive(driveRequest)
   const drive=driveRef.current
   if(web&&!(await drive.status()).connected)throw Error('Conecte o Google Drive nas configurações para anexar os documentos.')
   for(let i=0;i<documents.length;i++){
    if(completed.current.has(i))continue
    const d=documents[i]
    try{
     if(d.bytes.length>(web?WEB_MAX_FILE_BYTES:MAX_FILE_BYTES))throw Error('Limite de '+(web?100:25)+' MB por arquivo.')
     setProgress('Documento '+(i+1)+' de '+documents.length)
     if(web)await drive.uploadBytes(id,d.name,d.bytes,undefined,(sent,total)=>{if(live.current)setProgress('Documento '+(i+1)+' de '+documents.length+' · '+Math.round(sent/total*100)+'%')});else bridge.import(id,d.name,d.bytes)
     completed.current.add(i);if(live.current)setUploaded(completed.current.size)
    }catch(e){errors.push({index:i,name:d.name,message:e.message||'Falha de envio.'})}
   }
   if(live.current){setFailed(errors);if(!errors.length)onClose();else setValidation(errors.length+' documento(s) não anexado(s). Os demais foram preservados. Tente novamente ou baixe o ZIP.')}
  }catch(e){if(live.current)setValidation('Processo salvo. '+e.message+' Baixe o ZIP ou tente novamente.')}
  finally{if(live.current){setUploading(false);setProgress('')}}
 }
 async function submit(e){
  e.preventDefault()
  if(!String(values.numero||'').trim()){setTab('general');setValidation('Informe o número do processo.');return}
  setValidation('')
  const id=await onSubmit(e)
  if(!id||!live.current)return
  if(!documents.length){onClose();return}
  setSavedId(id);setTab('documents');setNotice('Cadastro salvo. Documentos disponíveis para anexar ou baixar.')
  if(canAttach)await attach(id)
  else setValidation('Processo salvo. Este perfil não tem armazenamento de autos disponível. Baixe o ZIP para preservar os documentos.')
 }
 const field=(key,label,placeholder='')=><label className="form-field"><span>{label}</span><input disabled={locked||!!savedId} value={values[key]||''} onChange={e=>change(key,e.target.value)} placeholder={placeholder}/></label>
 const select=(key,label,options)=><label className="form-field"><span>{label}</span><select disabled={locked||!!savedId} value={values[key]} onChange={e=>change(key,e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>
 const active=documents[position]
 return <dialog ref={dialog} className="work-dialog process-create" aria-labelledby="process-create-title" onCancel={e=>{e.preventDefault();if(!locked)onClose()}}>
 <header className="work-dialog__header"><span className="work-dialog__icon"><FolderOpen size={23}/></span><div className="work-dialog__heading"><h2 id="process-create-title">Cadastrar processo</h2><span>Importe os autos ou preencha manualmente.</span></div><button type="button" className="secondary-button" disabled={locked||!!savedId} onClick={()=>picker.current?.click()}><FileUp size={17}/> Ler PDF</button><input ref={picker} hidden type="file" accept=".pdf,application/pdf" onChange={e=>read(e.target.files?.[0])}/><button type="button" className="work-dialog__close" aria-label="Fechar cadastro" disabled={locked} onClick={onClose}><X size={22}/></button></header>
 <div className="process-dialog-tabs" role="group" aria-label="Seções do cadastro">{[['general','Dados do processo',ClipboardList],['documents','Documentos'+(documents.length?' ('+documents.length+')':''),FileText],['extra','Prazos (opcional)',CalendarClock],['notes','Observações',NotebookPen]].map(([id,label,Icon])=><button key={id} type="button" aria-pressed={tab===id} disabled={locked||(!!savedId&&id!=='documents')} onClick={()=>setTab(id)}><Icon size={16}/> {label}</button>)}</div>
 <form id="process-create-form" className="work-dialog__body" onSubmit={submit}>
 {notice&&<p role="status" className="process-read-notice">{notice}</p>}
 {tab==='general'?<div className="process-create-grid">{field('numero','Número CNJ')}{field('parte','Nome da parte')}{field('assunto','Assunto')}{field('orgao','Órgão')}{field('fase','Fase')}{select('prioridade','Prioridade',priorities)}{select('andamentoAtual','Andamento atual',statuses)}<p className="process-create-note">Somente o número do processo é obrigatório. Nenhum prazo precisa ser informado.</p></div>:tab==='documents'?<section className="process-import-review">
 {active?<><div className="process-import-summary"><strong>{documents.length} arquivo(s) · {documents.filter(d=>d.identified).length} com ID PJe</strong><span>Confira a separação. Páginas sem ID são preservadas em blocos; o PDF original permanece no seu dispositivo.</span></div><div className="process-import-document"><FileText size={22}/><div><strong>{active.name}</strong><small>Páginas {active.start}–{active.end} · {active.identified?'ID '+active.id:'Sem identificação confirmada'}</small>{failed.some(x=>x.index===position)&&<small role="status">Falha: {failed.find(x=>x.index===position)?.message}</small>}</div></div><div className="process-import-controls"><button type="button" className="secondary-button" aria-label="Documento anterior" disabled={position===0} onClick={()=>setPosition(p=>p-1)}><ChevronLeft size={17}/></button><span>{position+1} de {documents.length}</span><button type="button" className="secondary-button" aria-label="Próximo documento" disabled={position+1===documents.length} onClick={()=>setPosition(p=>p+1)}><ChevronRight size={17}/></button><button type="button" className="secondary-button" onClick={download}><Download size={17}/> Baixar ZIP</button></div><p className="process-create-note">{uploading?progress+' · '+uploaded+' de '+documents.length+' concluídos':savedId?uploaded+' de '+documents.length+' anexado(s).':canAttach?'Ao salvar, os arquivos serão anexados ao armazenamento autorizado, se conectado.':'Baixe os arquivos separados em ZIP; armazenamento de autos não disponível neste perfil.'}</p></>:<p>Nenhum PDF selecionado. Use Ler PDF para identificar e separar as peças.</p>}
 </section>:tab==='extra'?<div className="process-create-grid">{field('prazo','Próximo prazo (opcional)','Sem prazo')}{field('dataUltimoProtocolo','Data do último protocolo (opcional)','dd/mm/aaaa')}{field('linkDocumento','Link do documento (opcional)','https://...')}{field('nomeDocumento','Nome do documento (opcional)','peticao.pdf')}<p className="process-create-note">Deixe em branco quando não houver informação. A leitura do PDF não cria nem calcula prazos.</p></div>:<label className="form-field"><span>Observações (opcional)</span><textarea disabled={locked} rows={4} value={values.observacoes} onChange={e=>change('observacoes',e.target.value)} placeholder="Anotações complementares"/></label>}
 </form>
 {(validation||(!savedId&&feedback?.message))&&<div role="alert" className="work-dialog__feedback"><div className="form-feedback form-feedback--error">{validation||feedback.message}</div></div>}
 <footer className="work-dialog__footer"><button type="button" className="secondary-button" disabled={locked} onClick={onClose}>{savedId?'Fechar':'Cancelar'}</button>{savedId?canAttach&&uploaded<documents.length&&<button type="button" className="primary-button" disabled={locked} onClick={()=>attach(savedId)}>Tentar anexar novamente</button>:<button type="submit" form="process-create-form" className="primary-button" disabled={!canSave||locked}><Save size={17}/> {busy?'Salvando...':'Salvar processo'}</button>}</footer>
 </dialog>
}
