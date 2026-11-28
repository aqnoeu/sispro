// Conservative separation of PJe exports. Unidentified pages remain visible and are never dropped.
export function identifyPjePage(text){
 const matches=[...String(text||'').matchAll(/(?:Num(?:ero)?\.?|N[úu]m\.)\s*:?\s*(\d{4,16})\s*[-–—]\s*P[áa]g(?:ina)?\.?\s*(\d+)\b/gi)]
 if(!matches.length)return null
 const ids=new Set(matches.map(m=>m[1]))
 if(ids.size!==1)return null
 const m=matches.at(-1)
 return {id:m[1],page:Number(m[2])}
}
export function groupPjePages(pages){
 const groups=[]
 for(let i=0;i<pages.length;i++){
  const tag=identifyPjePage(pages[i]),last=groups.at(-1),number=i+1
  const join=last&&(tag?last.id===tag.id&&last.lastNumber+1===tag.page:!last.id)
  if(join){last.end=number;last.lastNumber=tag?.page||0}
  else groups.push({id:tag?.id||'',start:number,end:number,lastNumber:tag?.page||0,identified:!!tag})
 }
 return groups.map((g,i)=>({...g,name:g.id?'Documento '+g.id+' (p. '+g.start+'-'+g.end+').pdf':(i===0&&groups.some(x=>x.identified)?'Capa e páginas iniciais':'Páginas não identificadas')+' (p. '+g.start+'-'+g.end+').pdf'}))
}
export async function splitProcessPdf(file,groups){
 const {PDFDocument}=await import('pdf-lib')
 const source=await PDFDocument.load(await file.arrayBuffer(),{updateMetadata:false})
 const count=source.getPageCount()
 if(!groups.length||groups[0].start!==1||groups.at(-1).end!==count||groups.some((g,i)=>g.start>g.end||(i&&g.start!==groups[i-1].end+1)))throw Error('Intervalos de páginas inválidos.')
 if(groups.length===1)return [{...groups[0],name:file.name,bytes:new Uint8Array(await file.arrayBuffer())}]
 const result=[]
 for(const g of groups){
  const part=await PDFDocument.create()
  const copied=await part.copyPages(source,Array.from({length:g.end-g.start+1},(_,i)=>g.start+i-1))
  for(const page of copied)part.addPage(page)
  result.push({...g,bytes:await part.save()})
 }
 return result
}
