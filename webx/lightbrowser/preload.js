const { contextBridge, ipcRenderer } = require("electron"); // [NRS-1501] Electron context bridge and IPC

contextBridge.exposeInMainWorld("electronAPI", {
	// [NRS-1001]
	bookmarks: {
		// [NRS-1001]
		get: () => ipcRenderer.invoke("bookmarks:get"), // [NRS-1602] Get bookmarks from main process
		add: (bookmark) => ipcRenderer.invoke("bookmarks:add", bookmark), // [NRS-1602] Add bookmark to main process
	}, // [NRS-1001]
	history: {
		// [NRS-1001]
		get: () => ipcRenderer.invoke("history:get"), // [NRS-1602] Get history from main process
		add: (entry) => ipcRenderer.invoke("history:add", entry), // [NRS-1602] Add history entry
		clear: () => ipcRenderer.invoke("history:clear"), // [NRS-1602] Clear browsing history
	}, // [NRS-1001]
	dialogs: {
		// [NRS-1001]
		openFile: () => ipcRenderer.invoke("show-open-dialog"), // [NRS-1303] Show file open dialog
	}, // [NRS-1001]
	setDefaultBrowser: () => ipcRenderer.invoke("set-default-browser"), // [NRS-1602] Set as default browser
	mic: {
		// [NRS-1001]
		ask: () => ipcRenderer.invoke("mic:ask-permission"), // [NRS-1001] Request microphone permission
		status: () => ipcRenderer.invoke("mic:get-status"), // [NRS-1001] Get microphone status
		openSettings: () => ipcRenderer.invoke("mic:open-settings"), // [NRS-1001] Open microphone settings
	}, // [NRS-1001]
	// Generic invoke to reach Jarvis IPC handlers and future endpoints // [NRS-1001]
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args), // [NRS-1501] Generic IPC invoke wrapper
}); // [NRS-1001]
