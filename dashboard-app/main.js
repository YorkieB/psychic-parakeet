/*
  This file is the Electron main process for the Jarvis Health Dashboard desktop app.

  It starts the IDE backend server, launches the Vite dev server for the dashboard,
  and opens a native desktop window so you can use the dashboard like a regular app.
*/

const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const DASHBOARD_DIR = path.join(__dirname, '..', 'dashboard');
const IDE_SERVER = path.join(DASHBOARD_DIR, 'ide-server.mjs');
const VITE_PORT = 5173;
const IDE_PORT = 3100;

let mainWindow = null;
let ideServerProcess = null;
let viteProcess = null;

function waitForPort(port, host = '127.0.0.1', timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryConnect() {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', () => { socket.destroy(); retry(); });
      socket.on('timeout', () => { socket.destroy(); retry(); });
      socket.connect(port, host);
    }
    function retry() {
      if (Date.now() - start > timeout) {
        reject(new Error(`Port ${port} not available after ${timeout}ms`));
      } else {
        setTimeout(tryConnect, 500);
      }
    }
    tryConnect();
  });
}

function startIdeServer() {
  console.log('Starting IDE server...');
  ideServerProcess = spawn('node', [IDE_SERVER], {
    cwd: DASHBOARD_DIR,
    stdio: 'pipe',
    env: { ...process.env },
  });
  ideServerProcess.stdout.on('data', (d) => console.log('[IDE]', d.toString().trim()));
  ideServerProcess.stderr.on('data', (d) => console.error('[IDE ERR]', d.toString().trim()));
  ideServerProcess.on('close', (code) => console.log(`IDE server exited with code ${code}`));
}

function startViteServer() {
  console.log('Starting Vite dev server...');
  viteProcess = spawn('npx', ['--yes', 'vite', '--host', '--port', String(VITE_PORT)], {
    cwd: DASHBOARD_DIR,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env },
  });
  viteProcess.stdout.on('data', (d) => console.log('[VITE]', d.toString().trim()));
  viteProcess.stderr.on('data', (d) => console.error('[VITE ERR]', d.toString().trim()));
  viteProcess.on('close', (code) => console.log(`Vite exited with code ${code}`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Jarvis Health Dashboard',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(`http://localhost:${VITE_PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  startIdeServer();
  startViteServer();

  console.log('Waiting for servers to start...');
  try {
    await Promise.all([
      waitForPort(IDE_PORT),
      waitForPort(VITE_PORT),
    ]);
    console.log('Both servers ready!');
  } catch (err) {
    console.error('Server startup failed:', err.message);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (ideServerProcess) { ideServerProcess.kill(); ideServerProcess = null; }
  if (viteProcess) { viteProcess.kill(); viteProcess = null; }
  app.quit();
});

app.on('before-quit', () => {
  if (ideServerProcess) { ideServerProcess.kill(); ideServerProcess = null; }
  if (viteProcess) { viteProcess.kill(); viteProcess = null; }
});
