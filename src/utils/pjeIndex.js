import {dateKey,DOCUMENT_TYPES} from './documentTimeline.js'
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const clean=s=>String(s||'').replace(/\s+/g,' ').trim()
export const isPjeCover=name=>/^(?:\d{3}-)?Capa e páginas iniciais \(p\. 1-\d+\)\.pdf$/i.test(String(name||''))
export const pjeIdFromName=name=>String(name||'').match(/^(?:\d{3}-)?Documento (\d{4,16}) \(p\. \d+-\d+\)\.pdf$/i)?.[1]||''
const validTime=s=>/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(s)
const types=[...DOCUMENT_TYPES.filter(t=>t!=='Não classificado'&&t!=='Outros'),'Documento de comprovação','Documento de identificação','Petição','Outros documentos','Ato ordinatório','Mandado','Ofício','Procuração','Decisão interlocutória','Termo de audiência'].sort((a,b)=>b.length-a.length)
function titleAndType(value){
 const columns=value.split(/\t+|\s{3,}/).map(clean).filter(Boolean)
 if(columns.length>=2)return {title:columns.slice(0,-1).join(' ').slice(0,240),documentType:columns.at(-1).slice(0,100)}
 const s=clean(value),lower=normalize(s)
 const t=types.find(x=>lower.endsWith(' '+normalize(x)))
 return t?{title:s.slice(0,s.length-t.length).trim().slice(0,240),documentType:s.slice(-t.length)}:{title:s.slice(0,240),documentType:''}
}
// Parse only explicit rows of the cover index; signature and filing dates are not interchangeable.
export function parsePjeIndex(text,allowedIds){
 const ids=allowedIds?new Set(allowedIds):null,out=new Map(),conflicts=new Set()
 let kind='',inside=false,current=null
 function flush(){
  if(!current)return
  const {id,date,time,body}=current;current=null
  if(!date||!validTime(time)||!body.trim()||ids&&!ids.has(id)||conflicts.has(id))return
  const v={reference:id,indexDate:date,indexTime:time,indexDateKind:kind,...titleAndType(body)}
  if(!v.title)return
  const prior=out.get(id)
  if(prior&&JSON.stringify(prior)!==JSON.stringify(v)){out.delete(id);conflicts.add(id)}else out.set(id,v)
 }
 const rows=String(text||'').replace(/\r/g,'').split('\n')
 for(let i=0;i<rows.length;i++){
  const raw=rows[i],line=clean(raw),n=normalize(line)
  if(!line)continue
  const header=normalize(rows.slice(i,i+4).join(' '))
  if(/(?:^|\b)id\.?(?:\s|$)/.test(n)&&/data (?:da |de )?(?:assinatura|juntada|protocolo)/.test(header)&&/documento/.test(header)){
   flush();inside=true;kind=/data (?:da |de )?assinatura/.test(header)?'assinatura':/data (?:da |de )?juntada/.test(header)?'juntada':'protocolo';continue
  }
  if(!inside)continue
  if(/^(?:data (?:da |de )?(?:assinatura|juntada|protocolo)|documento(?: tipo)?|tipo|documentos|id\.?)$/.test(n))continue
  let m=raw.match(/^\s*(\d{4,16})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)\s*(.*)$/)
  if(!m&&/^\d{4,16}$/.test(line)){
   const next=rows.slice(i+1,i+4).map(clean).filter(Boolean).join(' ')
   const d=next.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)(?:\s+(.*))?$/)
   if(d){m=[line,line,d[1],d[2],d[3]||''];i+=3}
  }
  if(m){flush();current={id:m[1],date:dateKey(m[2]),time:m[3],body:m[4]||''};continue}
  // A new unknown row or footer must not contaminate the preceding title.
  if(/^\d{4,16}\b|^num\.|^pagina |^pág\.|^https?:|^assinado eletronicamente|^numero do processo/i.test(n)){flush();continue}
  if(current&&current.body.length<400)current.body+=(current.body?' ':'')+raw.trim()
 }
 flush();return out
}
export function attachPjeIndex(groups,index){
 return groups.map(g=>({...g,cover:isPjeCover(g.name),pje:index.get(g.id)||null}))
}
export function importedMetadata(entry){
 const reference=entry.id||entry.pje?.reference||pjeIdFromName(entry.name)
 const result={};if(entry.cover||isPjeCover(entry.name))result.cover=true
 if(reference)result.pjeReference=reference
 if(entry.pje){const {title,documentType,indexDate,indexTime,indexDateKind}=entry.pje;Object.assign(result,{pjeTitle:title,pjeType:documentType,indexDate,indexTime,indexDateKind})}
 return result
}
export function matchPjeIndex(rows,index){
 return rows.flatMap(d=>{const id=d.pjeReference||d.reference||pjeIdFromName(d.storageName||d.name);const pje=index.get(id);return pje?[{document:d,entry:{id,pje}}]:[]})
}
export function pjeKnownType(value){return DOCUMENT_TYPES.find(t=>normalize(t)===normalize(value))||'Não classificado'}
