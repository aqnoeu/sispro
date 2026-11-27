const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');
app.setName('SIPRO'); // Identificador histórico: preserva o diretório dos dados locais.
let win, timer;
const entry = path.join(__dirname, '..', 'dist', 'index.html');
const entryURL = pathToFileURL(entry).href;
const store = () => path.join(app.getPath('userData'), 'sipro-data.json');
function trusted(event) { return event.sender === win?.webContents && event.senderFrame?.url?.split('#')[0] === entryURL; }
function handler(channel, callback) { ipcMain.on(channel, (event, value) => { try { if (!trusted(event)) throw new Error('Origem não autorizada'); event.returnValue = { ok: true, value: callback(value) }; } catch (error) { event.returnValue = { ok: false, error: error.message }; } }); }
handler('sipro:read', () => { try { return JSON.parse(fs.readFileSync(store(), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; } });
handler('sipro:write', (value) => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Dados inválidos'); const file = store(); const temporary = file + '.tmp'; fs.mkdirSync(path.dirname(file), { recursive: true }); const fd = fs.openSync(temporary, 'w'); try { fs.writeFileSync(fd, JSON.stringify(value), 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } fs.renameSync(temporary, file); return true; });
function createWindow() { win = new BrowserWindow({ width: 1440, height: 900, minWidth: 900, minHeight: 600, title: 'Sistema Procuradorias', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } }); win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(console.error); return { action: 'deny' }; }); win.webContents.on('will-navigate', (event, url) => { if (url.split('#')[0] !== entryURL) event.preventDefault(); }); win.loadFile(entry); }
if (!app.requestSingleInstanceLock()) app.quit(); else {
 app.on('second-instance', () => { if (win?.isMinimized()) win.restore(); win?.focus(); });
 app.whenReady().then(() => { createWindow(); if (app.isPackaged && process.platform === 'win32') { autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true; autoUpdater.allowDowngrade = false; autoUpdater.on('error', e => console.warn('Atualização indisponível:', e.message)); let checking = false; const check = async () => { if (checking) return; checking = true; try { await autoUpdater.checkForUpdatesAndNotify(); } catch (e) { console.warn(e.message); } finally { checking = false; } }; check(); timer = setInterval(check, 6 * 60 * 60 * 1000); } });
 app.on('window-all-closed', () => app.quit()); app.on('before-quit', () => clearInterval(timer));
}
