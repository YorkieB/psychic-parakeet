const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  systemPreferences,
  shell,
} = require('electron'); // [NRS-1501] Electron app framework
const path = require('node:path'); // [NRS-1503] Path utilities
const fs = require('node:fs'); // [NRS-1503] File system access
const { setupJarvisAgentHandlers } = require('./agents/jarvis-integration'); // [NRS-1001] Jarvis AI agent integration
const BrowserAutomationManager = require('./browser-automation-manager'); // [NRS-1101] Browser automation controller
require('dotenv').config(); // [NRS-1601] Load environment variables

// Set OpenAI API key if not already in environment // [NRS-1001]
if (!process.env.OPENAI_API_KEY) {
  // [NRS-1001]
  process.env.OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE'; // [NRS-1001]
} // [NRS-1001] Fallback API key for agent

function getDataFile(name) {
  // [NRS-1001]
  const dir = app.getPath('userData'); // [NRS-1602] Get app data directory
  return path.join(dir, name); // [NRS-1602] Build data file path
} // [NRS-1001]

function readJson(name, fallback) {
  // [NRS-1001]
  try {
    // [NRS-1001]
    const p = getDataFile(name); // [NRS-1602] Get file path
    if (!fs.existsSync(p)) return fallback; // [NRS-1602] Check if file exists
    const raw = fs.readFileSync(p, 'utf8'); // [NRS-1602] Read file content
    return JSON.parse(raw); // [NRS-1602] Parse JSON
  } catch (e) {
    // [NRS-1001]
    console.warn(`Failed to read JSON file ${name}:`, e.message); // [NRS-1602] Log read error
    return fallback; // [NRS-1602] Return fallback value
  } // [NRS-1001]
} // [NRS-1001]

function writeJson(name, data) {
  // [NRS-1001]
  try {
    // [NRS-1001]
    const p = getDataFile(name); // [NRS-1602] Get file path
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8'); // [NRS-1602] Write JSON file
    return true; // [NRS-1602] Success indicator
  } catch (e) {
    // [NRS-1001]
    console.warn(`Failed to write JSON file ${name}:`, e.message); // [NRS-1602] Log write error
    return false; // [NRS-1602] Failure indicator
  } // [NRS-1001]
} // [NRS-1001]

function createWindow() {
  // [NRS-1001]
  const win = new BrowserWindow({
    // [NRS-1001]
    width: 1200, // [NRS-1001]
    height: 800, // [NRS-1001]
    title: 'Light Browser', // [NRS-1001]
    useContentSize: true, // [NRS-1001]
    autoHideMenuBar: true, // [NRS-1001]
    webPreferences: {
      // [NRS-1001]
      preload: path.join(__dirname, 'preload.js'), // [NRS-1001]
      contextIsolation: true, // [NRS-1001]
      nodeIntegration: false, // [NRS-1001]
      webviewTag: true, // [NRS-1001]
    }, // [NRS-1001]
  }); // [NRS-1501] Create browser window with security settings

  win.setMenuBarVisibility(false); // [NRS-1303] Hide menu bar
  win.loadFile(path.join(__dirname, 'src', 'index.html')); // [NRS-1301] Load main HTML
  try {
    win.maximize();
  } catch {} // [NRS-1303] Maximize window

  // Handle window close // [NRS-1001]
  win.on('close', event => {
    // [NRS-1001]
    // Allow normal close // [NRS-1001]
    win.destroy(); // [NRS-1501] Destroy window on close
  }); // [NRS-1001]

  // Keyboard toggles for devtools // [NRS-1001]
  win.webContents.on('before-input-event', (event, input) => {
    // [NRS-1001]
    const key = (input.key || '').toLowerCase(); // [NRS-1303] Normalize key name
    const isDevtoolsCombo = (input.control && input.shift && key === 'i') || key === 'f12'; // [NRS-1303] Check devtools shortcut
    if (isDevtoolsCombo) {
      // [NRS-1001]
      win.webContents.toggleDevTools(); // [NRS-1303] Toggle devtools
      event.preventDefault(); // [NRS-1303] Prevent default behavior
    } // [NRS-1001]
  }); // [NRS-1001]

  // Downloads handling // [NRS-1001]
  try {
    // [NRS-1001]
    session.defaultSession.on('will-download', (event, item) => {
      // [NRS-1001]
      const fileName = item.getFilename(); // [NRS-1101] Get download filename
      const savePath = path.join(app.getPath('downloads'), fileName); // [NRS-1101] Build download path
      item.setSavePath(savePath); // [NRS-1001]
    }); // [NRS-1001]
  } catch (e) {
    // [NRS-1001]
    console.warn('Failed to set up download handler:', e.message); // [NRS-1001]
  } // [NRS-1001]
} // [NRS-1001]

async function loadExtensions() {
  // [NRS-1001]
  const extRoot = path.join(__dirname, 'extensions'); // [NRS-1001]
  if (!fs.existsSync(extRoot)) return; // [NRS-1001]
  const entries = fs.readdirSync(extRoot, { withFileTypes: true }); // [NRS-1001]
  for (const entry of entries) {
    // [NRS-1001]
    if (entry.isDirectory()) {
      // [NRS-1001]
      const extPath = path.join(extRoot, entry.name); // [NRS-1001]
      try {
        // [NRS-1001]
        const loaded = await session.defaultSession.loadExtension(extPath, {
          allowFileAccess: true,
        }); // [NRS-1001]
        console.log('Loaded extension', loaded.name, 'from', extPath); // [NRS-1001]
      } catch (e) {
        // [NRS-1001]
        console.warn('Failed to load extension from', extPath, e.message); // [NRS-1001]
      } // [NRS-1001]
    } // [NRS-1001]
  } // [NRS-1001]
} // [NRS-1001]

// Use a temp cache directory to avoid OS permission issues // [NRS-1001]
const cacheDir = path.join(app.getPath('temp'), 'LightBrowserCache'); // [NRS-1001]
try {
  fs.mkdirSync(cacheDir, { recursive: true });
} catch {} // [NRS-1001]
app.commandLine.appendSwitch('disk-cache-dir', cacheDir); // [NRS-1001]
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache'); // [NRS-1001]
app.commandLine.appendSwitch('disable-application-cache'); // [NRS-1001]
app.commandLine.appendSwitch('disable-gpu'); // [NRS-1001]
// Use temp userData to avoid profile locking issues // [NRS-1001]
try {
  app.setPath('userData', path.join(app.getPath('temp'), 'LightBrowserUserData'));
} catch {} // [NRS-1001]

// Top-level await for app initialization // [NRS-1001]
await app.whenReady(); // [NRS-1001]
await loadExtensions(); // [NRS-1001]
setupJarvisAgentHandlers(); // Initialize multi-agent handlers // [NRS-1001]
createWindow(); // [NRS-1001]
// Wire browser automation IPC to main window // [NRS-1001]
const mainWindow = BrowserWindow.getAllWindows()[0]; // [NRS-1001]
new BrowserAutomationManager(mainWindow); // [NRS-1001]
app.on('activate', () => {
  // [NRS-1001]
  if (BrowserWindow.getAllWindows().length === 0) createWindow(); // [NRS-1001]
}); // [NRS-1001]

app.on('window-all-closed', () => {
  // [NRS-1001]
  if (process.platform !== 'darwin') app.quit(); // [NRS-1001]
}); // [NRS-1001]

// IPC: bookmarks and history // [NRS-1001]
ipcMain.handle('bookmarks:get', () => {
  // [NRS-1001]
  return readJson('bookmarks.json', []); // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('bookmarks:add', (evt, bookmark) => {
  // [NRS-1001]
  const list = readJson('bookmarks.json', []); // [NRS-1001]
  list.push({ ...bookmark, addedAt: new Date().toISOString() }); // [NRS-1001]
  writeJson('bookmarks.json', list); // [NRS-1001]
  return list; // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('history:get', () => {
  // [NRS-1001]
  return readJson('history.json', []); // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('history:add', (evt, entry) => {
  // [NRS-1001]
  const list = readJson('history.json', []); // [NRS-1001]
  list.push({ ...entry, visitedAt: new Date().toISOString() }); // [NRS-1001]
  writeJson('history.json', list); // [NRS-1001]
  return list; // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('history:clear', () => {
  // [NRS-1001]
  writeJson('history.json', []); // [NRS-1001]
  return []; // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('show-open-dialog', async () => {
  // [NRS-1001]
  const res = await dialog.showOpenDialog({ properties: ['openFile'] }); // [NRS-1001]
  return res.filePaths?.[0] || null; // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('set-default-browser', async () => {
  // [NRS-1001]
  try {
    // [NRS-1001]
    const { execSync } = require('node:child_process'); // [NRS-1001]
    const exePath = process.execPath.replaceAll('\\', '\\\\'); // [NRS-1001]

    const commands = [
      // [NRS-1001]
      String.raw`reg add "HKCU\Software\Classes\http\shell\open\command" /ve /d "\"${exePath}\" --url \"%%1\"" /f`, // [NRS-1001]
      String.raw`reg add "HKCU\Software\Classes\https\shell\open\command" /ve /d "\"${exePath}\" --url \"%%1\"" /f`, // [NRS-1001] HTTPS association command
    ]; // [NRS-1001]

    for (const cmd of commands) {
      // [NRS-1001]
      try {
        // [NRS-1001]
        execSync(cmd, { shell: 'cmd.exe', stdio: 'pipe' }); // [NRS-1001]
      } catch (e) {
        // [NRS-1001]
        console.warn('Registry command failed:', cmd, e.message); // [NRS-1001]
      } // [NRS-1001]
    } // [NRS-1001]

    return { success: true, message: 'Set as default browser' }; // [NRS-1001]
  } catch (err) {
    // [NRS-1001]
    console.error('Failed to set default browser:', err.message); // [NRS-1001]
    return { success: false, message: err.message }; // [NRS-1001]
  } // [NRS-1001]
}); // [NRS-1001]

// Microphone permission (helps on macOS; harmless elsewhere) // [NRS-1001]
ipcMain.handle('mic:ask-permission', async () => {
  // [NRS-1001]
  try {
    // [NRS-1001]
    if (systemPreferences?.askForMediaAccess) {
      // [NRS-1001]
      const granted = await systemPreferences.askForMediaAccess('microphone'); // [NRS-1001]
      const status = systemPreferences.getMediaAccessStatus?.('microphone'); // [NRS-1001]
      return { granted, status: status || 'unknown' }; // [NRS-1001]
    } // [NRS-1001]
    return { granted: true, status: 'not-applicable' }; // [NRS-1001]
  } catch (err) {
    // [NRS-1001]
    return {
      granted: false,
      status: 'error',
      error: err?.message || 'Unknown error',
    }; // [NRS-1001]
  } // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('mic:get-status', () => {
  // [NRS-1001]
  try {
    // [NRS-1001]
    if (systemPreferences?.getMediaAccessStatus) {
      // [NRS-1001]
      const status = systemPreferences.getMediaAccessStatus('microphone'); // [NRS-1001]
      return { status }; // [NRS-1001]
    } // [NRS-1001]
    return { status: 'not-applicable' }; // [NRS-1001]
  } catch (err) {
    // [NRS-1001]
    return { status: 'error', error: err?.message || 'Unknown error' }; // [NRS-1001]
  } // [NRS-1001]
}); // [NRS-1001]

ipcMain.handle('mic:open-settings', async () => {
  // [NRS-1001]
  try {
    // [NRS-1001]
    const platform = process.platform; // [NRS-1001]
    if (platform === 'darwin')
      await shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
      );
    // [NRS-1001]
    else if (platform === 'win32')
      await shell.openExternal('ms-settings:privacy-microphone'); // [NRS-1001]
    else await shell.openExternal('about:blank'); // [NRS-1001]
    return { opened: true }; // [NRS-1001]
  } catch (err) {
    // [NRS-1001]
    return { opened: false, error: err?.message || 'Unknown error' }; // [NRS-1001]
  } // [NRS-1001]
}); // [NRS-1001]
