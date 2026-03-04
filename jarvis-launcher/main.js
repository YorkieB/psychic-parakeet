const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { exec, spawn } = require("child_process");
const Store = require("electron-store");

const store = new Store();
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "assets/icon.png"),
  });

  mainWindow.loadFile("index.html");

  // Remove menu bar
  mainWindow.setMenu(null);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.on("launch-jarvis", () => {
  const jarvisPath = store.get("jarvisPath", path.join(__dirname, "..", "jarvis-desktop"));

  // Launch the Jarvis desktop app
  if (process.platform === "win32") {
    spawn("powershell", ["-Command", `cd '${jarvisPath}'; npm run dev`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn("npm", ["run", "dev"], {
      cwd: jarvisPath,
      detached: true,
      stdio: "ignore",
    }).unref();
  }

  // Wait a bit then close launcher
  setTimeout(() => {
    app.quit();
  }, 2000);
});

ipcMain.on("launch-backend", () => {
  const backendPath = store.get("backendPath", path.join(__dirname, ".."));

  // Launch the backend
  if (process.platform === "win32") {
    spawn("powershell", ["-Command", `cd '${backendPath}'; npm start`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn("npm", ["start"], {
      cwd: backendPath,
      detached: true,
      stdio: "ignore",
    }).unref();
  }

  // Wait a bit then close launcher
  setTimeout(() => {
    app.quit();
  }, 2000);
});

ipcMain.on("launch-both", () => {
  // Launch backend first
  const backendPath = store.get("backendPath", path.join(__dirname, ".."));

  if (process.platform === "win32") {
    spawn("powershell", ["-Command", `cd '${backendPath}'; npm start`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn("npm", ["start"], {
      cwd: backendPath,
      detached: true,
      stdio: "ignore",
    }).unref();
  }

  // Wait 3 seconds then launch frontend
  setTimeout(() => {
    const jarvisPath = store.get("jarvisPath", path.join(__dirname, "..", "jarvis-desktop"));

    if (process.platform === "win32") {
      spawn("powershell", ["-Command", `cd '${jarvisPath}'; npm run dev`], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      spawn("npm", ["run", "dev"], {
        cwd: jarvisPath,
        detached: true,
        stdio: "ignore",
      }).unref();
    }

    // Close launcher
    setTimeout(() => {
      app.quit();
    }, 2000);
  }, 3000);
});

ipcMain.on("close-app", () => {
  app.quit();
});

ipcMain.on("minimize-app", () => {
  mainWindow.minimize();
});
