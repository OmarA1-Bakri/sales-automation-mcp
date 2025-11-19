/**
 * Electron Preload Script
 *
 * Exposes safe APIs to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // MCP Server communication
  mcpCall: (endpoint, method, data) =>
    ipcRenderer.invoke('mcp-call', { endpoint, method, data }),

  // Config management
  readConfig: () => ipcRenderer.invoke('read-config'),
  writeConfig: (config) => ipcRenderer.invoke('write-config', config),

  // File operations
  selectCSVFile: () => ipcRenderer.invoke('select-csv-file'),
  exportData: (data, filename, format) =>
    ipcRenderer.invoke('export-data', { data, filename, format }),

  // Notifications
  showNotification: (title, body) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  // Event listeners
  onMCPServerLog: (callback) => {
    ipcRenderer.on('mcp-server-log', (event, data) => callback(data));
  },

  onShowYoloStatus: (callback) => {
    ipcRenderer.on('show-yolo-status', () => callback());
  },

  // PHASE 3 FIX (P3.4): Secure credential storage
  storeCredential: (key, value) =>
    ipcRenderer.invoke('credentials:store', { key, value }),

  retrieveCredential: (key) =>
    ipcRenderer.invoke('credentials:retrieve', key),

  deleteCredential: (key) =>
    ipcRenderer.invoke('credentials:delete', key),

  listCredentials: () =>
    ipcRenderer.invoke('credentials:list'),

  checkEncryptionAvailable: () =>
    ipcRenderer.invoke('credentials:encryption-available'),
});

console.log('[Electron] Preload script loaded');
