export const WEB_MAX_FILE_BYTES=100*1024*1024
const SMALL=5*1024*1024,CHUNK=2*1024*1024
export function encodeBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
export function decodeBase64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
export function createWebDrive(request){
 const pending=new Map()
 return {status:()=>request({action:'status'}),listFiles:processId=>request({action:'files-list',processId}),searchFiles:(processId,term)=>request({action:'files-search',processId,term}),
 async uploadBytes(processId,name,bytes,versionOf,onProgress=()=>{}){
  if(bytes.length>WEB_MAX_FILE_BYTES)throw Error('PDF acima de 100 MB.')
  if(bytes.length<=SMALL){const file=await request({action:'files-upload',processId,name,data:encodeBase64(bytes),versionOf});onProgress(bytes.length,bytes.length);return file}
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join(''),key=processId+':'+sha
  let handle=pending.get(key),reply
  if(handle){try{reply=await request({action:'files-upload-status',processId,handle})}catch{pending.delete(key);handle=null}}
  if(!handle||reply?.expired){reply=await request({action:'files-upload-start',processId,name,total:bytes.length,sha,versionOf});handle=reply.handle;if(handle)pending.set(key,handle)}
  for(let i=0;i<Math.ceil(bytes.length/CHUNK)+12;i++){
   if(reply.file){pending.delete(key);onProgress(bytes.length,bytes.length);return reply.file}
   const offset=reply.next;if(!handle||!Number.isSafeInteger(offset)||offset<0||offset>=bytes.length)throw Error('Resposta de envio inválida.')
   onProgress(offset,bytes.length)
   try{reply=await request({action:'files-upload-chunk',processId,handle,offset,data:encodeBase64(bytes.subarray(offset,offset+CHUNK))})}
   catch{reply=await request({action:'files-upload-status',processId,handle})}
   if(reply.expired){pending.delete(key);throw Error('Sessão de envio expirada. Tente novamente.')}
  }
  throw Error('Envio não concluído. Tente novamente.')
 },
 async readFile(processId,fileId,size){
  if(!size||size<=SMALL)return decodeBase64((await request({action:'files-read',processId,fileId})).data)
  if(size>WEB_MAX_FILE_BYTES)throw Error('PDF acima de 100 MB.')
  const bytes=new Uint8Array(size)
  for(let offset=0;offset<size;){const r=await request({action:'files-read-block',processId,fileId,offset}),part=decodeBase64(r.data);if(r.total!==size||!part.length||r.next!==offset+part.length||r.next>size)throw Error('Download incompleto.');bytes.set(part,offset);offset=r.next}
  return bytes
 }}
}
const encoder=new TextEncoder()
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0})
export function crc32(b){let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0}
export function makeZip(entries){const local=[],central=[];let offset=0,centralSize=0;for(const {name,data} of entries){const n=encoder.encode(name),b=data instanceof Uint8Array?data:new Uint8Array(data),crc=crc32(b);const h=new Uint8Array(30),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);local.push(h,n,b);const ch=new Uint8Array(46),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,b.length,true);cv.setUint32(24,b.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);central.push(ch,n);centralSize+=46+n.length;offset+=30+n.length+b.length}const e=new Uint8Array(22),v=new DataView(e.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...local,...central,e],{type:'application/zip'})}
const safeName=s=>String(s||'documento').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,160)
export async function exportAutosZip({numero,docs,read}){if(docs.length>200)throw Error('Exportação limitada a 200 documentos.');let bytes=0;const entries=[],index=[];for(const [i,d] of docs.entries()){const item={ordem:i+1,nome:d.name,tipo:d.type,data:d.sortDate,origem:d.source,referencia:d.reference,versaoDe:d.versionOf};if(d.source==='link'){item.url=d.url}else{const data=new Uint8Array(await read(d));bytes+=data.length;if(bytes>300*1024*1024)throw Error('Exportação limitada a 300 MB.');item.arquivo=String(i+1).padStart(3,'0')+'-'+safeName(d.name).replace(/\.pdf$/i,'')+'.pdf';entries.push({name:item.arquivo,data})}index.push(item)}entries.push({name:'indice.json',data:encoder.encode(JSON.stringify({processo:numero,documentos:index},null,2))});const url=URL.createObjectURL(makeZip(entries));const a=document.createElement('a');a.href=url;a.download='autos-'+safeName(numero)+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
