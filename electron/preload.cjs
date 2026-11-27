const { contextBridge, ipcRenderer } = require('electron');
function call(channel, value) { const response = ipcRenderer.sendSync(channel, value); if (!response?.ok) throw new Error(response?.error || 'Falha no armazenamento local'); return response.value; }
contextBridge.exposeInMainWorld('siproStorage', { read: () => call('sipro:read'), write: (value) => call('sipro:write', value) });
