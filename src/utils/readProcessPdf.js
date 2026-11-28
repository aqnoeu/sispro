import { extractProcessFields } from './processPdfFields.js'
import { groupPjePages,splitProcessPdf } from './splitProcessPdf.js'
export async function readProcessPdf(file,onProgress=()=>{}){
 if(!file||file.size>100*1024*1024)throw Error('Selecione um PDF de até 100 MB.')
 const data=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(data.subarray(0,5))!=='%PDF-')throw Error('Arquivo PDF inválido.')
 const [{getDocument,GlobalWorkerOptions},{default:workerUrl}]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
 GlobalWorkerOptions.workerSrc=workerUrl
 const task=getDocument({data,isEvalSupported:false,useWorkerFetch:false,disableFontFace:true,enableXfa:false,stopAtErrors:true})
 let groups,fields,hasText
 try{
  const pdf=await task.promise;const pages=[];let cover='',firstPage=''
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();let priorY=null,text=''
   for(const item of content.items){if(typeof item.str!=='string')continue;const y=item.transform?.[5];if(priorY!==null&&Math.abs(y-priorY)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');priorY=y??null}
   pages.push(text.slice(-6000));if(n===1)firstPage=text;if(n<=5)cover+=text+'\n';page.cleanup();if(n===1||n===pdf.numPages||n%10===0)onProgress(n,pdf.numPages)
  }
  const first=extractProcessFields(cover.split('\n').slice(0,100).join('\n'));const front=extractProcessFields(firstPage);if(front.fields.parte||front.ambiguous.includes('parte')){delete first.fields.parte;first.ambiguous=first.ambiguous.filter(k=>k!=='parte');if(front.fields.parte)first.fields.parte=front.fields.parte;else first.ambiguous.push('parte')}fields=first;hasText=pages.some(p=>p.trim());groups=groupPjePages(pages)
 }finally{await task.destroy()}
 const documents=await splitProcessPdf(file,groups)
 return {...fields,hasText,documents}
}
