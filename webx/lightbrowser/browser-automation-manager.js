/** // [NRS-1101]
 * Browser Automation Integration for Light Browser // [NRS-1101]
 * Shows how to integrate Claude-powered browser automation with your Electron app // [NRS-1101]
 */ // [NRS-1101]

const { ipcMain, BrowserWindow, webContents } = require("electron"); // [NRS-1501] Electron IPC and window management
const BrowserUseAgent = require("./agents/browser-use-agent"); // [NRS-1101] Browser automation agent

class BrowserAutomationManager {
	// [NRS-1101]
	constructor(mainWindow) {
		// [NRS-1101]
		this.sessions = new Map(); // [NRS-1101] Session registry (sessionId -> { agent, webContentsId })
		this.mainWindow = mainWindow; // [NRS-1101] Main window reference
		this.setupIPC(); // [NRS-1101] Initialize IPC handlers
	} // [NRS-1101]

	getWebContents() {
		// [NRS-1101]
		if (this.mainWindow && !this.mainWindow.isDestroyed()) {
			// [NRS-1101]
			return this.mainWindow.webContents; // [NRS-1101] Return main window webContents
		} // [NRS-1101]
		const wins = BrowserWindow.getAllWindows(); // [NRS-1101] Get all windows
		return wins.length ? wins[0].webContents : null; // [NRS-1101] Return first window or null
	} // [NRS-1101]

	getTargetWebContents(preferredId) {
		// [NRS-1101]
		console.log("[Automation] getTargetWebContents called with preferredId:", preferredId); // [NRS-1101] Log target lookup

		if (preferredId) {
			// [NRS-1101]
			const wc = webContents.fromId(preferredId); // [NRS-1101] Find webContents by ID
			if (wc && !wc.isDestroyed()) {
				// [NRS-1101]
				console.log("[Automation] Found webContents by ID:", preferredId); // [NRS-1101] Log success
				return wc; // [NRS-1101] Return found webContents
			} // [NRS-1101]
		} // [NRS-1101]

		// Fallback: pick the first webview webContents if available // [NRS-1101]
		try {
			// [NRS-1101]
			const allWc = webContents.getAllWebContents(); // [NRS-1101] Get all webContents
			console.log(
				"[Automation] All webContents types:",
				allWc.map((wc) => ({ id: wc.id, type: wc.getType?.() || "unknown" })),
			); // [NRS-1101] Log all types

			const candidate = allWc.find(
				(wc) => wc.getType && wc.getType() === "webview" && !wc.isDestroyed(),
			); // [NRS-1101] Find webview
			if (candidate) {
				// [NRS-1101]
				console.log(
					"[Automation] Found webview webContents, id:",
					candidate.id,
					"URL:",
					candidate.getURL?.(),
				); // [NRS-1101] Log webview found
				return candidate; // [NRS-1101] Return webview
			} // [NRS-1101]
		} catch (e) {
			// [NRS-1101]
			console.error("[Automation] Error finding webview:", e); // [NRS-1101] Log error
		} // [NRS-1101]

		console.log("[Automation] Falling back to main window webContents"); // [NRS-1101] Log fallback
		return this.getWebContents(); // [NRS-1101] Return main window as fallback
	} // [NRS-1101]

	async executeAction(action, agent, targetWc) {
		// [NRS-1101]
		switch (
			action.type // [NRS-1101]
		) {
			case "navigate":
				return await this.executeNavigateAction(action, agent, targetWc); // [NRS-1101]
			case "click":
				return await this.executeClickAction(action, agent, targetWc); // [NRS-1101]
			case "type":
				return await this.executeTypeAction(action, agent, targetWc); // [NRS-1101]
			case "wait":
				return await this.executeWaitAction(action); // [NRS-1101]
			case "extract":
				return await agent.extractContent(action.selector); // [NRS-1101]
			case "screenshot":
				return await this.executeScreenshotAction(targetWc); // [NRS-1101]
			case "analyze":
				return await agent.analyzeAndDecide(action.goal); // [NRS-1101]
			default:
				throw new Error(`Unknown action type: ${action.type}`); // [NRS-1101]
		}
	} // [NRS-1101]

	async executeNavigateAction(action, agent, targetWc) {
		// [NRS-1101]
		console.log("[Automation] NAVIGATE action:", action.url); // [NRS-1101]
		if (!targetWc) {
			// [NRS-1101]
			console.log("[Automation] ERROR: No browser window available for navigate"); // [NRS-1101]
			throw new Error("No browser window available"); // [NRS-1101]
		} // [NRS-1101]
		console.log("[Automation] Calling loadURL on webContents..."); // [NRS-1101]
		await targetWc.loadURL(action.url); // [NRS-1501]
		console.log("[Automation] loadURL completed successfully"); // [NRS-1101]
		try {
			// [NRS-1101]
			return await agent.navigate(action.url); // [NRS-1101]
		} catch (error_) {
			// [NRS-1101]
			return {
				status: "completed",
				warning: error_?.message || String(error_),
			}; // [NRS-1101]
		} // [NRS-1101]
	} // [NRS-1101]

	async executeClickAction(action, agent, targetWc) {
		// [NRS-1101]
		console.log("[Automation] CLICK action:", action.selector, "searchText:", action.searchText); // [NRS-1101]
		if (!targetWc) {
			// [NRS-1101]
			console.log("[Automation] ERROR: No browser window available for click"); // [NRS-1101]
			throw new Error("No browser window available"); // [NRS-1101]
		} // [NRS-1101]
		console.log("[Automation] Executing click JavaScript..."); // [NRS-1101]

		const clickScript = this.buildClickScript(action); // [NRS-1101]
		const pageResult = await targetWc.executeJavaScript(clickScript); // [NRS-1501]
		console.log("[Automation] Click result:", pageResult); // [NRS-1101]
		try {
			// [NRS-1101]
			const agentResult = await agent.click(action.selector); // [NRS-1101]
			return { ...agentResult, pageResult }; // [NRS-1101]
		} catch (error_) {
			// [NRS-1101]
			return { status: pageResult, warning: error_?.message || String(error_) }; // [NRS-1101]
		} // [NRS-1101]
	} // [NRS-1101]

	buildClickScript(action) {
		// [NRS-1101]
		const searchText = (action.searchText || action.selector || "").toLowerCase(); // [NRS-1101]
		const selector = action.selector || ""; // [NRS-1101]

		return String.raw`(function() {
      var selector = ${JSON.stringify(selector)};
      var searchText = ${JSON.stringify(searchText)};
      if (selector.match(/^[#.]/)) {
        var el = document.querySelector(selector);
        if (el) { el.click(); return 'clicked-css'; }
      }
      if (!searchText) return 'no-search-text';
      var clickables = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"], [onclick]'));
      for (var i = 0; i < clickables.length; i++) {
        var el = clickables[i];
        var text = (el.textContent || el.value || el.getAttribute('aria-label') || '').toLowerCase();
        if (text.indexOf(searchText) !== -1) {
          el.click();
          return 'clicked-text: ' + el.tagName;
        }
      }
      var allEls = Array.from(document.querySelectorAll('*'));
      for (var j = 0; j < allEls.length; j++) {
        var el = allEls[j];
        if (el.children.length === 0 || el.tagName === 'A' || el.tagName === 'BUTTON') {
          var text = (el.textContent || '').toLowerCase().trim();
          if (text === searchText || text.indexOf(searchText) !== -1) {
            el.click();
            return 'clicked-any: ' + el.tagName;
          }
        }
      }
      return 'not-found';
    })();`; // [NRS-1101]
	} // [NRS-1101]

	async executeTypeAction(action, agent, targetWc) {
		// [NRS-1101]
		if (!targetWc) throw new Error("No browser window available"); // [NRS-1101]
		const pageResult = await targetWc.executeJavaScript(
			`(() => { const el = document.querySelector(${JSON.stringify(action.selector)}); if (el) { el.value = ${JSON.stringify(action.text || "")}; el.dispatchEvent(new Event('input', { bubbles: true })); return 'typed'; } return 'not-found'; })();`,
		); // [NRS-1501]
		try {
			// [NRS-1101]
			const agentResult = await agent.type(action.selector, action.text); // [NRS-1101]
			return { ...agentResult, pageResult }; // [NRS-1101]
		} catch (error_) {
			// [NRS-1101]
			return { status: pageResult, warning: error_?.message || String(error_) }; // [NRS-1101]
		} // [NRS-1101]
	} // [NRS-1101]

	async executeWaitAction(action) {
		// [NRS-1101]
		const delayMs = Math.max(0, Number(action.duration) || 1000); // [NRS-1101]
		await new Promise((resolve) => setTimeout(resolve, delayMs)); // [NRS-1101]
		return { status: "waited", duration: delayMs }; // [NRS-1101]
	} // [NRS-1101]

	async executeScreenshotAction(targetWc) {
		// [NRS-1101]
		if (!targetWc) throw new Error("No browser window available"); // [NRS-1101]
		const image = await targetWc.capturePage(); // [NRS-1501]
		return {
			// [NRS-1101]
			type: "screenshot", // [NRS-1101]
			status: "completed", // [NRS-1101]
			dataUrl: image.toDataURL(), // [NRS-1101]
		}; // [NRS-1101]
	} // [NRS-1101]

	/** // [NRS-1101]
	 * Setup IPC handlers for browser automation // [NRS-1101]
	 */ // [NRS-1101]
	setupIPC() {
		// [NRS-1101]
		// Start automation session // [NRS-1101]
		ipcMain.handle("automation:start-session", async (event, config) => {
			// [NRS-1501]
			try {
				// [NRS-1101]
				const agent = new BrowserUseAgent(config); // [NRS-1101]
				const sessionId = `session-${Date.now()}`; // [NRS-1101]

				const session = await agent.startSession(config); // [NRS-1101]
				this.sessions.set(sessionId, {
					// [NRS-1101]
					agent, // [NRS-1101]
					webContentsId: config?.webContentsId || null, // [NRS-1101]
				}); // [NRS-1101]

				return { success: true, sessionId, session }; // [NRS-1101]
			} catch (error) {
				// [NRS-1101]
				return { success: false, error: error.message }; // [NRS-1101]
			} // [NRS-1101]
		}); // [NRS-1101]

		// Execute browser action // [NRS-1101]
		ipcMain.handle("automation:execute", async (event, sessionId, action) => {
			// [NRS-1501]
			console.log("[Automation] Execute called:", { sessionId, action }); // [NRS-1101]

			try {
				// [NRS-1101]
				const session = this.sessions.get(sessionId); // [NRS-1101]
				if (!session) {
					// [NRS-1101]
					console.log("[Automation] Session not found:", sessionId); // [NRS-1101]
					return { success: false, error: "Session not found" }; // [NRS-1101]
				} // [NRS-1101]
				const agent = session.agent; // [NRS-1101]
				const targetWc = this.getTargetWebContents(action?.webContentsId || session.webContentsId); // [NRS-1101]

				console.log(
					"[Automation] Target webContents found:",
					!!targetWc,
					"type:",
					targetWc?.getType?.(),
					"URL:",
					targetWc?.getURL?.(),
				); // [NRS-1101]

				const result = await this.executeAction(action, agent, targetWc); // [NRS-1101]
				return { success: true, result }; // [NRS-1101]
			} catch (error) {
				// [NRS-1101]
				return { success: false, error: error.message }; // [NRS-1101]
			} // [NRS-1101]
		}); // [NRS-1101]

		// Update page content for Claude to analyze // [NRS-1101]
		ipcMain.handle("automation:update-content", async (event, sessionId, content) => {
			// [NRS-1501]
			try {
				// [NRS-1101]
				const session = this.sessions.get(sessionId); // [NRS-1101]
				if (!session) {
					// [NRS-1101]
					return { success: false, error: "Session not found" }; // [NRS-1101]
				} // [NRS-1101]

				session.agent.setPageContent(content); // [NRS-1101]
				return { success: true }; // [NRS-1101]
			} catch (error) {
				// [NRS-1101]
				return { success: false, error: error.message }; // [NRS-1101]
			} // [NRS-1101]
		}); // [NRS-1101]

		// Close session // [NRS-1101]
		ipcMain.handle("automation:close-session", async (event, sessionId) => {
			// [NRS-1501]
			try {
				// [NRS-1101]
				const session = this.sessions.get(sessionId); // [NRS-1101]
				if (session) {
					// [NRS-1101]
					await session.agent.closeSession(); // [NRS-1101]
					this.sessions.delete(sessionId); // [NRS-1101]
				} // [NRS-1101]
				return { success: true }; // [NRS-1101]
			} catch (error) {
				// [NRS-1101]
				return { success: false, error: error.message }; // [NRS-1101]
			} // [NRS-1101]
		}); // [NRS-1101]

		// Get session history // [NRS-1101]
		ipcMain.handle("automation:get-history", async (event, sessionId) => {
			// [NRS-1501]
			try {
				// [NRS-1101]
				const session = this.sessions.get(sessionId); // [NRS-1101]
				if (!session) {
					// [NRS-1101]
					return { success: false, error: "Session not found" }; // [NRS-1101]
				} // [NRS-1101]
				return { success: true, history: session.agent.getSessionHistory() }; // [NRS-1101]
			} catch (error) {
				// [NRS-1101]
				return { success: false, error: error.message }; // [NRS-1101]
			} // [NRS-1101]
		}); // [NRS-1101]
	} // [NRS-1101]
} // [NRS-1101]

module.exports = BrowserAutomationManager; // [NRS-1101]
