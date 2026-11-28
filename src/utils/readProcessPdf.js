import { extractProcessFields } from './processPdfFields.js'
import {parsePjeIndex,attachPjeIndex} from './pjeIndex.js'
import { groupPjePages,splitProcessPdf,identifyPjePage } from './splitProcessPdf.js'
async function openProcessPdf(file){
 if(!file||file.size>100*1024*1024)throw Error('Selecione um PDF de até 100 MB.')
 const data=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(data.subarray(0,5))!=='%PDF-')throw Error('Arquivo PDF inválido.')
 const [{getDocument,GlobalWorkerOptions},{default:workerUrl}]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
 GlobalWorkerOptions.workerSrc=workerUrl
 const task=getDocument({data,isEvalSupported:false,useWorkerFetch:false,disableFontFace:true,enableXfa:false,stopAtErrors:true})
 return task
}
export async function readProcessPdf(file,onProgress=()=>{},indexOnly=false){
 const task=await openProcessPdf(file)
 let groups,fields,hasText,indexText='',seenDocument=false
 try{
  const pdf=await task.promise;const pages=[];let cover='',firstPage=''
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();let priorY=null,text='',visualRows=[]
   for(const item of content.items){if(typeof item.str!=='string')continue;const y=item.transform?.[5];if(priorY!==null&&Math.abs(y-priorY)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');priorY=y??null;const x=item.transform?.[4];if(Number.isFinite(x)&&Number.isFinite(y)&&item.str.trim()){let row=visualRows.find(v=>Math.abs(v.y-y)<=3);if(!row){row={y,items:[]};visualRows.push(row)}row.items.push({x,width:item.width||0,str:item.str})}}
   const marked=identifyPjePage(text);if(!marked){const visual=visualRows.sort((a,b)=>b.y-a.y).map(row=>{let right=null,out='';for(const item of row.items.sort((a,b)=>a.x-b.x)){out+=(right!==null&&item.x-right>12?'\t':' ')+item.str;right=item.x+item.width}return out.trim()}).join('\n');if(!seenDocument)indexText+=visual+'\n'}else{seenDocument=true;if(indexOnly){page.cleanup();break}}
   pages.push(text.slice(-6000));if(n===1)firstPage=text;if(n<=5)cover+=text+'\n';page.cleanup();if(n===1||n===pdf.numPages||n%10===0)onProgress(n,pdf.numPages)
  }
  const first=extractProcessFields(cover.split('\n').slice(0,100).join('\n'));const front=extractProcessFields(firstPage);if(front.fields.parte||front.ambiguous.includes('parte')){delete first.fields.parte;first.ambiguous=first.ambiguous.filter(k=>k!=='parte');if(front.fields.parte)first.fields.parte=front.fields.parte;else first.ambiguous.push('parte')}fields=first;hasText=pages.some(p=>p.trim());groups=groupPjePages(pages)
 }finally{await task.destroy()}
 const index=parsePjeIndex(indexText,indexOnly?undefined:groups.map(g=>g.id).filter(Boolean))
 if(indexOnly)return {index,fields:fields.fields}
 const documents=await splitProcessPdf(file,attachPjeIndex(groups,index))
 return {...fields,hasText,documents,index}
}
