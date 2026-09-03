const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let configPath;

function getConfigPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'argus-config.json');
}

function loadConfig() {
  configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }
  return null;
}

function saveConfig(config) {
  configPath = getConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-config', () => {
  return loadConfig();
});

ipcMain.handle('save-config', (event, config) => {
  return saveConfig(config);
});

ipcMain.handle('is-first-run', () => {
  const config = loadConfig();
  return !config || !config.completedSetup;
});

ipcMain.handle('complete-setup', (event, config) => {
  config.completedSetup = true;
  return saveConfig(config);
});

// Safe PC utilities
ipcMain.handle('launch-app', async (event, appPath) => {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const process = spawn(appPath, [], { detached: true });
    process.unref();
    resolve({ success: true });
  });
});

ipcMain.handle('get-system-info', async () => {
  const os = require('os');
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024)
  };
});

ipcMain.handle('read-clipboard', async () => {
  return clipboard.readText();
});

ipcMain.handle('write-clipboard', async (event, text) => {
  clipboard.writeText(text);
  return { success: true };
});
