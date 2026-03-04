/** // [NRS-1301]
 * Browser Automation UI Integration Example // [NRS-1301]
 * Shows how to use Claude browser automation from your renderer process // [NRS-1301]
 *  // [NRS-1301]
 * Add this to your src/renderer.js or create a new automation panel // [NRS-1301]
 */ // [NRS-1301]

class BrowserAutomationUI {
	// [NRS-1301]
	sessionId = null; // [NRS-1102] Current automation session ID
	isRunning = false; // [NRS-1102] Automation running flag

	constructor() {
		// [NRS-1301]
		this.initUI(); // [NRS-1301] Initialize UI elements
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Initialize UI elements // [NRS-1301]
	 */ // [NRS-1301]
	initUI() {
		// [NRS-1301]
		// Create automation panel // [NRS-1301]
		const panel = document.createElement("div"); // [NRS-1301] Create panel element
		panel.id = "automation-panel"; // [NRS-1301] Set panel ID
		panel.innerHTML = `
      <style>
        #automation-panel {
          position: fixed;
          right: 20px;
          top: 20px;
          width: 400px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
        }  /* [NRS-1301] Panel styling */

        #automation-panel h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          font-weight: 600;
        }  /* [NRS-1301] Title styling */

        .auto-button {
          display: block;
          width: 100%;
          padding: 10px;
          margin: 8px 0;
          background: #007AFF;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }  /* [NRS-1303] Button styling */

        .auto-button:hover {  /* [NRS-1303] Button hover state */
          background: #0051D5;
        }

        .auto-button.danger {
          background: #FF3B30;
        }

        .auto-button.danger:hover {
          background: #E8261B;
        }

        .auto-button:disabled {
          background: #CCC;
          cursor: not-allowed;
        }

        #automation-status {
          padding: 10px;
          background: #F5F5F5;
          border-radius: 6px;
          margin: 10px 0;
          min-height: 40px;
          word-break: break-word;
        }

        #automation-status.success {
          background: #D4EDDA;
          color: #155724;
        }

        #automation-status.error {
          background: #F8D7DA;
          color: #721C24;
        }

        #automation-input {
          width: 100%;
          padding: 8px;
          margin: 10px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }

        .auto-section {
          margin: 15px 0;
          padding: 10px 0;
          border-top: 1px solid #eee;
        }

        .auto-section:first-child {
          border-top: none;
          margin-top: 0;
        }
      </style>

      <h3>🤖 Browser Automation</h3>
      
      <div id="automation-status">Ready</div>

      <div class="auto-section">
        <button id="btn-start-session" class="auto-button">Start Session</button>
        <button id="btn-close-session" class="auto-button" disabled>Close Session</button>
      </div>

      <div class="auto-section">
        <input 
          id="automation-input" 
          type="text" 
          placeholder="Enter goal or instruction..."
          disabled
        >
        <button id="btn-analyze" class="auto-button" disabled>Ask Claude</button>
      </div>

      <div class="auto-section">
        <button id="btn-navigate" class="auto-button" disabled>Navigate</button>
        <button id="btn-extract" class="auto-button" disabled>Extract Content</button>
        <button id="btn-screenshot" class="auto-button" disabled>Screenshot</button>
      </div>

      <div class="auto-section">
        <button id="btn-history" class="auto-button" disabled>View History</button>
      </div>
    `; // [NRS-1301] Close automation UI markup template

		document.body.appendChild(panel); // [NRS-1301]
		this.attachEventListeners(); // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Attach click event listeners // [NRS-1301]
	 */ // [NRS-1301]
	attachEventListeners() {
		// [NRS-1301]
		document
			.getElementById("btn-start-session")
			.addEventListener("click", () => this.startSession()); // [NRS-1301]
		document
			.getElementById("btn-close-session")
			.addEventListener("click", () => this.closeSession()); // [NRS-1301]
		document
			.getElementById("btn-analyze")
			.addEventListener("click", () => this.analyzeWithClaude()); // [NRS-1301]
		document.getElementById("btn-navigate").addEventListener("click", () => this.navigateTo()); // [NRS-1301]
		document.getElementById("btn-extract").addEventListener("click", () => this.extractContent()); // [NRS-1301]
		document
			.getElementById("btn-screenshot")
			.addEventListener("click", () => this.takeScreenshot()); // [NRS-1301]
		document.getElementById("btn-history").addEventListener("click", () => this.viewHistory()); // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Start a new automation session // [NRS-1301]
	 */ // [NRS-1301]
	async startSession() {
		// [NRS-1301]
		try {
			// [NRS-1301]
			this.updateStatus("Starting session..."); // [NRS-1301]

			const response = await globalThis.electronAPI.invoke("automation:start-session", {
				// [NRS-1301]
				model: "gpt-5.2", // [NRS-1301]
			}); // [NRS-1301]

			if (response.success) {
				// [NRS-1301]
				this.sessionId = response.sessionId; // [NRS-1301]
				this.isRunning = true; // [NRS-1301]
				this.setControlsEnabled(true); // [NRS-1301]
				this.updateStatus(`Session started: ${this.sessionId}`, "success"); // [NRS-1301]

				// Send current page content to AI // [NRS-1301]
				const content = document.documentElement.innerHTML; // [NRS-1301]
				await globalThis.electronAPI.invoke("automation:update-content", this.sessionId, content); // [NRS-1301]
			} else {
				// [NRS-1301]
				throw new Error(response.error); // [NRS-1301]
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.updateStatus(`Error: ${error.message}`, "error"); // [NRS-1301]
		} // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Close the automation session // [NRS-1301]
	 */ // [NRS-1301]
	async closeSession() {
		// [NRS-1301]
		try {
			// [NRS-1301]
			this.updateStatus("Closing session..."); // [NRS-1301]

			const response = await globalThis.electronAPI.invoke(
				"automation:close-session",
				this.sessionId,
			); // [NRS-1301]

			if (response.success) {
				// [NRS-1301]
				this.sessionId = null; // [NRS-1301]
				this.isRunning = false; // [NRS-1301]
				this.setControlsEnabled(false); // [NRS-1301]
				this.updateStatus("Session closed", "success"); // [NRS-1301]
			} else {
				// [NRS-1301]
				throw new Error(response.error); // [NRS-1301]
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.updateStatus(`Error: ${error.message}`, "error"); // [NRS-1301]
		} // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Ask Claude what to do next // [NRS-1301]
	 */ // [NRS-1301]
	async analyzeWithClaude() {
		// [NRS-1301]
		if (!this.sessionId) {
			// [NRS-1301]
			this.updateStatus("No active session", "error"); // [NRS-1301]
			return; // [NRS-1301]
		} // [NRS-1301]

		try {
			// [NRS-1301]
			const goal = document.getElementById("automation-input").value; // [NRS-1301]
			if (!goal) {
				// [NRS-1301]
				this.updateStatus("Please enter a goal or instruction", "error"); // [NRS-1301]
				return; // [NRS-1301]
			} // [NRS-1301]

			this.updateStatus("Analyzing with Claude..."); // [NRS-1301]

			// Update page content // [NRS-1301]
			const content = document.documentElement.innerHTML; // [NRS-1301]
			await globalThis.electronAPI.invoke("automation:update-content", this.sessionId, content); // [NRS-1301]

			// Ask Claude // [NRS-1301]
			const response = await globalThis.electronAPI.invoke("automation:execute", this.sessionId, {
				// [NRS-1301]
				type: "analyze", // [NRS-1301]
				goal, // [NRS-1301]
			}); // [NRS-1301]

			if (response.success) {
				// [NRS-1301]
				const suggestion = response.result.suggestion; // [NRS-1301]
				this.updateStatus(`Claude: ${suggestion}`, "success"); // [NRS-1301]
				console.log("Full Claude response:", response.result); // [NRS-1301]
			} else {
				// [NRS-1301]
				throw new Error(response.error); // [NRS-1301]
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.updateStatus(`Error: ${error.message}`, "error"); // [NRS-1301]
		} // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Navigate to a URL // [NRS-1301]
	 */ // [NRS-1301]
	async navigateTo() {
		// [NRS-1301]
		if (!this.sessionId) {
			// [NRS-1301]
			this.updateStatus("No active session", "error"); // [NRS-1301]
			return; // [NRS-1301]
		} // [NRS-1301]

		const url = document.getElementById("automation-input").value; // [NRS-1301]
		if (!url) {
			// [NRS-1301]
			this.updateStatus("Please enter a URL", "error"); // [NRS-1301]
			return; // [NRS-1301]
		} // [NRS-1301]

		try {
			// [NRS-1301]
			this.updateStatus("Navigating..."); // [NRS-1301]

			const response = await globalThis.electronAPI.invoke("automation:execute", this.sessionId, {
				// [NRS-1301]
				type: "navigate", // [NRS-1301]
				url, // [NRS-1301]
			}); // [NRS-1301]

			if (response.success) {
				// [NRS-1301]
				this.updateStatus(`Navigated to: ${url}`, "success"); // [NRS-1301]
			} else {
				// [NRS-1301]
				throw new Error(response.error); // [NRS-1301]
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.updateStatus(`Error: ${error.message}`, "error"); // [NRS-1301]
		} // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Extract page content with Claude analysis // [NRS-1301]
	 */ // [NRS-1301]
	async extractContent() {
		// [NRS-1301]
		if (!this.sessionId) {
			// [NRS-1301]
			this.updateStatus("No active session", "error"); // [NRS-1301]
			return; // [NRS-1301]
		} // [NRS-1301]

		try {
			// [NRS-1301]
			this.updateStatus("Extracting content..."); // [NRS-1301]

			// Update page content // [NRS-1301]
			const content = document.documentElement.innerHTML; // [NRS-1301]
			await globalThis.electronAPI.invoke("automation:update-content", this.sessionId, content); // [NRS-1301]

			// Extract with Claude analysis // [NRS-1301]
			const response = await globalThis.electronAPI.invoke("automation:execute", this.sessionId, {
				// [NRS-1301]
				type: "extract", // [NRS-1301]
				selector: "body", // [NRS-1301]
			}); // [NRS-1301]

			if (response.success) {
				// [NRS-1301]
				this.updateStatus("Content extracted and analyzed", "success"); // [NRS-1301]
				console.log("Extracted content:", response.result); // [NRS-1301]
			} else {
				// [NRS-1301]
				throw new Error(response.error); // [NRS-1301]
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.updateStatus(`Error: ${error.message}`, "error"); // [NRS-1301]
		} // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Take a screenshot // [NRS-1301]
	 */ // [NRS-1301]
	async takeScreenshot() {
		// [NRS-1301]
		if (!this.sessionId) {
			// [NRS-1301]
			this.updateStatus("No active session", "error"); // [NRS-1301]
			return; // [NRS-1301]
		} // [NRS-1301]

		try {
			// [NRS-1301]
			this.updateStatus("Taking screenshot..."); // [NRS-1301]

			const response = await globalThis.electronAPI.invoke("automation:execute", this.sessionId, {
				// [NRS-1301]
				type: "screenshot", // [NRS-1301]
			}); // [NRS-1301]

			if (response.success) {
				// [NRS-1301]
				this.updateStatus("Screenshot taken", "success"); // [NRS-1301]
				console.log("Screenshot:", response.result); // [NRS-1301]
			} else {
				// [NRS-1301]
				throw new Error(response.error); // [NRS-1301]
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.updateStatus(`Error: ${error.message}`, "error"); // [NRS-1301]
		} // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * View session history // [NRS-1301]
	 */ // [NRS-1301]
	async viewHistory() {
		// [NRS-1301]
		if (!this.sessionId) {
			// [NRS-1301]
			this.updateStatus("No active session", "error"); // [NRS-1301]
			return; // [NRS-1301]
		} // [NRS-1301]

		try {
			// [NRS-1301]
			const response = await globalThis.electronAPI.invoke(
				"automation:get-history",
				this.sessionId,
			); // [NRS-1301]

			if (response.success) {
				// [NRS-1301]
				console.log("Session history:", response.history); // [NRS-1301]
				this.updateStatus("History logged to console", "success"); // [NRS-1301]
			} else {
				// [NRS-1301]
				throw new Error(response.error); // [NRS-1301]
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.updateStatus(`Error: ${error.message}`, "error"); // [NRS-1301]
		} // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Update status message // [NRS-1301]
	 */ // [NRS-1301]
	updateStatus(message, type = "info") {
		// [NRS-1301]
		const statusEl = document.getElementById("automation-status"); // [NRS-1301]
		statusEl.textContent = message; // [NRS-1301]
		statusEl.className = type; // [NRS-1301]
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Enable/disable controls based on session state // [NRS-1301]
	 */ // [NRS-1301]
	setControlsEnabled(enabled) {
		// [NRS-1301]
		document.getElementById("btn-start-session").disabled = enabled; // [NRS-1301]
		document.getElementById("btn-close-session").disabled = !enabled; // [NRS-1301]
		document.getElementById("btn-analyze").disabled = !enabled; // [NRS-1301]
		document.getElementById("btn-navigate").disabled = !enabled; // [NRS-1301]
		document.getElementById("btn-extract").disabled = !enabled; // [NRS-1301]
		document.getElementById("btn-screenshot").disabled = !enabled; // [NRS-1301]
		document.getElementById("btn-history").disabled = !enabled; // [NRS-1301]
		document.getElementById("automation-input").disabled = !enabled; // [NRS-1301]
	} // [NRS-1301]
} // [NRS-1301]

// Initialize when DOM is ready // [NRS-1301]
const startAutomationUI = () => {
	// [NRS-1301]
	globalThis.browserAutomationUI = new BrowserAutomationUI(); // [NRS-1301]
}; // [NRS-1301]

if (document.readyState === "loading") {
	// [NRS-1301]
	document.addEventListener("DOMContentLoaded", startAutomationUI); // [NRS-1301]
} else {
	// [NRS-1301]
	startAutomationUI(); // [NRS-1301]
} // [NRS-1301]
