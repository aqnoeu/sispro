import { dateKey } from './documentTimeline.js'
const clean=s=>String(s||'').replace(/\s+/g,' ').trim()
const norm=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const definitions={numero:['numero','numero cnj','numero do processo','processo','processo n','processo nº','processo n°'],parte:['nome da parte','parte autora','autor','autora','requerente','exequente','impetrante','polo ativo'],assunto:['assunto','assuntos','assunto principal'],orgao:['orgao julgador','orgao','vara','juizo'],fase:['fase','fase processual'],prazo:['data de vencimento','vencimento','prazo final','data limite','proximo prazo'],dataUltimoProtocolo:['data do ultimo protocolo','data de protocolo','protocolado em']}
const cnj=/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g
const keys=new Map(Object.entries(definitions).flatMap(([key,names])=>names.map(name=>[norm(name),key])))
function dateValue(value){const match=value.match(/^(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})(?=$|\s|[.,;])/);if(!match)return '';const d=dateKey(match[0]);return d?d.split('-').reverse().join('/'):''}
// PJe tables can put the linked lawyer on the same extracted line as the party.
const activeRole=/\(\s*(?:AUTOR(?:A)?|REQUERENTE|EXEQUENTE|IMPETRANTE|RECLAMANTE|DEMANDANTE|APELANTE|AGRAVANTE)\s*\)/i
const otherRole=/\(\s*(?:ADVOGAD[OA]|REPRESENTANTE|PROCURADOR(?:A)?|REQUERID[OA]|R[EÉ]U|R[EÉ])\s*\)/i
export function extractPjeParties(text){
 const rows=String(text||'').split(/\r?\n/).map(clean).filter(Boolean),names=new Map()
 for(let i=0;i<rows.length;i++){
  const line=rows[i],role=activeRole.exec(line)
  if(!role)continue
  let name=line.slice(0,role.index).trim()
  if(!name&&i>0&&!otherRole.test(rows[i-1])&&!activeRole.test(rows[i-1]))name=rows[i-1]
  name=name.replace(/^(?:Partes|Polo ativo|Nome da parte|Autor(?:a)?|Requerente)\s*[:|]?\s+/i,'').trim()
  if(!name||name.length>180||otherRole.test(name)||/[:|()]|\b(?:procurador\/terceiro|documentos|processo)\b/i.test(name)||!/\p{L}/u.test(name))continue
  names.set(norm(name),name)
 }
 return [...names.values()]
}
export function extractProcessFields(text){
 const lines=String(text||'').split(/\r?\n/).map(clean).filter(Boolean),found={}
 const add=(key,val)=>{val=clean(val);if(!val||val.length>240)return;if(key==='numero'){const ids=[...new Set(val.match(cnj)||[])];val=ids.length===1?ids[0]:''}if(key==='prazo'||key==='dataUltimoProtocolo')val=dateValue(val);if(!val)return;(found[key]??=new Set()).add(val)}
 for(let i=0;i<lines.length;i++){const line=lines[i],m=line.match(/^([^:]{1,60}):\s*(.*)$/);if(m){const key=keys.get(norm(m[1]));if(key){const next=lines[i+1]||'';add(key,m[2]||(!next.includes(':')&&!keys.has(norm(next))?next:''))}}else if(keys.has(norm(line))){const next=lines[i+1]||'';if(!next.includes(':')&&!keys.has(norm(next)))add(keys.get(norm(line)),next)}}
 const ids=[...new Set(String(text||'').match(cnj)||[])];if(!found.numero&&ids.length===1)add('numero',ids[0]);const fields={},ambiguous=[];for(const [key,values] of Object.entries(found)){if(values.size===1)fields[key]=[...values][0];else ambiguous.push(key)}
 if(!fields.parte&&!ambiguous.includes('parte')){const names=extractPjeParties(text);if(names.length===1)fields.parte=names[0];else if(names.length>1)ambiguous.push('parte')}
 if(ids.length>1&&!found.numero)ambiguous.push('numero')
 return {fields,ambiguous}
}
