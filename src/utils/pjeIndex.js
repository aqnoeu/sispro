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
 let kind='',inside=false,current=null,sequence=0
 function flush(){
  if(!current)return
  const {id,date,time,body,indexOrder}=current;current=null
  if(!date||!validTime(time)||!body.trim()||ids&&!ids.has(id)||conflicts.has(id))return
  const v={reference:id,indexDate:date,indexTime:time,indexDateKind:kind,...titleAndType(body)}
  if(!v.title)return
  const prior=out.get(id)
  if(prior){const {indexOrder:previousOrder,...previous}=prior;if(JSON.stringify(previous)!==JSON.stringify(v)){out.delete(id);conflicts.add(id)}}else out.set(id,{...v,indexOrder})
 }
 const rows=String(text||'').replace(/\r/g,'').split('\n')
 for(let i=0;i<rows.length;i++){
  const raw=rows[i],line=clean(raw),n=normalize(line)
  if(!line)continue
  const header=normalize(rows.slice(i,i+4).join(' '))
  if(/(?:^|\b)id\.?(?:\s|$)/.test(n)&&/\bdata\b/.test(header)&&/\b(?:assinatura|juntada|protocolo)\b/.test(header)&&/documento/.test(header)){
   flush();inside=true;kind=/\bassinatura\b/.test(header)?'assinatura':/\bjuntada\b/.test(header)?'juntada':'protocolo';continue
  }
  if(!inside)continue
  if(/^(?:data (?:da |de )?(?:assinatura|juntada|protocolo)|documento(?: tipo)?|tipo|documentos|id\.?)$/.test(n))continue
  let m=raw.match(/^\s*(\d{4,16})\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?\s*(.*)$/)
  if(!m&&/^\d{4,16}$/.test(line)){
   const next=rows[i+1]||'',d=next.match(/^\s*(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?\s*(.*)$/)
   if(d){m=[line,line,d[1],d[2],d[3]||''];i++}
  }
  if(m){
   flush()
   let id=m[1],body=m[4]||''
   // Narrow PJe ID column wraps, e.g. 10958 + 0483. Match the entire ID,
   // never just its prefix. A following dated row is a new record.
   const next=rows[i+1]||'',suffix=next.match(/^\s*(\d{1,8})(?!\d)(?:\t+|\s+|$)(.*)$/)
   if(suffix&&!/^\d{1,8}\s+\d{2}\/\d{2}\/\d{4}/.test(clean(next))){
    const full=id+suffix[1]
    if(full.length<=16&&(ids?ids.has(full)&&!ids.has(id):id.length<8&&full.length>=8)){
     id=full;i++;if(suffix[2]?.trim())body+=' '+suffix[2].trim()
    }
   }
   current={id,date:dateKey(m[2]),time:m[3]||'',body,indexOrder:++sequence};continue
  }
  if(current&&!current.time){
   const clock=raw.match(/^\s*(\d{2}:\d{2}(?::\d{2})?)\s*(.*)$/)
   if(clock){current.time=clock[1];if(clock[2])current.body+=(current.body?' ':'')+clock[2];continue}
  }
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
 if(Number.isSafeInteger(entry.start)&&entry.start>0)result.pjePage=entry.start
 if(entry.pje){const {title,documentType,indexDate,indexTime,indexDateKind,indexOrder}=entry.pje;Object.assign(result,{pjeTitle:title,pjeType:documentType,indexDate,indexTime,indexDateKind});if(Number.isSafeInteger(indexOrder)&&indexOrder>0)result.pjeOrder=indexOrder}
 return result
}
export function matchPjeIndex(rows,index){
 return rows.flatMap(d=>{const id=d.pjeReference||d.reference||pjeIdFromName(d.storageName||d.name);const pje=index.get(id);return pje?[{document:d,entry:{id,pje}}]:[]})
}
export function pjeKnownType(value){return DOCUMENT_TYPES.find(t=>normalize(t)===normalize(value))||'Não classificado'}

// Read the four physical columns instead of PDF text-stream order. Each
// row contains PDF.js text items with original x/y coordinates and widths.
export function pjeTableRows(visualRows,pageWidth){
 const rows=[...visualRows].sort((a,b)=>b.y-a.y)
 const label=(item)=>normalize(item.str)
 let header=-1,docX=0,typeCenter=0,kind='',idX=0
 for(let i=0;i<rows.length;i++){
  const items=rows[i].items
  const id=items.find(x=>/^id\.?$/.test(label(x))),doc=items.find(x=>/^documento$/.test(label(x))),type=items.find(x=>/^tipo$/.test(label(x)))
  const words=normalize(rows.slice(i,i+3).flatMap(r=>r.items.map(x=>x.str)).join(' '))
  if(id&&doc&&type&&/\bdata\b/.test(words)&&/\b(assinatura|juntada|protocolo)\b/.test(words)){
   header=i;docX=doc.x;typeCenter=type.x+type.width/2;idX=id.x;kind=/\bassinatura\b/.test(words)?'assinatura':/\bjuntada\b/.test(words)?'juntada':'protocolo';break
  }
 }
 if(header<0)return ''
 const dateItem=rows.slice(header+1).flatMap(r=>r.items).find(x=>/^\s*\d{2}\/\d{2}\/\d{4}\b/.test(x.str))
 if(!dateItem||!(idX<dateItem.x&&dateItem.x<docX&&docX<typeCenter))return ''
 const dateX=dateItem.x-2,documentX=docX-3,typeX=Math.max(documentX+20,2*typeCenter-(pageWidth-Math.max(0,idX-10))-3)
 const result=['Id. Data da '+kind+' Documento Tipo']
 let current=null
 const flush=()=>{if(!current)return;const id=current.id.replace(/\s/g,'');if(/^\d{4,16}$/.test(id)&&current.date&&current.title)result.push(id+'\t'+current.date+'\t'+current.title+(current.type?'\t'+current.type:''));current=null}
 for(const row of rows.slice(header+1)){
  const cells=['','','','']
  for(const item of [...row.items].sort((a,b)=>a.x-b.x)){
   const x=item.x,j=x<dateX?0:x<documentX?1:x<typeX?2:3
   cells[j]+=(cells[j]?' ':'')+item.str.trim()
  }
  const [id,date,title,type]=cells.map(clean)
  if(/^\d{1,16}$/.test(id)&&/^\d{2}\/\d{2}\/\d{4}\b/.test(date)){
   flush();current={id,date,title,type};continue
  }
  if(!current)continue
  if(id&& !/^\d{1,8}$/.test(id)){flush();continue}
  if(/^\d{1,8}$/.test(id)&&!date&&current.id.length+id.length<=16)current.id+=id
  if(date&&/^\d{2}:\d{2}(?::\d{2})?$/.test(date)&&!/\d{2}:\d{2}/.test(current.date))current.date+=' '+date
  else if(date){flush();continue}
  if(title)current.title+=(current.title?' ':'')+title
  if(type)current.type+=(current.type?' ':'')+type
 }
 flush();return result.join('\n')
}
