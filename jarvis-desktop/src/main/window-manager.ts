import { BrowserWindow } from "electron";

export class WindowManager {
	private windows: Map<string, BrowserWindow> = new Map();

	createPopoutWindow(
		id: string,
		options: {
			title: string;
			width: number;
			height: number;
			url: string;
		},
	): BrowserWindow {
		// Check if window already exists
		if (this.windows.has(id)) {
			const existingWindow = this.windows.get(id);
			if (existingWindow && !existingWindow.isDestroyed()) {
				existingWindow.focus();
				return existingWindow;
			}
		}

		// Create new window
		const window = new BrowserWindow({
			width: options.width,
			height: options.height,
			minWidth: 300,
			minHeight: 400,
			title: options.title,
			frame: true,
			show: false,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
			},
		});

		window.loadURL(options.url);

		window.once("ready-to-show", () => {
			window.show();
		});

		window.on("closed", () => {
			this.windows.delete(id);
		});

		this.windows.set(id, window);
		return window;
	}

	closeWindow(id: string) {
		const window = this.windows.get(id);
		if (window && !window.isDestroyed()) {
			window.close();
		}
	}

	closeAll() {
		this.windows.forEach((window) => {
			if (!window.isDestroyed()) {
				window.close();
			}
		});
		this.windows.clear();
	}
}

export const windowManager = new WindowManager();
