import { canAccess } from '../utils/mechanicAccess.js'
import { useEffect,useMemo,useRef,useState } from 'react'
import { Link,useParams } from 'react-router-dom'
import { ArrowLeft,ArrowUpRight,FileText,Search,Download,Trash2,CloudUpload,Tag,Save,Hash,ChevronDown,ChevronLeft,ChevronRight,ChevronsLeft,ChevronsRight,PanelLeftOpen,Menu,Star,Clock,Info } from 'lucide-react'
import { Labels,useLabels } from '../components/ui/Labels'
import { getProcessoStatusTone } from '../utils/processos'
import { ProcessoDetailPage } from './ProcessoDetailPage'
import { useAuth } from '../contexts/useAuth'
import { database,doc,setDoc } from '../services/local/database'
import { DOCUMENT_TYPES,dateKey,dateLabel,enrichDocuments,filterDocuments,validateMetadata,groupTimeline,compareJudicial,navigationDocuments,groupJudicialAttachments,isInitialRegistrationMovement } from '../utils/documentTimeline'
import { useCollectionData } from '../services/local/useCollectionData'
import { canAccessOwnedRow } from '../utils/accessScope'
import { createWebDrive,WEB_MAX_FILE_BYTES,exportAutosZip } from '../utils/webAutos.js'
import { linkedDocuments,MAX_FILE_BYTES,validPdf } from '../utils/autos'
import { readProcessPdf } from '../utils/readProcessPdf'
import { matchPjeIndex,pjeIdFromName } from '../utils/pjeIndex'
import { saveImportedMetadata } from '../utils/pjeMetadataStore'
import { createPdfSessionCache } from '../utils/pdfSessionCache'
export function AutosPage(){
 const {numero}=useParams(),{currentUser,driveRequest}=useAuth()
 const canWrite=canAccess(currentUser,'autos',2)
 const assignments=useLabels()
 const treeKey='sispro.autos.treeWidth:'+String(currentUser?.uid||'local')+':'+String(currentUser?.profileMode||'default')
 const [treeWidth,setTreeWidth]=useState(()=>readTreeWidth(treeKey)),[viewportWidth,setViewportWidth]=useState(()=>window.innerWidth),[resizing,setResizing]=useState(false)
 const dragRef=useRef(null)
 const treeMax=Math.max(220,Math.min(650,Math.floor(viewportWidth*.55)))
 const actualTreeWidth=Math.max(220,Math.min(treeMax,treeWidth))
 useEffect(()=>{const resize=()=>setViewportWidth(window.innerWidth);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[])
 function saveTreeWidth(value){try{localStorage.setItem(treeKey,String(value))}catch{/* preference remains in memory */}}
 function beginTreeResize(e){if(e.button!==0||dragRef.current)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);dragRef.current={id:e.pointerId,x:e.clientX,width:actualTreeWidth,last:actualTreeWidth};setResizing(true)}
 function moveTreeResize(e){const drag=dragRef.current;if(!drag||drag.id!==e.pointerId)return;drag.last=Math.round(Math.max(220,Math.min(treeMax,drag.width+e.clientX-drag.x)));setTreeWidth(drag.last)}
 function endTreeResize(e){const drag=dragRef.current;if(!drag||drag.id!==e.pointerId)return;dragRef.current=null;setResizing(false);saveTreeWidth(drag.last)}
 function treeResizeKey(e){const offsets={ArrowLeft:-16,ArrowRight:16,Home:220-actualTreeWidth,End:treeMax-actualTreeWidth};if(!Object.hasOwn(offsets,e.key))return;e.preventDefault();const next=Math.max(220,Math.min(treeMax,actualTreeWidth+offsets[e.key]));setTreeWidth(next);saveTreeWidth(next)}
 const [detailsOpen,setDetailsOpen]=useState(false),[collapsed,setCollapsed]=useState(false),[filtersOpen,setFiltersOpen]=useState(false),[editMeta,setEditMeta]=useState(false),[menuOpen,setMenuOpen]=useState(false),[view,setView]=useState('autos'),[showMoves,setShowMoves]=useState(true),[showDocs,setShowDocs]=useState(true),[favorites,setFavorites]=useState([]),[onlyFavorites,setOnlyFavorites]=useState(false)
 const versionRef=useRef(''),splitRef=useRef(false),indexRef=useRef(false)
 const [showCover,setShowCover]=useState(false),[updatingIndex,setUpdatingIndex]=useState(false)
 const [operationProgress,setOperationProgress]=useState(null),[documentProgress,setDocumentProgress]=useState(null)
 function reportProgress(label,value){setOperationProgress(old=>({label,value:Math.max(old?.value||0,Math.min(99,Math.floor(value)))}))}
 const processes=useCollectionData({collectionName:'processos',clientFilter:r=>canAccessOwnedRow(r,currentUser)})
 const deadlines=useCollectionData({collectionName:'prazos',clientFilter:r=>canAccessOwnedRow(r,currentUser)})
 const process=processes.rows.find(r=>r.numero===numero)
 const metadata=useCollectionData({collectionName:'autosMetadata',clientFilter:r=>r.processId===process?.documentId})
 const [typeFilter,setTypeFilter]=useState(''),[sourceFilter,setSourceFilter]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[metaDraft,setMetaDraft]=useState({type:'Não classificado',joinedAt:'',reference:''})
 const [files,setFiles]=useState([]),[selected,setSelected]=useState(''),[search,setSearch]=useState(''),[ascending,setAscending]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState('')
 const pdfCache=useMemo(()=>createPdfSessionCache(),[currentUser?.uid,currentUser?.profileMode,numero]),[previewError,setPreviewError]=useState(''),[previewRetry,setPreviewRetry]=useState(0)
 useEffect(()=>()=>pdfCache.clear(),[pdfCache])
 const input=useRef(null),demo=!!currentUser?.isDemo,bridge=globalThis.siproFiles
 const requestRef=useRef(driveRequest);useEffect(()=>{requestRef.current=driveRequest},[driveRequest])
 const web=!!currentUser?.isTestPgm
 const webDrive=useMemo(()=>createWebDrive(body=>requestRef.current(body)),[])
 const drive=demo?null:web?webDrive:globalThis.siproDrive
 const [contentTerm,setContentTerm]=useState(''),[contentIds,setContentIds]=useState(null),[versionOf,setVersionOf]=useState('')
 const [cloudFiles,setCloudFiles]=useState([]),[connected,setConnected]=useState(false),[cloudBusy,setCloudBusy]=useState(false),[cloudMessage,setCloudMessage]=useState('')
 const processId=process?.documentId
 const [cloudReady,setCloudReady]=useState(null),[localReady,setLocalReady]=useState(null)
 const loadScope=String(currentUser?.uid||'')+':'+String(currentUser?.profileMode||'')+':'+String(processId||'')
 const awaitingCloud=!!drive&&!!processId&&cloudReady!==loadScope
 const awaitingLocal=!!bridge&&!demo&&!!processId&&localReady!==loadScope
 const openingAutos=processes.loading||!!process&&(metadata.loading||(canAccess(currentUser,'prazos')&&deadlines.loading)||awaitingCloud||awaitingLocal)
 useEffect(()=>{
  let live=true;setCloudFiles([]);setConnected(false);setCloudReady(null)
  if(drive&&processId)Promise.resolve().then(()=>drive.status()).then(async s=>{if(!live)return;setConnected(s.connected);if(s.connected){const rows=await drive.listFiles(processId);if(live)setCloudFiles(rows)}}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setCloudReady(loadScope)})
  return()=>{live=false}
 },[drive,processId,loadScope])
 async function refreshCloud(){setContentIds(null);setCloudBusy(true);setError('');setOperationProgress({label:'Atualizando árvore…',value:0});try{pdfCache.clear();setCloudFiles(await drive.listFiles(processId));setPreviewRetry(n=>n+1);setCloudMessage('Documentos do Drive atualizados.')}catch(e){setError(e.message)}finally{setCloudBusy(false);setOperationProgress(null)}}
 async function sendCloud(){if(!active||active.source!=='local'||!confirm('Enviar uma cópia de '+active.name+' para a conta Google autorizada?'))return;setCloudBusy(true);setError('');try{const d=await drive.uploadFile(processId,active.id);setCloudFiles(old=>[...old.filter(x=>x.id!==d.id),d]);setCloudMessage(d.duplicate?'Documento já existente no Drive.':'Cópia enviada. Original local preservado.')}catch(e){setError(e.message)}finally{setCloudBusy(false)}}
 useEffect(()=>{setFiles([]);setSelected('');setLocalReady(null);if(processId&&!demo&&bridge){try{setFiles(bridge.list(processId))}catch(e){setError(e.message)}finally{setLocalReady(loadScope)}}},[processId,demo,bridge,loadScope])
 const docs=useMemo(()=>enrichDocuments([...files,...cloudFiles,...linkedDocuments(process,(canAccess(currentUser,'prazos')?deadlines.rows:[]).filter(r=>(r.processo??r.numeroProcesso)===numero))],metadata.rows),[files,cloudFiles,process,deadlines.rows,numero,metadata.rows,currentUser])
 const visibleDocs=navigationDocuments(docs,showCover)
 const filtered=filterDocuments((contentIds?visibleDocs.filter(d=>contentIds.includes(d.id)):visibleDocs).filter(d=>!onlyFavorites||favorites.includes(d.id)),{search,type:typeFilter,source:sourceFilter,from,to,ascending,preserveOrder:true})
 const moves=useMemo(()=>Array.isArray(process?.historico)?process.historico.map((m,i)=>({id:'internal-move:'+i,kind:'movement',name:m.descricao||m.status||'Registro interno',sortDate:dateKey(m.data),rawDate:m.data,sortTime:formatTime(m.data),status:m.status,hiddenFromAutos:isInitialRegistrationMovement(m)})).filter(m=>!m.hiddenFromAutos):[],[process?.historico])
 const timelineRows=[...(showDocs?filtered.map(d=>({...d,kind:'document'})):[]),...(showMoves&&!onlyFavorites&&!contentIds&&!typeFilter&&!sourceFilter?moves.filter(m=>(!search||m.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))&&(!from||m.sortDate>=from)&&(!to||m.sortDate<=to)):[])]
 const timeline=timelineRows.sort((a,b)=>compareJudicial(a,b,ascending))
 const navDocs=showDocs?[...filtered].sort((a,b)=>compareJudicial(a,b,ascending)):[]
 const position=navDocs.findIndex(d=>d.id===selected)
 const movement=moves.find(m=>m.id===selected)
 useEffect(()=>{if((!selected||(!showCover&&docs.some(d=>d.id===selected&&d.cover)))&&navDocs.length&&!openingAutos)setSelected(navDocs[0].id);else if(!showCover&&docs.some(d=>d.id===selected&&d.cover))setSelected('')},[selected,navDocs,showCover,docs,openingAutos])
 function selectDocument(id){setSelected(id);setEditMeta(false);setView('autos')}
 function step(i){if(navDocs[i])selectDocument(navDocs[i].id)}
 function toggleFavorite(id){setFavorites(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}
 function chooseFiles(version='',split=false,indexOnly=false){indexRef.current=indexOnly;splitRef.current=split;versionRef.current=version;setVersionOf(version);if(input.current){input.current.multiple=!version;input.current.click()}}
 const active=docs.find(d=>d.id===selected)
 useEffect(()=>{setMetaDraft({type:active?.type||'Não classificado',joinedAt:active?.joinedAt||'',reference:active?.reference||''})},[active?.id,active?.type,active?.joinedAt,active?.reference])
 async function saveMetadata(e){e.preventDefault();if(!canWrite||!active||!processId)return;setError('');try{const values=validateMetadata(metaDraft);const old=metadata.rows.find(r=>r.documentKey===active.id);const key=old?.documentId||crypto.randomUUID();await setDoc(doc(database,'autosMetadata',key),{...values,processId,documentKey:active.id},{merge:true});setCloudMessage('Informações do documento salvas.')}catch(e){setError(e.message)}}
 useEffect(()=>{
  setPreview('');setPreviewError('');setDocumentProgress(null)
  if(!active||active.source==='link'||!processId||busy||openingAutos)return
  let url='',live=true
  const key=processId+':'+active.id+':'+(active.hash||active.size||'')
  pdfCache.get(key,async()=>{
   const bytes=active.source==='drive'?await drive.readFile(processId,active.id,active.size,(received,total)=>{if(live&&total>0)setDocumentProgress(Math.min(99,Math.floor(received/total*100))) }):active.bytes||bridge.read(processId,active.id)
   return new Blob([new Uint8Array(bytes)],{type:'application/pdf'})
  }).then(blob=>{if(live){url=URL.createObjectURL(blob);setPreview(url)}}).catch(e=>{if(live)setPreviewError(e.message||'Não foi possível carregar o PDF.')})
  return()=>{live=false;if(url)URL.revokeObjectURL(url)}
 },[selected,active?.id,active?.hash,active?.size,processId,bridge,drive,pdfCache,previewRetry,busy,openingAutos])
 async function importFiles(list){
  if(!canWrite||!processId)return
  const requestedVersion=versionRef.current,split=splitRef.current,indexOnly=indexRef.current
  if(requestedVersion&&list.length!==1){setError('Selecione um único PDF para a nova versão.');return}
  if(!list.length)return
  setBusy(true);setError('');setOperationProgress({label:indexOnly?'Atualizando autos…':'Importando autos…',value:0});if(indexOnly){setUpdatingIndex(true);setCloudMessage('Lendo índice do PDF…')}const errors=[];let done=0
  try{
   for(const [fileIndex,file] of list.entries()){
    const advance=(fraction,label)=>reportProgress(label,100*(fileIndex+fraction)/list.length)
    if(indexOnly){try{await restoreIndex(file,advance)}catch(e){errors.push(e.message)}continue}
    let entries
    try{entries=split?(await readProcessPdf(file,(n,total)=>advance(.45*n/total,'Lendo páginas do PDF…'))).documents:[{name:file.name,bytes:new Uint8Array(await file.arrayBuffer())}]}
    catch(e){errors.push(file.name+': '+e.message);continue}
    advance(.55,'Salvando documentos…');const saved=[]
    for(const [entryIndex,entry] of entries.entries()){
     try{const {name,bytes}=entry;if(bytes.length>(web?WEB_MAX_FILE_BYTES:MAX_FILE_BYTES))throw Error('Limite de '+(web?100:25)+' MB por PDF.');if(!validPdf(bytes))throw Error('PDF inválido.')
      if(demo){const d={id:crypto.randomUUID(),name,date:new Date().toISOString(),source:'local',bytes};setFiles(old=>[...old,d]);saved.push({document:d,entry})}
      else if(web&&connected){const d=await drive.uploadBytes(processId,name,bytes,requestedVersion,(sent,total)=>advance(.55+.40*(entryIndex+(total?sent/total:0))/entries.length,'Salvando documentos…'));setCloudFiles(old=>[...old.filter(x=>x.id!==d.id),d]);saved.push({document:d,entry})}
      else if(bridge){const d=bridge.import(processId,name,bytes);setFiles(bridge.list(processId));saved.push({document:d,entry})}
      else throw Error('Armazenamento indisponível.')
      done++
     }catch(e){errors.push(entry.name+': '+e.message)}
     advance(.55+.40*(entryIndex+1)/entries.length,'Salvando documentos…')
    }
    if(split)try{advance(.95,'Gravando informações dos documentos…');await saveImportedMetadata(processId,saved)}catch(e){errors.push('Arquivos preservados, metadados não salvos: '+e.message)}
   }
   if(!indexOnly)setCloudMessage(done+' documento(s) processado(s).'+(errors.length?' '+errors.length+' falha(s).':''))
   if(errors.length)setError(errors.join(' · '))
  }finally{setBusy(false);setUpdatingIndex(false);setOperationProgress(null);versionRef.current='';splitRef.current=false;indexRef.current=false;setVersionOf('');setContentIds(null);if(input.current)input.current.value=''}
 }

 async function restoreIndex(file,advance=(fraction,label)=>reportProgress(label,100*fraction)){
  const knownIds=docs.map(d=>d.pjeReference||d.reference||pjeIdFromName(d.storageName||d.name)).filter(Boolean)
  const result=await readProcessPdf(file,(n,total)=>advance(.8*n/total,'Identificando documentos no índice…'),true,knownIds)
  advance(.8,'Conferindo índice do PJe…')
  if(result.fields.numero&&result.fields.numero!==numero)throw Error('O PDF pertence a outro processo.')
  const matches=matchPjeIndex(docs,result.index)
  if(!matches.length)throw Error('Nenhum ID completo do índice corresponde aos documentos arquivados. Nenhum dado foi alterado.')
  advance(.9,'Gravando informações dos documentos…');const count=await saveImportedMetadata(processId,matches)
  setCloudMessage(count+' de '+knownIds.length+' documento(s) atualizado(s) pelo índice do PJe, sem reenviar PDFs.')
 }
 async function restoreFromCover(){
  if(!canWrite||!processId||busy)return
  const covers=docs.filter(d=>d.cover&&d.source!=='link')
  if(covers.length!==1){chooseFiles('',false,true);return}
  setBusy(true);setUpdatingIndex(true);setOperationProgress({label:'Lendo índice da capa arquivada…',value:0});setError('');setCloudMessage('Lendo índice da capa arquivada…')
  try{const d=covers[0],bytes=d.source==='drive'?await drive.readFile(processId,d.id,d.size):d.bytes||bridge.read(processId,d.id);await restoreIndex(new File([bytes],d.storageName||d.name,{type:'application/pdf'}))}
  catch(e){setCloudMessage('');setError(e.message+' Use o PDF original pelo menu, se necessário.')}
  finally{setBusy(false);setUpdatingIndex(false);setOperationProgress(null)}
 }
 async function searchContent(){setCloudBusy(true);setError('');try{const rows=await drive.searchFiles(processId,contentTerm);setContentIds(rows.map(d=>d.id));setCloudMessage('Resultados de conteúdo indexado pelo Google Drive.')}catch(e){setError(e.message)}finally{setCloudBusy(false)}}
 async function exportAll(){setBusy(true);setError('');try{await exportAutosZip({numero,docs:[...docs].sort((a,b)=>compareJudicial(a,b,false)),read:async d=>d.source==='drive'?drive.readFile(processId,d.id,d.size):d.bytes||bridge.read(processId,d.id)});setCloudMessage('Exportação de PDFs e índice concluída. Links externos foram relacionados no índice.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 function remove(){if(!canAccess(currentUser,'autos',3)||!active||active.source!=='local'||!confirm('Remover este PDF dos autos locais?'))return;try{if(!demo)bridge.remove(processId,active.id);setFiles(old=>old.filter(d=>d.id!==active.id));setSelected('')}catch(e){setError(e.message)}}
 if(openingAutos)return <div className="autos-page case-workspace" aria-busy="true"><PjeLoading skeleton treeWidth={actualTreeWidth} collapsed={collapsed} progress={{label:processes.loading?'Carregando dados do processo…':awaitingCloud?'Carregando árvore de documentos…':'Organizando os autos…',value:null}}/></div>
 if(!process)return <section className="panel-card"><h3>Processo não encontrado ou sem acesso.</h3><Link to="/processos">Voltar aos processos</Link></section>
 const importAllowed=canWrite&&!busy&&(demo||bridge||(web&&connected))
 const selectedTime=active?displayTime(active):''
 return <div className="autos-page case-workspace" aria-busy={updatingIndex||!!operationProgress}>
 {operationProgress&&<PjeLoading progress={operationProgress} skeleton={updatingIndex} treeWidth={actualTreeWidth} collapsed={collapsed}/>}
 <header className="case-header">
  <Link className="case-header-icon" to="/processos" aria-label="Voltar aos processos" title="Voltar aos processos"><ArrowLeft size={21}/></Link>
  <button type="button" className="case-identity" aria-expanded={detailsOpen} aria-controls="case-details" onClick={()=>setDetailsOpen(v=>!v)}><span><strong>{process.classe||process.classeProcessual? (process.classe||process.classeProcessual)+' ':''}{process.numero}</strong><small>{process.parte||'Parte não informada'}{process.orgao?' · '+process.orgao:''}</small></span><ChevronDown size={19}/></button>
  <div className="case-header-labels" aria-label="Etiquetas do processo"><Labels row={process} assignments={assignments}/>{process.andamentoAtual&&<span className={`process-status-chip process-status-chip--${getProcessoStatusTone(process.andamentoAtual)}`}>{process.andamentoAtual}</span>}</div>
  <div className="case-header-actions"><div className="case-menu-wrap"><button className="case-header-icon" aria-label="Menu do processo" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><Menu size={22}/></button>{menuOpen&&<nav className="case-menu" aria-label="Ações do processo"><button type="button" disabled={busy||cloudBusy||!docs.length} onClick={()=>{setMenuOpen(false);exportAll()}}><Download size={16} aria-hidden="true"/> Baixar autos (ZIP)</button><button onClick={()=>{setView('autos');setShowDocs(true);setShowMoves(true);setMenuOpen(false)}}>Autos</button><button onClick={()=>{setView('autos');setShowDocs(true);setShowMoves(false);setMenuOpen(false)}}>Documentos</button><button onClick={()=>{setView('details');setMenuOpen(false)}}>Dados do processo e demandas</button><button disabled={!importAllowed} onClick={()=>{setMenuOpen(false);chooseFiles()}}>Importar documentos</button><button disabled={!importAllowed} onClick={()=>{setMenuOpen(false);chooseFiles('',true)}}>Importar PDF completo e separar</button><button disabled={!canWrite||busy||!docs.length} onClick={()=>{setMenuOpen(false);restoreFromCover()}}>Atualizar dados pelo índice PJe</button><button disabled={!canWrite||busy||!docs.length} onClick={()=>{setMenuOpen(false);chooseFiles('',false,true)}}>Ler índice do PDF original</button><button type="button" aria-pressed={showCover} onClick={()=>{setShowCover(v=>!v);setMenuOpen(false)}}>{showCover?'Ocultar capa arquivada':'Exibir capa arquivada'}</button><button type="button" aria-expanded={filtersOpen&&!collapsed} onClick={()=>{setCollapsed(false);setFiltersOpen(collapsed||!filtersOpen);setMenuOpen(false)}}>Filtros da árvore</button><button type="button" disabled={cloudBusy} onClick={()=>{setMenuOpen(false);setSearch('');setFrom('');setTo('');setTypeFilter('');setSourceFilter('');setContentIds(null);setContentTerm('');setAscending(false);setShowMoves(true);setShowDocs(true);setOnlyFavorites(false);if(connected)refreshCloud()}}>Atualizar árvore</button><button type="button" aria-pressed={onlyFavorites} onClick={()=>{setOnlyFavorites(v=>!v);setCollapsed(false);setMenuOpen(false)}}>{onlyFavorites?'Mostrar todos os registros':'Mostrar favoritos'}</button><button type="button" onClick={()=>{setCollapsed(v=>!v);setMenuOpen(false)}}>{collapsed?'Exibir árvore':'Ocultar árvore'}</button><Link to="/configuracoes" onClick={()=>setMenuOpen(false)}>Armazenamento</Link></nav>}</div></div>
 </header>
 {detailsOpen&&<section id="case-details" className="case-details"><dl>{[['Número CNJ',process.numero],['Classe',process.classe||process.classeProcessual],['Parte',process.parte],['Órgão julgador',process.orgao],['Assunto',process.assunto],['Fase',process.fase],['Responsável',process.responsavel||process.ownerName],['Prioridade',process.prioridade]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||'Não informado'}</dd></div>)}</dl><button className="secondary-button" onClick={()=>setView('details')}>Abrir dados e demandas</button></section>}
 {cloudMessage&&<p role="status" className="case-message">{cloudMessage}</p>}{demo&&<p className="case-message">Demonstração: PDFs fictícios e temporários.</p>}{error&&<p role="alert" className="form-feedback form-feedback--error case-message">{error}</p>}
 <input ref={input} type="file" accept=".pdf,application/pdf" multiple={!versionOf} hidden onChange={e=>importFiles([...e.target.files])}/>
 <div className={'case-split'+(collapsed?' case-split--collapsed':'')+(resizing?' case-split--resizing':'')} style={{'--tree-width':actualTreeWidth+'px'}}>
 {!collapsed&&<aside className="case-chronology" aria-label="Árvore do processo">
  <div className="case-chronology-tools"><div className="case-search"><Search size={16}/><input aria-label="Pesquisar documentos ou movimentos" placeholder="Pesquisar documentos ou movimentos" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
  {filtersOpen&&<div className="case-filter-panel"><label><input type="checkbox" checked={showDocs} onChange={e=>setShowDocs(e.target.checked)}/> Documentos</label><label><input type="checkbox" checked={showMoves} onChange={e=>setShowMoves(e.target.checked)}/> Movimentos internos</label><label className="autos-sort">Ordem <select value={ascending?'asc':'desc'} onChange={e=>setAscending(e.target.value==='asc')}><option value="desc">Mais recentes</option><option value="asc">Mais antigos</option></select></label><div className="autos-filters"><label><Tag size={14}/> Tipo<select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="">Todos</option>{DOCUMENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></label><label>Origem<select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="">Todas</option><option value="local">Local</option><option value="drive">Google Drive</option><option value="link">Vínculo externo</option></select></label><label>De<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Até<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>{web&&connected&&<div className="autos-content-search"><label>Conteúdo indexado<input value={contentTerm} maxLength={200} onChange={e=>setContentTerm(e.target.value)} placeholder="Texto ou expressão"/></label><button className="secondary-button" disabled={cloudBusy||!contentTerm.trim()} onClick={searchContent}>Pesquisar conteúdo</button>{contentIds&&<button className="secondary-button" onClick={()=>{setContentIds(null);setContentTerm('')}}>Limpar pesquisa</button>}</div>}</div>}
  <div className="case-chronology-scroll"><small className="case-count">{timeline.length} registro(s)</small>{groupTimeline(timeline).map((g,i)=><section className="case-day" key={(g.key||'unknown')+':'+i}><h4>{dateLabel(g.key)}</h4>{groupJudicialAttachments(g.rows).map(({main:d,children})=><div className="case-event" key={d.id}><span className="case-event-dot" aria-hidden="true"/><div className="case-event-card case-event-group"><button className={'case-piece'+(d.kind==='movement'?'':' case-piece-document')} type="button" aria-pressed={selected===d.id} onClick={()=>selectDocument(d.id)}>{d.kind==='movement'?<><strong className="case-movement-title">{d.name.toLocaleUpperCase('pt-BR')}</strong><small>Movimentação interna</small></>:<><span className="case-doc-link"><FileText size={15}/><span className="case-doc-name">{d.reference&&!d.name.includes(d.reference)?d.reference+' - ':''}{d.name}</span>{favorites.includes(d.id)&&<Star size={13} fill="currentColor"/>}</span>{displayTime(d)&&<time className="case-doc-time">{displayTime(d)}</time>}</>}</button>{children.length>0&&<div className="case-attachments" aria-label="Anexos">{children.map(child=><button key={child.id} className="case-piece case-attachment" type="button" aria-pressed={selected===child.id} onClick={()=>selectDocument(child.id)}><span className="case-doc-link"><FileText size={14}/><span className="case-doc-name">{child.reference&&!child.name.includes(child.reference)?child.reference+' - ':''}{child.name}</span>{favorites.includes(child.id)&&<Star size={13} fill="currentColor"/>}</span></button>)}</div>}{d.kind==='movement'&&formatTime(d.rawDate)&&<div className="case-event-meta"><time>{formatTime(d.rawDate)}</time></div>}</div></div>)}</section>)}{!timeline.length&&<div className="case-empty-list">Nenhum documento ou movimento encontrado.</div>}</div>
 </aside>}
 {!collapsed&&<div className="case-tree-divider" role="separator" aria-label="Ajustar largura da árvore" aria-orientation="vertical" aria-valuemin={220} aria-valuemax={treeMax} aria-valuenow={actualTreeWidth} aria-valuetext={actualTreeWidth+' pixels'} tabIndex={0} onPointerDown={beginTreeResize} onPointerMove={moveTreeResize} onPointerUp={endTreeResize} onPointerCancel={endTreeResize} onLostPointerCapture={endTreeResize} onKeyDown={treeResizeKey} onDoubleClick={()=>{setTreeWidth(330);saveTreeWidth(330)}} title="Arraste para ajustar a largura da árvore. Clique duas vezes para restaurar 330 px."/>}
 <section className="case-document" aria-label="Visualização do documento">
  <div className="case-document-bar">{collapsed&&<button className="case-tool" title="Exibir cronologia" aria-label="Exibir cronologia" onClick={()=>setCollapsed(false)}><PanelLeftOpen size={19}/></button>}{view==='details'?<><strong>Dados do processo e demandas</strong><button className="case-tool" onClick={()=>setView('autos')}>Voltar aos autos</button></>:<><div className="case-document-title"><strong>{active?(active.reference&&!active.name.includes(active.reference)?active.reference+' - ':'')+active.name:movement?'Movimentação interna':'Autos do processo'}</strong><small>{active?(dateOriginLabel(active.dateOrigin)+': ')+dateLabel(active.sortDate)+(selectedTime?' às '+selectedTime:''):movement?dateLabel(movement.sortDate):'Selecione um documento na cronologia'}</small></div>{active&&<button className="case-tool" title="Editar informações do documento" aria-label="Editar informações do documento" aria-expanded={editMeta} onClick={()=>setEditMeta(v=>!v)}><Info size={18}/></button>}</>}</div>
 {view==='details'?<div className="case-details-editor"><ProcessoDetailPage embedded/></div>:<>
 <div className="case-document-controls"><div className="case-pager"><button className="case-tool" aria-label="Primeiro documento" title="Primeiro documento" disabled={!navDocs.length||position===0} onClick={()=>step(0)}><ChevronsLeft size={19}/></button><button className="case-tool" aria-label="Documento anterior" title="Documento anterior" disabled={position<=0} onClick={()=>step(position-1)}><ChevronLeft size={19}/></button><span>{position<0?'—':position+1} de {navDocs.length}</span><button className="case-tool" aria-label="Próximo documento" title="Próximo documento" disabled={!navDocs.length||position===navDocs.length-1} onClick={()=>step(position<0?0:position+1)}><ChevronRight size={19}/></button><button className="case-tool" aria-label="Último documento" title="Último documento" disabled={!navDocs.length||position===navDocs.length-1} onClick={()=>step(navDocs.length-1)}><ChevronsRight size={19}/></button></div><div className="case-doc-actions">{active&&<><button className="case-tool" title="Favorito desta sessão" aria-label="Favorito desta sessão" aria-pressed={favorites.includes(active.id)} onClick={()=>toggleFavorite(active.id)}><Star size={18} fill={favorites.includes(active.id)?'currentColor':'none'}/></button>{active.source==='link'?<a className="case-tool" href={active.url} target="_blank" rel="noreferrer" title="Abrir link externo" aria-label="Abrir link externo"><ArrowUpRight size={18}/></a>:preview?<a className="case-tool" href={preview} download={active.name} aria-label="Baixar documento" title="Baixar documento"><Download size={18}/></a>:null}{web&&connected&&active.source==='drive'&&<button className="case-tool" disabled={!canWrite||busy} onClick={()=>chooseFiles(active.id)}>Nova versão</button>}{active.source==='local'&&<>{connected&&<button className="case-tool" title="Enviar ao Drive" aria-label="Enviar ao Drive" disabled={!canWrite||cloudBusy} onClick={sendCloud}><CloudUpload size={18}/></button>}<button className="case-tool" title="Remover PDF local" aria-label="Remover PDF local" disabled={!canAccess(currentUser,'autos',3)||cloudBusy} onClick={remove}><Trash2 size={18}/></button></>}</>}</div></div>
 {active&&editMeta&&<form className="autos-metadata" onSubmit={saveMetadata}><label>Tipo de documento<select disabled={!canWrite} value={metaDraft.type} onChange={e=>setMetaDraft(d=>({...d,type:e.target.value}))}>{DOCUMENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></label><label>Data de juntada (informada)<input disabled={!canWrite} type="date" value={metaDraft.joinedAt} onChange={e=>setMetaDraft(d=>({...d,joinedAt:e.target.value}))}/></label><label>ID do documento no tribunal<input disabled={!canWrite} value={metaDraft.reference} maxLength={120} onChange={e=>setMetaDraft(d=>({...d,reference:e.target.value}))}/></label><button className="secondary-button" disabled={!canWrite} type="submit"><Save size={16}/> Salvar dados</button><small className="autos-document-id"><Hash size={13}/> Identificador interno: {active.id}</small></form>}
 <div className="case-pdf-area">{active?active.source==='link'?<div className="case-view-message"><FileText size={32}/><strong>{active.name}</strong><p>Documento externo. Abra o link autorizado para visualizar.</p></div>:preview?<iframe title={active.name} src={preview}/>:<div className="case-view-message" role="status">{previewError?<><strong>Não foi possível abrir o documento</strong><p>{previewError}</p><button className="secondary-button" onClick={()=>setPreviewRetry(n=>n+1)}>Tentar novamente</button></>:<><span>Carregando documento…</span>{documentProgress!==null&&<strong className="case-document-progress">{documentProgress}%</strong>}</>}</div>:movement?<div className="case-view-message"><Clock size={30}/><strong>{movement.name}</strong><p>Registro interno do Sistema Procuradorias, não uma movimentação oficial do tribunal.</p></div>:<div className="case-view-message"><FileText size={40}/><strong>Nenhum documento selecionado</strong><p>Selecione um registro ou importe um PDF.</p>{web&&!connected&&<Link to="/configuracoes" className="secondary-button">Conectar Google Drive</Link>}</div>}</div>
 </>}</section></div></div>
}
function formatTime(value){const m=String(value||'').match(/(?:T|\s)(\d{2}):(\d{2})/);return m?m[1]+':'+m[2]:''}

function readTreeWidth(key){try{const value=Number(localStorage.getItem(key));return Number.isFinite(value)&&value>=220&&value<=650?value:330}catch{return 330}}

function displayTime(d){return d.sortTime||(d.dateOrigin==='armazenamento'?formatTime(d.date):'')}
function dateOriginLabel(origin){return ({juntada:'Juntada',assinatura:'Assinatura no PJe',protocolo:'Protocolo no PJe',referência:'Data de referência',armazenamento:'Armazenado no sistema','pje-desconhecida':'Data original não identificada'})[origin]||'Data não informada'}

function PjeLoading({progress,skeleton=false,treeWidth=330,collapsed=false}){
 const ref=useRef(null)
 useEffect(()=>{const el=ref.current;el.showModal();return()=>{if(el.open)el.close()}},[])
 if(skeleton)return <dialog ref={ref} className="pje-loading-overlay pje-skeleton-overlay" aria-label="Atualizando autos" onCancel={e=>e.preventDefault()}>
  <div className="pje-skeleton-shell" aria-hidden="true" style={{'--skeleton-tree-width':treeWidth+'px'}}>
   <div className="pje-skeleton-header"><i/><i/><i/></div>
   <div className={'pje-skeleton-workspace'+(collapsed?' pje-skeleton-collapsed':'')}>
    {!collapsed&&<div className="pje-skeleton-tree"><i className="pje-skeleton-search"/>{Array.from({length:6},(_,n)=><div className="pje-skeleton-event" key={n}><i className="pje-skeleton-date"/><div className="pje-skeleton-card"><i/><i/></div></div>)}</div>}
    <div className="pje-skeleton-document"><div className="pje-skeleton-toolbar"><i/><i/></div><div className="pje-skeleton-paper"><i/>{Array.from({length:9},(_,n)=><i key={n}/>)}</div></div>
   </div>
  </div>
  <div className="pje-skeleton-status" role="status" aria-live="polite"><span className="pje-loading-logo" aria-hidden="true"/><strong>Carregando autos…</strong><small>{progress.label}</small><span className="pje-skeleton-meter" role="progressbar" aria-label={progress.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.value??undefined}><i className={progress.value==null?'pje-skeleton-indeterminate':undefined} style={progress.value==null?undefined:{width:progress.value+'%'}}/></span></div>
 </dialog>
 return <dialog ref={ref} className="pje-loading-overlay" aria-label="Progresso dos autos" onCancel={e=>e.preventDefault()}><div role="status" aria-live="polite"><span className="pje-loading-logo" aria-hidden="true"/><strong className="pje-progress-value" role="progressbar" aria-label={progress.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.value}>{progress.value}%</strong><small>{progress.label}</small></div></dialog>
}
