import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, '../public');

let win: BrowserWindow | null = null;
let serverInstance: any = null;
const SERVER_PORT = 3001;

// Here, you can also use other preload
const preload = path.join(__dirname, 'preload.js');
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(process.env.DIST!, 'index.html');

async function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'MCPeer',
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    trafficLightPosition: { x: 15, y: 18 },
    backgroundColor: '#0f172a',
    show: false,
  });

  // Show window when ready
  win.once('ready-to-show', () => {
    win?.show();
  });

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (url) {
    // In development, load from Vite dev server
    await win.loadURL(url);
    // Open devtools in development
    win.webContents.openDevTools();
  } else {
    // In production, load the built HTML file
    await win.loadFile(indexHtml);
  }
}

// Start the embedded Express server
async function startServer() {
  try {
    serverInstance = await createServer(SERVER_PORT);
    console.log(`🚀 MCPeer backend started on port ${SERVER_PORT}`);
  } catch (error) {
    console.error('Failed to start backend server:', error);
  }
}

// Stop the server
function stopServer() {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('Backend server stopped');
    });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Start the backend server first
  await startServer();
  
  // Then create the window
  await createWindow();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  win = null;
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// Handle IPC messages
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});
