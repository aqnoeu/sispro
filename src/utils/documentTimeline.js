export const DOCUMENT_TYPES=['Não classificado','Petição inicial','Contestação','Manifestação','Recurso','Decisão','Despacho','Sentença','Acórdão','Certidão','Intimação','Laudo','Comprovante','Outros']
export function dateKey(value){const s=String(value||'');let m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);if(!m){const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s.*)?$/);if(!br)return '';m=[br[0],br[3],br[2],br[1]]}const key=m.slice(1).join('-');const d=new Date(key+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===key?key:''}
export function dateLabel(key){const d=dateKey(key);return d?d.split('-').reverse().join('/'):'Data não informada'}
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
export function enrichDocuments(rows,metadata){return rows.map(row=>{
 const m=metadata.find(x=>x.documentKey===row.id)||{},joinedAt=dateKey(m.joinedAt),indexDate=dateKey(m.indexDate),indexTime=/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(m.indexTime||'')?m.indexTime:'',indexKind=['assinatura','juntada','protocolo'].includes(m.indexDateKind)?m.indexDateKind:''
 const cover=!!m.cover||/^(?:\d{3}-)?Capa e páginas iniciais \(p\. 1-\d+\)\.pdf$/i.test(row.name||'')
 const pjeReference=String(m.pjeReference||String(row.name||'').match(/^(?:\d{3}-)?Documento (\d{4,16}) \(p\. \d+-\d+\)\.pdf$/i)?.[1]||'')
 const type=DOCUMENT_TYPES.includes(m.type)&&m.type!=='Não classificado'?m.type:DOCUMENT_TYPES.find(t=>normalize(t)===normalize(m.pjeType))||'Não classificado'
 return {...row,storageName:row.name,name:m.pjeTitle||row.name,cover,pjeReference,pjeType:m.pjeType||'',type,joinedAt,reference:String(m.reference||pjeReference),indexDate,indexTime,indexDateKind:indexKind,sortDate:joinedAt||indexDate||dateKey(row.date),sortTime:joinedAt?(joinedAt===indexDate&&indexKind==='juntada'?indexTime:''):indexDate?indexTime:'',dateOrigin:joinedAt?'juntada':indexDate&&indexKind?indexKind:row.source==='link'?'referência':'armazenamento'}
})}
export function compareTimeline(a,b,ascending=false){
 const direction=ascending?1:-1
 return Number(!a.sortDate)-Number(!b.sortDate)||direction*String(a.sortDate||'').localeCompare(String(b.sortDate||''))||Number(!a.sortTime)-Number(!b.sortTime)||direction*String(a.sortTime||'').localeCompare(String(b.sortTime||''))||String(a.id).localeCompare(String(b.id))
}
export function navigationDocuments(rows,showCover=false){return rows.filter(r=>showCover||!r.cover)}
export function filterDocuments(rows,{search='',type='',source='',from='',to='',ascending=false}={}){const q=normalize(search).trim();return rows.filter(r=>(!q||normalize([r.name,r.type,r.pjeType,r.reference,r.id].join(' ')).includes(q))&&(!type||r.type===type)&&(!source||r.source===source)&&(!from||r.sortDate&&r.sortDate>=from)&&(!to||r.sortDate&&r.sortDate<=to)).sort((a,b)=>compareTimeline(a,b,ascending))}
export function validateMetadata(value){const type=value.type;if(!DOCUMENT_TYPES.includes(type))throw Error('Tipo de documento inválido.');const joinedAt=String(value.joinedAt||'');if(joinedAt&&dateKey(joinedAt)!==joinedAt)throw Error('Data de juntada inválida.');return {type,joinedAt,reference:String(value.reference||'').trim().slice(0,120)}}
export function groupTimeline(rows){const groups=[];for(const row of rows){const key=row.sortDate||'';if(groups.at(-1)?.key!==key)groups.push({key,rows:[]});groups.at(-1).rows.push(row)}return groups}
