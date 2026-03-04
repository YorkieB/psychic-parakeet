import path from "node:path";
import { app, BrowserWindow, type Tray } from "electron";
import { setupIPCHandlers } from "./ipc-handlers";
import { createTray } from "./tray";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === "development";

async function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 720,
		minWidth: 880,
		minHeight: 560,
		frame: true,
		titleBarStyle: "default",
		backgroundColor: "#FFFFFF",
		// Built output is dist/main/main/ so __dirname is dist/main/main
		icon: path.join(__dirname, "../../../public/icons/icon.png"),
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "../../preload/index.js"),
			webviewTag: true,
		},
	});

	// Load app
	if (isDev) {
		const port = process.env.VITE_DEV_PORT || "5173";
		mainWindow.loadURL(`http://localhost:${port}`);
		if (process.env.OPEN_DEVTOOLS === "1") {
			mainWindow.webContents.openDevTools();
		}
	} else {
		mainWindow.loadFile(path.join(__dirname, "../../../dist/renderer/index.html"));
	}

	// Window events
	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	// Setup IPC handlers
	setupIPCHandlers(mainWindow);

	// Create system tray
	tray = createTray(mainWindow);

	return mainWindow;
}

// App ready
app.whenReady().then(async () => {
	await createMainWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createMainWindow();
		}
	});
});

// Quit when all windows closed
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Handle app quitting
app.on("before-quit", () => {
	// Cleanup
	if (tray) {
		tray.destroy();
	}
});
