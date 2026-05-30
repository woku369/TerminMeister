const { contextBridge, ipcRenderer } = require('electron');

// Sichere API für das Frontend bereitstellen
contextBridge.exposeInMainWorld('electronAPI', {
  // OneDrive-Integration
  getOneDrivePath: () => ipcRenderer.invoke('get-onedrive-path'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

  // Datei-Dialoge
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // System-Info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Menu-Events empfangen
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  },

  // Menu-Events entfernen
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Plattform-Info
  platform: process.platform,
  isElectron: true
});

// Console-Logs für Debugging
console.log('Electron Preload-Script geladen');
console.log('Platform:', process.platform);
console.log('Electron Version:', process.versions.electron);
