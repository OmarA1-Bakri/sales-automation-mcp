/**
 * Electron Main Process
 *
 * Handles:
 * - Window management
 * - MCP server communication
 * - Local file system access
 * - System tray integration
 */

const { app, BrowserWindow, ipcMain, Menu, Tray, safeStorage, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

let mainWindow;
let mcpServerProcess;
let tray;
let encryptedStore;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f172a', // Tailwind slate-900
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    frame: false,
    show: false, // Don't show until ready
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start API server in background
function startMCPServer() {
  const serverPath = path.join(__dirname, '../../sales-automation-api/src/server.js');

  mcpServerProcess = spawn('node', [serverPath], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: '3456',
    },
  });

  mcpServerProcess.stdout.on('data', (data) => {
    console.log(`[MCP Server] ${data}`);
    if (mainWindow) {
      mainWindow.webContents.send('mcp-server-log', data.toString());
    }
  });

  mcpServerProcess.stderr.on('data', (data) => {
    console.error(`[MCP Server Error] ${data}`);
  });

  mcpServerProcess.on('close', (code) => {
    console.log(`[MCP Server] Process exited with code ${code}`);
  });

  console.log('[MCP Server] Started on port 3456');
}

// Create system tray
function createTray() {
  const { nativeImage } = require('electron');
  const iconPath = path.join(__dirname, '../assets/icon.png');

  let trayIcon;
  try {
    // Try to load custom icon
    const fs = require('fs');
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      // Create a simple 16x16 placeholder icon
      trayIcon = nativeImage.createEmpty();
    }
  } catch (err) {
    console.log('[Tray] Using empty icon:', err.message);
    trayIcon = nativeImage.createEmpty();
  }

  if (trayIcon.isEmpty()) {
    console.log('[Tray] Skipping tray creation - no valid icon');
    return; // Skip tray if no valid icon
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show RTGS Sales Automation',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'YOLO Mode Status',
      click: () => {
        mainWindow.webContents.send('show-yolo-status');
        mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('RTGS Sales Automation');

  tray.on('click', () => {
    mainWindow.show();
  });
}

// PHASE 3 FIX (P3.4): Secure credential storage with safeStorage
function setupSecureStorage() {
  // Initialize electron-store for encrypted credentials
  // Note: Primary encryption is via safeStorage, electron-store provides persistence only
  encryptedStore = new Store({
    name: 'encrypted-credentials'
    // No encryptionKey needed - safeStorage handles all encryption
  });

  // Check encryption availability
  const encryptionAvailable = safeStorage.isEncryptionAvailable();

  if (!encryptionAvailable) {
    console.error('[Security] Encryption not available - using fallback storage');
    // Don't show blocking dialog, just log warning
  }

  // Linux-specific security check
  if (process.platform === 'linux') {
    const backend = safeStorage.getSelectedStorageBackend();
    console.log(`[Security] Linux storage backend: ${backend}`);

    if (backend === 'basic_text') {
      console.warn('[Security] WARNING: No secure storage backend available on Linux - credentials stored in plain text');
      // Don't show blocking dialog in development/WSL2 environment
    }
  }

  console.log(`[Security] Secure storage initialized (Encryption: ${encryptionAvailable})`);
}

// App ready
app.whenReady().then(() => {
  setupSecureStorage();
  createWindow();
  createTray();
  // startMCPServer(); // Using external API server on port 3000

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// App quit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Stop MCP server
  if (mcpServerProcess) {
    mcpServerProcess.kill();
  }
});

// ==========================================================================
// IPC HANDLERS - Communication between Renderer and Main process
// ==========================================================================

// Window controls
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

// PHASE 3 FIX (P3.4): Secure credential storage IPC handlers
// Store encrypted credential
ipcMain.handle('credentials:store', async (event, args) => {
  try {
    // Validate sender (prevent IPC injection)
    if (!event.senderFrame.url.startsWith('file://') &&
        !event.senderFrame.url.startsWith('http://localhost:5173')) {
      throw new Error('Unauthorized sender');
    }

    // Validate input
    const { key, value } = args;
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key');
    }
    if (!value || typeof value !== 'string') {
      throw new Error('Invalid value');
    }

    // Check encryption availability
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[Security] Encryption not available, storing unencrypted');
      // Fallback to unencrypted storage with warning
      encryptedStore.set(key, value);
      return { success: true, encrypted: false };
    }

    // Encrypt using safeStorage
    const encrypted = safeStorage.encryptString(value);

    // Store as latin1 encoding (recommended by Signal Desktop)
    encryptedStore.set(key, encrypted.toString('latin1'));

    console.log(`[Security] Stored encrypted credential: ${key}`);
    return { success: true, encrypted: true };

  } catch (error) {
    console.error('[Security] Failed to store credential:', error.message);
    // Don't leak error details to renderer
    return { success: false, error: 'Failed to store credential' };
  }
});

// Retrieve and decrypt credential
ipcMain.handle('credentials:retrieve', async (event, key) => {
  try {
    // Validate sender
    if (!event.senderFrame.url.startsWith('file://') &&
        !event.senderFrame.url.startsWith('http://localhost:5173')) {
      throw new Error('Unauthorized sender');
    }

    // Validate input
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key');
    }

    // Retrieve encrypted value
    const encryptedString = encryptedStore.get(key);
    if (!encryptedString) {
      return { success: false, error: 'Credential not found' };
    }

    // Check if encryption is available
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[Security] Encryption not available, returning unencrypted value');
      return { success: true, value: encryptedString, encrypted: false };
    }

    // Decrypt
    const encryptedBuffer = Buffer.from(encryptedString, 'latin1');
    const decrypted = safeStorage.decryptString(encryptedBuffer);

    return { success: true, value: decrypted, encrypted: true };

  } catch (error) {
    console.error('[Security] Failed to retrieve credential:', error.message);
    return { success: false, error: 'Failed to retrieve credential' };
  }
});

// Delete credential
ipcMain.handle('credentials:delete', async (event, key) => {
  try {
    // Validate sender
    if (!event.senderFrame.url.startsWith('file://') &&
        !event.senderFrame.url.startsWith('http://localhost:5173')) {
      throw new Error('Unauthorized sender');
    }

    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key');
    }

    encryptedStore.delete(key);
    console.log(`[Security] Deleted credential: ${key}`);
    return { success: true };

  } catch (error) {
    console.error('[Security] Failed to delete credential:', error.message);
    return { success: false, error: 'Failed to delete credential' };
  }
});

// List credential keys (not values!)
ipcMain.handle('credentials:list', async (event) => {
  try {
    // Validate sender
    if (!event.senderFrame.url.startsWith('file://') &&
        !event.senderFrame.url.startsWith('http://localhost:5173')) {
      throw new Error('Unauthorized sender');
    }

    const keys = Object.keys(encryptedStore.store);
    return { success: true, keys };

  } catch (error) {
    console.error('[Security] Failed to list credentials:', error.message);
    return { success: false, error: 'Failed to list credentials' };
  }
});

// Check if encryption is available
ipcMain.handle('credentials:encryption-available', async (event) => {
  try {
    // Validate sender
    if (!event.senderFrame.url.startsWith('file://') &&
        !event.senderFrame.url.startsWith('http://localhost:5173')) {
      throw new Error('Unauthorized sender');
    }

    const available = safeStorage.isEncryptionAvailable();
    let backend = null;
    if (process.platform === 'linux') {
      backend = safeStorage.getSelectedStorageBackend();
    }

    return {
      success: true,
      available,
      backend,
      platform: process.platform
    };

  } catch (error) {
    console.error('[Security] Failed to check encryption:', error.message);
    return { success: false, error: 'Failed to check encryption' };
  }
});

// MCP Server API calls
ipcMain.handle('mcp-call', async (event, { endpoint, method = 'POST', data, apiKey }) => {
  const axios = require('axios');

  try {
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await axios({
      method,
      url: `http://localhost:3000${endpoint}`,
      data,
      headers,
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('[MCP Call Error]', error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
});

// File system operations
ipcMain.handle('read-config', async () => {
  const fs = require('fs');
  const configPath = path.join(app.getPath('userData'), 'config.json');

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('[Config Read Error]', error.message);
    return {};
  }
});

ipcMain.handle('write-config', async (event, config) => {
  const fs = require('fs');
  const configPath = path.join(app.getPath('userData'), 'config.json');

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('[Config Write Error]', error.message);
    return { success: false, error: error.message };
  }
});

// Import CSV file
ipcMain.handle('select-csv-file', async () => {
  const { dialog } = require('electron');

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }

  return null;
});

// Export data
ipcMain.handle('export-data', async (event, { data, filename, format = 'csv' }) => {
  const { dialog } = require('electron');
  const fs = require('fs');

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      let content;
      if (format === 'csv') {
        // Convert to CSV
        const headers = Object.keys(data[0] || {});
        const rows = data.map(row =>
          headers.map(h => JSON.stringify(row[h] || '')).join(',')
        );
        content = [headers.join(','), ...rows].join('\n');
      } else {
        content = JSON.stringify(data, null, 2);
      }

      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Export cancelled' };
});

// Notifications
ipcMain.handle('show-notification', async (event, { title, body }) => {
  const { Notification } = require('electron');

  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      icon: path.join(__dirname, '../assets/icon.png')
    }).show();
  }
});

console.log('[Electron] Main process ready');
