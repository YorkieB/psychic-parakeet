import path from "node:path";
import { type BrowserWindow, Menu, nativeImage, Tray } from "electron";

export function createTray(mainWindow: BrowserWindow): Tray {
	// Built output is dist/main/main/ so __dirname is dist/main/main
	const iconPath = path.join(__dirname, "../../../public/icons/tray-icon.png");
	const icon = nativeImage.createFromPath(iconPath);

	// Fallback if icon doesn't exist
	if (icon.isEmpty()) {
		// Create a simple colored icon
		const _fallbackIcon = nativeImage.createEmpty();
		// Use a default system icon
	}

	const tray = new Tray(
		icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 }),
	);

	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Show Jarvis",
			click: () => {
				mainWindow.show();
				mainWindow.focus();
			},
		},
		{ type: "separator" },
		{
			label: "Voice Command",
			accelerator: "CommandOrControl+Space",
			click: () => {
				mainWindow.show();
				mainWindow.webContents.send("activate-voice");
			},
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				mainWindow.destroy();
			},
		},
	]);

	tray.setToolTip("Jarvis AI Assistant");
	tray.setContextMenu(contextMenu);

	tray.on("click", () => {
		mainWindow.show();
		mainWindow.focus();
	});

	return tray;
}
