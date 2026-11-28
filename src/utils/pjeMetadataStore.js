import {database,collection,doc,getDocs,query,where,writeBatch} from '../services/local/database.js'
import {importedMetadata} from './pjeIndex.js'
export async function saveImportedMetadata(processId,pairs){
 const items=pairs.map(({document,entry})=>({document,values:importedMetadata(entry)})).filter(x=>x.document?.id&&Object.keys(x.values).length)
 if(!items.length)return 0
 const snap=await getDocs(query(collection(database,'autosMetadata'),where('processId','==',processId)))
 const previous=new Map(snap.docs.map(d=>[d.data().documentKey,d.id]))
 const batch=writeBatch(database)
 for(const {document,values} of items){
  const key=previous.get(document.id)||crypto.randomUUID();previous.set(document.id,key)
  batch.set(doc(database,'autosMetadata',key),{...values,processId,documentKey:document.id},{merge:true})
 }
 await batch.commit();return items.length
}
