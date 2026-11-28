import { extractProcessFields } from './processPdfFields.js'
export async function readProcessPdf(file){
 if(!file||file.size>25*1024*1024)throw Error('Selecione um PDF de até 25 MB.')
 const data=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(data.subarray(0,5))!=='%PDF-')throw Error('Arquivo PDF inválido.')
 const [{getDocument,GlobalWorkerOptions},{default:workerUrl}]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
 GlobalWorkerOptions.workerSrc=workerUrl
 const task=getDocument({data,isEvalSupported:false,useWorkerFetch:false,disableFontFace:true,enableXfa:false,stopAtErrors:true})
 try{const pdf=await task.promise;let text='';for(let n=1;n<=Math.min(pdf.numPages,30);n++){const page=await pdf.getPage(n);const content=await page.getTextContent();let priorY=null;for(const item of content.items){if(typeof item.str!=='string')continue;const y=item.transform?.[5];if(priorY!==null&&Math.abs(y-priorY)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');priorY=y??null}text+='\n';page.cleanup();if(text.length>500000)break}return {...extractProcessFields(text),hasText:!!text.trim(),limited:pdf.numPages>30||text.length>500000}}
 finally{await task.destroy()}
}
