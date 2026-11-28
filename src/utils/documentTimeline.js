export const DOCUMENT_TYPES=['Não classificado','Petição inicial','Contestação','Manifestação','Recurso','Decisão','Despacho','Sentença','Acórdão','Certidão','Intimação','Laudo','Comprovante','Outros']
export function dateKey(value){const s=String(value||'');let m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);if(!m){const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s.*)?$/);if(!br)return '';m=[br[0],br[3],br[2],br[1]]}const key=m.slice(1).join('-');const d=new Date(key+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===key?key:''}
export function dateLabel(key){const d=dateKey(key);return d?d.split('-').reverse().join('/'):'Data não informada'}
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
export function enrichDocuments(rows,metadata){return rows.map(row=>{
 const m=metadata.find(x=>x.documentKey===row.id)||{},joinedAt=dateKey(m.joinedAt),indexDate=dateKey(m.indexDate),indexTime=/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(m.indexTime||'')?m.indexTime:'',indexKind=['assinatura','juntada','protocolo'].includes(m.indexDateKind)?m.indexDateKind:''
 const cover=!!m.cover||/^(?:\d{3}-)?Capa e páginas iniciais \(p\. 1-\d+\)\.pdf$/i.test(row.name||'')
 const pjeReference=String(m.pjeReference||String(row.name||'').match(/^(?:\d{3}-)?Documento (\d{4,16}) \(p\. \d+-\d+\)\.pdf$/i)?.[1]||'')
 const pageMatch=String(row.name||'').match(/^(?:\d{3}-)?(?:Documento \d{4,16}|Capa e páginas iniciais|Páginas não identificadas) \(p\. (\d+)-\d+\)\.pdf$/i)
 const pjePage=Number.isSafeInteger(m.pjePage)&&m.pjePage>0?m.pjePage:pageMatch?Number(pageMatch[1]):0,pjeOrder=Number.isSafeInteger(m.pjeOrder)&&m.pjeOrder>0?m.pjeOrder:0
 const type=DOCUMENT_TYPES.includes(m.type)&&m.type!=='Não classificado'?m.type:DOCUMENT_TYPES.find(t=>normalize(t)===normalize(m.pjeType))||'Não classificado'
 return {...row,storageName:row.name,name:m.pjeTitle||row.name,cover,pjeReference,pjePage,pjeOrder,pjeType:m.pjeType||'',type,joinedAt,reference:String(m.reference||pjeReference),indexDate,indexTime,indexDateKind:indexKind,sortDate:joinedAt||indexDate||(pjePage||pjeReference?'':dateKey(row.date)),sortTime:joinedAt?(joinedAt===indexDate&&indexKind==='juntada'?indexTime:''):indexDate?indexTime:'',dateOrigin:joinedAt?'juntada':indexDate&&indexKind?indexKind:pjePage||pjeReference?'pje-desconhecida':row.source==='link'?'referência':'armazenamento'}
})}
export function compareTimeline(a,b,ascending=false){
 const direction=ascending?1:-1
 return Number(!a.sortDate)-Number(!b.sortDate)||direction*String(a.sortDate||'').localeCompare(String(b.sortDate||''))||Number(!a.sortTime)-Number(!b.sortTime)||direction*String(a.sortTime||'').localeCompare(String(b.sortTime||''))||String(a.id).localeCompare(String(b.id))
}
export function navigationDocuments(rows,showCover=false){return rows.filter(r=>showCover||!r.cover)}
export function filterDocuments(rows,{search='',type='',source='',from='',to='',ascending=false,preserveOrder=false}={}){const q=normalize(search).trim();const filtered=rows.filter(r=>(!q||normalize([r.name,r.type,r.pjeType,r.reference,r.id].join(' ')).includes(q))&&(!type||r.type===type)&&(!source||r.source===source)&&(!from||r.sortDate&&r.sortDate>=from)&&(!to||r.sortDate&&r.sortDate<=to));return preserveOrder?filtered:filtered.sort((a,b)=>compareTimeline(a,b,ascending))}
export function validateMetadata(value){const type=value.type;if(!DOCUMENT_TYPES.includes(type))throw Error('Tipo de documento inválido.');const joinedAt=String(value.joinedAt||'');if(joinedAt&&dateKey(joinedAt)!==joinedAt)throw Error('Data de juntada inválida.');return {type,joinedAt,reference:String(value.reference||'').trim().slice(0,120)}}
export function groupTimeline(rows){const groups=[];for(const row of rows){const key=row.sortDate||'';if(groups.at(-1)?.key!==key)groups.push({key,rows:[]});groups.at(-1).rows.push(row)}return groups}

// The PDF index order is authoritative when complete. With partial metadata, page
// positions give a common, stable ordering rather than mixing incompatible ranks.
export function orderPjeDocuments(rows){
 const imported=rows.filter(d=>!d.cover&&(d.pjeOrder||d.pjePage||d.pjeReference))
 const complete=imported.length>0&&imported.every(d=>d.pjeOrder>0)
 const covers=rows.filter(d=>d.cover).sort((a,b)=>(a.pjePage||0)-(b.pjePage||0)||String(a.id).localeCompare(String(b.id)))
 const rank=d=>complete?d.pjeOrder:d.pjePage
 const ordered=[...imported].sort((a,b)=>Number(!rank(a))-Number(!rank(b))||(rank(a)||0)-(rank(b)||0)||(a.pjePage||0)-(b.pjePage||0)||String(a.id).localeCompare(String(b.id)))
 const other=rows.filter(d=>!d.cover&&!d.pjeOrder&&!d.pjePage&&!d.pjeReference).sort((a,b)=>compareTimeline(a,b,true))
 return [...covers,...ordered,...other]
}

// Judicial date/time takes priority. Original index order breaks ties, preserving
// the principal before its attachments; the original PDF page is only a fallback.
export function compareJudicial(a,b,ascending=false){
 const direction=ascending?1:-1
 const at=a.sortTime||'',bt=b.sortTime||''
 return Number(!a.sortDate)-Number(!b.sortDate)
 ||direction*String(a.sortDate||'').localeCompare(String(b.sortDate||''))
 ||Number(!at)-Number(!bt)||direction*at.localeCompare(bt)
 ||Number(!a.pjeOrder)-Number(!b.pjeOrder)||(a.pjeOrder||0)-(b.pjeOrder||0)
 ||Number(!a.pjePage)-Number(!b.pjePage)||(a.pjePage||0)-(b.pjePage||0)
 ||String(a.id).localeCompare(String(b.id))
}
// One PJe signature/protocol timestamp represents one visible filing group.
// No dependence on extracted type or consecutive numeric index positions.
export function groupJudicialAttachments(rows){
 const groups=[];let parent=null
 for(const row of rows){
  const isPje=row.kind!=='movement'&&!row.cover&&(row.pjeReference||row.pjeOrder||row.pjePage)&&['assinatura','juntada','protocolo'].includes(row.indexDateKind)
  const timestamp=isPje&&row.indexDate&&row.indexTime?row.indexDate+'T'+row.indexTime+'|'+row.indexDateKind:''
  if(timestamp&&parent?.timestamp===timestamp){parent.children.push(row);continue}
  const g={main:row,children:[],timestamp};groups.push(g)
  parent=timestamp?g:null
 }
 return groups
}
