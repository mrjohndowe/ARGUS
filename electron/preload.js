const electron = require('electron');
const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld('electronAPI', {
  // Config management
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),
  completeSetup: (config) => ipcRenderer.invoke('complete-setup', config),
  
  // Safe PC utilities
  launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  writeClipboard: (text) => ipcRenderer.invoke('write-clipboard', text)
});
