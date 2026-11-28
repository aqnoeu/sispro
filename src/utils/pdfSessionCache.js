// Only in-memory, scoped to the current authorized process. Never use persistent browser storage.
export function createPdfSessionCache(maxBytes=64*1024*1024,maxEntries=12){
 const entries=new Map(),pending=new Map();let bytes=0,generation=0
 function put(key,value){
  const old=entries.get(key);if(old){bytes-=old.size;entries.delete(key)}
  if(value.size>maxBytes)return value
  entries.set(key,value);bytes+=value.size
  while(bytes>maxBytes||entries.size>maxEntries){const first=entries.keys().next().value;bytes-=entries.get(first).size;entries.delete(first)}
  return value
 }
 return {get(key,loader){
  if(entries.has(key)){const value=entries.get(key);entries.delete(key);entries.set(key,value);return Promise.resolve(value)}
  if(pending.has(key))return pending.get(key)
  const epoch=generation,p=Promise.resolve().then(loader).then(value=>epoch===generation?put(key,value):value).finally(()=>{if(pending.get(key)===p)pending.delete(key)})
  pending.set(key,p);return p
 },clear(){generation++;entries.clear();pending.clear();bytes=0}}
}
