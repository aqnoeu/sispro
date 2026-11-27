const { contextBridge, ipcRenderer } = require('electron');
function call(channel, value) { const response = ipcRenderer.sendSync(channel, value); if (!response?.ok) throw new Error(response?.error || 'Falha no armazenamento local'); return response.value; }
contextBridge.exposeInMainWorld('siproStorage', { read: () => call('sipro:read'), write: (value) => call('sipro:write', value) });

contextBridge.exposeInMainWorld('siproFiles',{list:pid=>call('sipro:files:list',pid),import:(pid,name,bytes)=>call('sipro:files:import',{pid,name,bytes}),read:(pid,id)=>call('sipro:files:read',{pid,id}),remove:(pid,id)=>call('sipro:files:remove',{pid,id})});

contextBridge.exposeInMainWorld('siproDrive',Object.fromEntries(['status','configure','connect','check','disconnect'].map(name=>[name,()=>ipcRenderer.invoke('sipro:drive:'+name)])));
