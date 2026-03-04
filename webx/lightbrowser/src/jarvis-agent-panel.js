/** // [NRS-1301]
 * Jarvis Agent Panel UI Component // [NRS-1301]
 * Integrates agent status and workflow controls into the sidebar // [NRS-1301]
 * Maintains existing Light Browser theme and styling // [NRS-1301]
 */ // [NRS-1301]

class JarvisAgentPanel {
	// [NRS-1301] Jarvis agent UI panel
	constructor() {
		// [NRS-1301] Initialize panel
		this.agents = []; // [NRS-1102] Agent list
		this.isInitialized = false; // [NRS-1001] Initialization flag
		this.currentWorkflow = null; // [NRS-1002] Current workflow state
		this.workflowHistory = []; // [NRS-1002] Workflow history
		this.initError = null; // [NRS-1001] Initialization errors
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Initialize the agent panel UI // [NRS-1301]
	 */ // [NRS-1301]
	async init() {
		// [NRS-1301] Panel initialization
		try {
			// [NRS-1301]
			const result = await globalThis.electronAPI.invoke("jarvis:agents:init"); // [NRS-1001] Get agents
			if (result.success) {
				// [NRS-1001] Check success
				this.agents = result.agents; // [NRS-1102] Store agents
				this.isInitialized = true; // [NRS-1001] Mark initialized
			} else {
				// [NRS-1301]
				this.initError = result.error || "Failed to load agents"; // [NRS-1001] Store error
			} // [NRS-1301]
		} catch (error) {
			// [NRS-1301]
			this.initError = error.message; // [NRS-1001] Catch error
			console.error("Failed to initialize agent panel:", error); // [NRS-1001] Log error
		} // [NRS-1301]

		// [NRS-1301] Always render the panel so the UI stays visible even on errors
		this.render(); // [NRS-1301] Render UI

		// [NRS-1301] Show the sidebar so user can see the panel
		const body = document.body; // [NRS-1301] Get body element
		if (body.classList.contains("sidebar-hidden")) {
			// [NRS-1301] Check sidebar state
			body.classList.remove("sidebar-hidden"); // [NRS-1301] Show sidebar
			console.log("📌 Sidebar shown for Jarvis Agent Panel"); // [NRS-1001] Log action
		} // [NRS-1301]

		console.log(
			"Jarvis Agent Panel init complete. Agents:",
			this.agents.length,
			"Error:",
			this.initError,
		); // [NRS-1001] Log completion
	} // [NRS-1301]

	/** // [NRS-1301]
	 * Render the agent panel into the sidebar // [NRS-1301]
	 */ // [NRS-1301]
	render() {
		// [NRS-1301] Render panel UI
		const sidebar = document.getElementById("sidebar"); // [NRS-1301] Get sidebar
		if (!sidebar) return; // [NRS-1301] Check sidebar exists

		// [NRS-1301] Create or update agent panel section
		let panel = document.getElementById("jarvis-agent-panel"); // [NRS-1301] Get panel element
		if (!panel) {
			// [NRS-1301] Check panel exists
			panel = document.createElement("div"); // [NRS-1301] Create panel
			panel.id = "jarvis-agent-panel"; // [NRS-1301] Set panel ID
			panel.className = "agent-panel-section"; // [NRS-1301] Set style class
			sidebar.insertBefore(panel, sidebar.firstChild); // [NRS-1301] Insert into sidebar
		} // [NRS-1301]

		panel.innerHTML = `
      <div class="section">  ${"[NRS-1301] Panel section "}
        <h3>🤖 Jarvis Agents</h3>  ${"[NRS-1301] Panel header "}
        <div class="agent-status-container">  ${"[NRS-1102] Agent status display "}
          ${this.agents.map((agent, idx) => this.renderAgentCard(agent, idx)).join("")}  ${"[NRS-1102] Render agents "}
        </div>
        ${this.initError ? `<div class="workflow-error" style="margin:8px 0;">❌ ${this.initError}</div>` : ""}  ${"[NRS-1001] Show errors "}
        <div style="margin-bottom: 10px; padding: 0 4px;">  ${"[NRS-1301] Input container "}
          <input  ${"[NRS-1301] Input field "}
            id="sort-input"  ${"[NRS-1301] Input ID "}
            type="text"  ${"[NRS-1301] Text input "}
            placeholder="Type numbers: 13, 4, 9, 1, 42"  ${"[NRS-1301] Input placeholder "}
            style="width: 100%; padding: 8px; border: 1px solid #667eea; background: white; color: #333; border-radius: 4px; font-family: 'Segoe UI', sans-serif; font-size: 13px; box-sizing: border-box; cursor: text; pointer-events: auto; -webkit-user-select: text; user-select: text; position: relative; z-index: 100;"  ${"[NRS-1301] Input styling "}
            autocomplete="off"  ${"[NRS-1301] Disable autocomplete "}
            tabindex="0"  ${"[NRS-1301] Tab index "}
          />
        </div>
        <div class="workflow-controls">  ${"[NRS-1002] Workflow control buttons "}
          <button class="agent-btn research" title="Research workflow" onclick="try { jarvisAgentPanel.showResearchDialog(); } catch(e) { alert('Research Error: ' + e.message); } return false;">  ${"[NRS-1002] Research button "}
            🔍 Research  ${"[NRS-1002] Button label "}
          </button>
          <button class="agent-btn extract" title="Data extraction" onclick="try { jarvisAgentPanel.showExtractDialog(); } catch(e) { alert('Extract Error: ' + e.message); } return false;">  ${"[NRS-1002] Extract button "}
            📊 Extract  ${"[NRS-1002] Button label "}
          </button>
          <button class="agent-btn automate" title="Browser automation" onclick="try { jarvisAgentPanel.showAutomateDialog(); } catch(e) { alert('Automate Error: ' + e.message); } return false;">  ${"[NRS-1002] Automation button "}
            🤖 Automate  ${"[NRS-1002] Button label "}
          </button>
            <button class="agent-btn" title="Sort the numbers you typed above" onclick="try { jarvisAgentPanel.runSortDemo(); } catch(e) { alert('Sort Error: ' + e.message); } return false;">  ${"[NRS-1002] Sort button "}
              ↕️ Sort  ${"[NRS-1002] Button label "}
            </button>
        </div>
        <div id="agent-workflow-status" class="workflow-status"></div>  ${"[NRS-1002] Status display "}
      </div>
    `; // [NRS-1301] Close panel template markup

		// [NRS-1301] Attach event listeners to the sort input field
		const sortInput = document.getElementById("sort-input"); // [NRS-1301] Get input element
		if (sortInput) {
			// [NRS-1301] Check input exists
			sortInput.disabled = false; // [NRS-1301] Enable input field
			sortInput.readOnly = false; // [NRS-1301] Allow user text input

			// [NRS-1301] Mousedown event handler to capture focus before click completes
			sortInput.addEventListener("mousedown", (e) => {
				// [NRS-1301] Register mousedown listener
				// [NRS-1301] Stop event from bubbling to parent elements
				e.stopPropagation(); // [NRS-1301] Prevent event propagation
				// [NRS-1301] Use setTimeout to ensure focus occurs after event completes
				setTimeout(() => sortInput.focus(), 0); // [NRS-1301] Set focus asynchronously
			}); // [NRS-1301]

			// [NRS-1301] Click event handler as fallback focus mechanism
			sortInput.addEventListener("click", (e) => {
				// [NRS-1301] Register click listener
				e.stopPropagation(); // [NRS-1301] Prevent event propagation
				sortInput.focus(); // [NRS-1301] Set focus on input element
			}); // [NRS-1301]

			// [NRS-1301] Focus event handler to log when input gains focus
			sortInput.addEventListener("focus", () => {
				// [NRS-1301] Register focus listener
				console.log("📌 Sort input focused"); // [NRS-1001] Log focus event
			}); // [NRS-1301]

			// [NRS-1301] Input event handler to detect text changes
			sortInput.addEventListener("input", (e) => {
				// [NRS-1301] Register input listener
				console.log("✍️ Sort input changed:", e.target.value); // [NRS-1001] Log input change
			}); // [NRS-1301]

			// [NRS-1301] Keydown event handler to detect special keys like Enter
			sortInput.addEventListener("keydown", (e) => {
				// [NRS-1301] Register keydown listener
				if (e.key === "Enter") {
					// [NRS-1301] Check if Enter key was pressed
					console.log("📨 Enter pressed in sort input"); // [NRS-1001] Log Enter key
					this.runSortDemo(); // [NRS-1002] Execute sort demonstration
				} // [NRS-1301]
				// [NRS-1301] Prevent other handlers from intercepting keyboard input
				e.stopPropagation(); // [NRS-1301] Prevent event propagation
			}); // [NRS-1301]

			console.log("✅ Sort input listeners attached successfully"); // [NRS-1001] Log success
		} else {
			// [NRS-1301]
			console.warn("⚠️ Sort input element not found after render"); // [NRS-1001] Log warning
		} // [NRS-1301]
	} // [NRS-1301] End of method

	/** // [NRS-1301]
	 * Render individual agent card // [NRS-1301]
	 * [NRS-1102] Generates HTML for a single agent card with status indicator
	 */ // [NRS-1301]
	renderAgentCard(agent, _index) {
		// [NRS-1102] Agent card rendering method
		let statusClass = "error"; // [NRS-1102] Initialize error status class
		let statusEmoji = "🔴"; // [NRS-1102] Initialize error emoji
		if (agent.status === "idle") {
			// [NRS-1102] Check if agent is idle
			statusClass = "idle"; // [NRS-1102] Set idle CSS class
			statusEmoji = "⚪"; // [NRS-1102] Set idle status emoji
		} else if (agent.status === "executing") {
			// [NRS-1102] Check if agent is executing
			statusClass = "executing"; // [NRS-1102] Set executing CSS class
			statusEmoji = "🟡"; // [NRS-1102] Set executing status emoji
		} // [NRS-1301]

		// [NRS-1102] Convert agent object to JSON string and escape quotes for HTML attribute
		const agentJson = JSON.stringify(agent).replaceAll('"', "&quot;"); // [NRS-1102] Encode agent data

		// [NRS-1301] Return HTML template string for agent card
		return `
      <div class="agent-card ${statusClass}" style="cursor: pointer;" data-agent='${agentJson}' onclick="showAgentDetails(this)">  ${"[NRS-1102][NRS-1301] Agent card container with click handler "}
        <div class="agent-header">  ${"[NRS-1102] Card header section "}
          <span class="agent-status-dot">${statusEmoji}</span>  ${"[NRS-1102] Status indicator dot "}
          <span class="agent-name">${agent.name}</span>  ${"[NRS-1102] Agent name display "}
        </div>
        <div class="agent-role">${agent.role}</div>  ${"[NRS-1102] Agent role description "}
        <div class="agent-caps">  ${"[NRS-1102] Capabilities section "}
          ${(agent.capabilities || []) // [NRS-1102] Get capabilities array or empty array
						.slice(0, 2) // [NRS-1102] Show only first 2 capabilities
						.map((cap) => `<span class="capability">${cap}</span>`) // [NRS-1102] Create span for each capability
						.join("")}  ${"[NRS-1102] Join capabilities into single string "}
        </div>
      </div>
    `; // [NRS-1301] Return constructed HTML
	} // [NRS-1102] End of renderAgentCard method

	/** // [NRS-1301]
	 * Attach event listeners to buttons // [NRS-1301]
	 * [NRS-1301] Sets up click handlers for all action buttons
	 */ // [NRS-1301]
	attachEventListeners() {
		// [NRS-1301] Button event listener attachment method
		console.log("🔗 Attaching event listeners to agent buttons..."); // [NRS-1001] Log attachment start
		const researchBtn = document.getElementById("btn-agent-research"); // [NRS-1301] Get research button element
		const extractBtn = document.getElementById("btn-agent-extract"); // [NRS-1301] Get extract button element
		const automateBtn = document.getElementById("btn-agent-automate"); // [NRS-1301] Get automate button element
		const sortDemoBtn = document.getElementById("btn-agent-sort-demo"); // [NRS-1301] Get sort demo button element

		if (researchBtn) {
			// [NRS-1301] Verify research button exists
			console.log("✅ Research button found, attaching listener"); // [NRS-1001] Log button found
			researchBtn.addEventListener("click", () => {
				// [NRS-1301] Attach click listener to research button
				console.log("🔍 Research button clicked!"); // [NRS-1001] Log click event
				this.showResearchDialog(); // [NRS-1002] Show research dialog
			}); // [NRS-1301]
		} else {
			// [NRS-1301]
			console.warn("⚠️ Research button NOT found"); // [NRS-1001] Log button not found warning
		} // [NRS-1301]

		if (extractBtn) {
			// [NRS-1301] Verify extract button exists
			console.log("✅ Extract button found, attaching listener"); // [NRS-1001] Log button found
			extractBtn.addEventListener("click", () => {
				// [NRS-1301] Attach click listener to extract button
				console.log("📊 Extract button clicked!"); // [NRS-1001] Log click event
				this.showExtractDialog(); // [NRS-1002] Show extract dialog
			}); // [NRS-1301]
		} else {
			// [NRS-1301]
			console.warn("⚠️ Extract button NOT found"); // [NRS-1001] Log button not found warning
		} // [NRS-1301]

		if (automateBtn) {
			// [NRS-1301] Verify automate button exists
			console.log("✅ Automate button found, attaching listener"); // [NRS-1001] Log button found
			automateBtn.addEventListener("click", () => {
				// [NRS-1301] Attach click listener to automate button
				console.log("🤖 Automate button clicked!"); // [NRS-1001] Log click event
				this.showAutomateDialog(); // [NRS-1002] Show automate dialog
			}); // [NRS-1301]
		} else {
			// [NRS-1301]
			console.warn("⚠️ Automate button NOT found"); // [NRS-1001] Log button not found warning
		} // [NRS-1301]

		if (sortDemoBtn) {
			// [NRS-1301] Verify sort demo button exists
			console.log("✅ Sort button found, attaching listener"); // [NRS-1001] Log button found
			sortDemoBtn.addEventListener("click", () => {
				// [NRS-1301] Attach click listener to sort button
				console.log("↕️ Sort button clicked!"); // [NRS-1001] Log click event
				this.runSortDemo(); // [NRS-1002] Run sort demonstration
			}); // [NRS-1301]
		} else {
			// [NRS-1301]
			console.warn("⚠️ Sort button NOT found"); // [NRS-1001] Log button not found warning
		} // [NRS-1301]
	} // [NRS-1301] End of attachEventListeners method

	/** // [NRS-1301]
	 * Show research workflow dialog // [NRS-1301]
	 * [NRS-1002] Displays dialog for research task input
	 */ // [NRS-1301]
	showResearchDialog() {
		// [NRS-1002] Research dialog method
		console.log("🔍 showResearchDialog called"); // [NRS-1001] Log method call
		showInputDialog("What would you like to research?", "AI safety") // [NRS-1301] Show dialog with prompt
			.then((topic) => {
				// [NRS-1301] Handle dialog result
				console.log("User entered topic:", topic); // [NRS-1001] Log user input
				console.log("Topic type:", typeof topic); // [NRS-1001] Log input type
				console.log("Topic length:", topic ? topic.length : "null"); // [NRS-1001] Log input length
				if (topic) {
					// [NRS-1301] Verify topic was entered
					console.log("Calling executeWorkflow with topic:", topic); // [NRS-1001] Log workflow execution
					this.executeWorkflow("research", topic); // [NRS-1002] Execute research workflow
				} else {
					// [NRS-1301]
					console.log("No topic provided, not executing workflow"); // [NRS-1001] Log cancellation
				} // [NRS-1301]
			}) // [NRS-1301]
			.catch((err) => {
				// [NRS-1301] Handle dialog error
				console.error("showInputDialog error:", err); // [NRS-1001] Log error
				alert(`Error showing dialog: ${err.message}`); // [NRS-1301] Show error alert
			}); // [NRS-1301]
	} // [NRS-1002] End of showResearchDialog method

	/** // [NRS-1301]
	 * Show extraction workflow dialog // [NRS-1301]
	 * [NRS-1002] Displays dialog for web extraction task input
	 */ // [NRS-1301]
	showExtractDialog() {
		// [NRS-1002] Extraction dialog method
		showInputDialog("Enter URL to extract from:", "https://example.com").then((url) => {
			// [NRS-1301] Get URL from user
			if (!url) return; // [NRS-1301] Exit if no URL provided
			showInputDialog("Enter CSS selector (optional):", "*").then((selector) => {
				// [NRS-1301] Get selector from user
				this.executeWorkflow("extract", { url, selector: selector || "*" }); // [NRS-1002] Execute extract workflow
			}); // [NRS-1301]
		}); // [NRS-1301]
	} // [NRS-1002] End of showExtractDialog method

	/** // [NRS-1301]
	 * Show automation workflow dialog // [NRS-1301]
	 * [NRS-1002] Displays dialog for automation task input
	 */ // [NRS-1301]
	showAutomateDialog() {
		// [NRS-1002] Automation dialog method
		showInputDialog(
			// [NRS-1301] Show dialog prompt
			"Describe automation steps (separate with semicolon)", // [NRS-1301] Dialog instruction
			"Navigate to website; Wait for page load; Take screenshot", // [NRS-1301] Dialog example
		).then((steps) => {
			// [NRS-1301] Handle dialog result
			if (!steps) return; // [NRS-1301] Exit if no steps provided
			const stepArray = steps.split(";").map((s) => ({
				// [NRS-1301] Parse steps by semicolon
				description: s.trim(), // [NRS-1301] Trim whitespace from each step
			})); // [NRS-1301]
			this.executeWorkflow("automate", stepArray); // [NRS-1002] Execute automation workflow
		}); // [NRS-1301]
	} // [NRS-1002] End of showAutomateDialog method

	/** // [NRS-1301]
	 * Convert freeform automation steps into structured actions // [NRS-1301]
	 * [NRS-1102] Parses natural language steps into executable browser actions
	 */ // [NRS-1301]
	parseAutomationSteps(steps = []) {
		// [NRS-1102] Automation step parsing method
		return steps.map((step) => this.parseStep(step)); // [NRS-1102] Process each step
	} // [NRS-1102] End of parseAutomationSteps method

	parseStep(step) {
		// [NRS-1102] Parse single automation step
		const raw = typeof step === "string" ? step : step?.description || ""; // [NRS-1102] Extract step description
		const lower = raw.toLowerCase(); // [NRS-1102] Convert to lowercase for pattern matching

		if (/(navigate|go to|open|visit|browse to|load)/.test(lower)) {
			// [NRS-905] Test for navigation keywords
			return this.parseNavigationStep(raw); // [NRS-1102] Delegate to navigation parser
		}

		const waitMatch = lower.match(/wait\s+(\d+)(\s*(ms|milliseconds|seconds|secs|s))?/); // [NRS-905] Match wait pattern
		if (waitMatch) {
			// [NRS-905] Check if wait pattern found
			const num = Number.parseInt(waitMatch[1], 10) || 0; // [NRS-905] Parse numeric value
			const unit = waitMatch[3] || ""; // [NRS-905] Extract time unit
			const duration = unit.startsWith("s") && unit !== "ms" ? num * 1000 : num; // [NRS-905] Convert to milliseconds
			return { type: "wait", duration: duration || 1000 }; // [NRS-905] Return wait action
		}

		if (lower.includes("click")) {
			// [NRS-905] Test for click keyword
			return this.parseClickStep(raw); // [NRS-1102] Delegate to click parser
		}

		if (lower.includes("type")) {
			// [NRS-905] Test for type keyword
			return this.parseTypeStep(raw); // [NRS-1102] Delegate to type parser
		}

		if (/(extract|scrape|read)/.test(lower)) {
			// [NRS-905] Test for extract keywords
			return this.parseExtractStep(raw); // [NRS-1102] Delegate to extract parser
		}

		if (lower.includes("screenshot")) {
			// [NRS-905] Test for screenshot keyword
			return { type: "screenshot" }; // [NRS-905] Return screenshot action
		}

		return { type: "analyze", goal: raw || "Decide next browser action" }; // [NRS-905] Return analyze action
	}

	parseNavigationStep(raw) {
		// [NRS-1102] Parse navigation step
		const fullUrlMatch = raw.match(/https?:\/\/\S+/i); // [NRS-905] Match HTTP/HTTPS URLs
		if (fullUrlMatch) return { type: "navigate", url: fullUrlMatch[0] }; // [NRS-905] Return navigate with URL

		const domainMatch = raw.match(/(?:to|visit|open|load)?\s+(\w[\w-]*(?:\.\w{2,})+(?:\/\S*)?)/i); // [NRS-905] Match domain pattern
		if (domainMatch) return { type: "navigate", url: `https://${domainMatch[1]}` }; // [NRS-905] Return navigate with HTTPS

		const siteMatch = raw.match(/(?:navigate to|go to|open|visit|browse to|load)\s+(\w+)(?:\s|$)/i); // [NRS-905] Match site name
		if (siteMatch) {
			const site = siteMatch[1].toLowerCase(); // [NRS-905] Convert site name to lowercase
			const mappedUrl = this.getSiteUrl(site); // [NRS-1102] Get mapped URL
			if (mappedUrl) return { type: "navigate", url: mappedUrl }; // [NRS-905] Return mapped URL
			return { type: "navigate", url: `https://www.${site}.com` }; // [NRS-905] Return default .com URL
		}

		return { type: "analyze", goal: `Navigate to: ${raw}` }; // [NRS-1102] Fallback analyze action
	}

	getSiteUrl(site) {
		// [NRS-1102] Get URL for common site names
		const sites = {
			// [NRS-1102] Site name mapping
			google: "https://www.google.com",
			youtube: "https://www.youtube.com",
			github: "https://github.com",
			twitter: "https://twitter.com",
			x: "https://x.com",
			facebook: "https://www.facebook.com",
			reddit: "https://www.reddit.com",
			amazon: "https://www.amazon.com",
			wikipedia: "https://www.wikipedia.org",
			bing: "https://www.bing.com",
			linkedin: "https://www.linkedin.com",
			netflix: "https://www.netflix.com",
			instagram: "https://www.instagram.com",
		}; // [NRS-1102] Predefined site URLs
		return sites[site] || null; // [NRS-1102] Return URL or null
	}

	parseClickStep(raw) {
		// [NRS-1102] Parse click step
		const cssMatch = raw.match(/click\s+(?:on\s+)?([#.][-\w:.[\]]+)/i); // [NRS-905] Match CSS selector
		if (cssMatch) return { type: "click", selector: cssMatch[1].trim() }; // [NRS-905] Return click with selector

		const quotedMatch = raw.match(/click\s+(?:on\s+)?["'`]([^"'`]+)["'`]/i); // [NRS-905] Match quoted selector
		if (quotedMatch) return { type: "click", selector: quotedMatch[1].trim() }; // [NRS-905] Return click action

		const textMatch = raw.match(/click\s+(?:on\s+|the\s+)?(.+?)(?:\s+(?:button|link|element))?$/i); // [NRS-905] Match text pattern
		if (textMatch) {
			const buttonText = textMatch[1].trim(); // [NRS-905] Extract button text
			if (buttonText && !["on", "the", "a", "an"].includes(buttonText.toLowerCase())) {
				// [NRS-905] Validate text
				const escapedText = buttonText.replaceAll("'", String.raw`\\'`); // [NRS-905] Escape quotes
				const selector = `a:contains('${escapedText}'), button:contains('${escapedText}'), [aria-label*='${escapedText}' i]`; // [NRS-1102] Build selector
				return { type: "click", selector, searchText: buttonText }; // [NRS-905] Return click with text
			}
		}

		return { type: "analyze", goal: `Click: ${raw}` }; // [NRS-1102] Fallback analyze action
	}

	parseTypeStep(raw) {
		// [NRS-1102] Parse type step
		const typeMatch = raw.match(/type\s+"?([^"']+?)"?\s+(into|in)\s+([#.]?[^\s]+)/i); // [NRS-905] Match type pattern
		if (typeMatch)
			return {
				type: "type",
				selector: typeMatch[3].trim(),
				text: typeMatch[1].trim(),
			}; // [NRS-905] Return type
		return { type: "analyze", goal: `Type: ${raw}` }; // [NRS-1102] Fallback analyze action
	}

	parseExtractStep(raw) {
		// [NRS-1102] Parse extract step
		const selectorMatch =
			raw.match(/selector\s+([#.]?[^\s]+)/i) || raw.match(/from\s+([#.]?[^\s]+)/i); // [NRS-905] Match selector
		return {
			type: "extract",
			selector: selectorMatch ? selectorMatch[1] : "body",
		}; // [NRS-905] Return extract action
	}

	/**
	 * Run automation through the main-process automation manager
	 * [NRS-1102][NRS-810] Executes browser automation workflow with step-by-step progress tracking
	 */
	async runAutomationWorkflow(stepArray = []) {
		// [NRS-1102] Async automation workflow executor
		const statusDiv = document.getElementById("agent-workflow-status"); // [NRS-1301] Get status display element
		const startedAt = Date.now(); // [NRS-810] Record workflow start time
		const actions = this.parseAutomationSteps(stepArray); // [NRS-1102] Parse human-readable steps into actions
		const workflowId = `automation-${startedAt}`; // [NRS-810] Generate unique workflow ID
		let sessionId = null; // [NRS-810] Will hold automation session ID
		const activeWebview = document.querySelector("webview.active"); // [NRS-1301] Get active browser webview
		const webContentsId = activeWebview?.getWebContentsId ? activeWebview.getWebContentsId() : null; // [NRS-1301] Get webview contents ID

		try {
			// [NRS-810] Initialize automation session with LLM model
			const start = await globalThis.electronAPI.invoke("automation:start-session", {
				// [NRS-810] Call main process
				model: "gpt-5.2", // [NRS-810] Specify LLM model
				webContentsId, // [NRS-810] Pass webview ID for browser control
			});

			if (!start.success) {
				// [NRS-810] Check session start success
				throw new Error(start.error || "Failed to start automation session"); // [NRS-810] Throw error if failed
			}

			sessionId = start.sessionId; // [NRS-810] Store session ID for later use
			const stageResults = await this.executeAutomationSteps(
				actions,
				stepArray,
				sessionId,
				webContentsId,
				statusDiv,
			); // [NRS-1102] Execute steps
			const success = stageResults.every((r) => r.status === "success"); // [NRS-810] All steps succeeded?
			this.updateAutomationStatus(statusDiv, success, stageResults); // [NRS-1102] Update UI status
			return {
				success,
				results: {
					workflowId,
					stages: [{ name: "Automation", type: "sequential", results: stageResults }],
					totalDuration: Date.now() - startedAt,
				},
			}; // [NRS-810] Return results
		} catch (error) {
			const msg = error?.message || error || "Automation error"; // [NRS-810] Extract error message
			if (statusDiv) statusDiv.innerHTML = `<div class="workflow-error">❌ ${msg}</div>`; // [NRS-1301] Show error
			return {
				success: false,
				error: msg,
				results: {
					workflowId,
					stages: [{ name: "Automation", type: "sequential", results: [] }],
					totalDuration: Date.now() - startedAt,
				},
			}; // [NRS-810] Return error
		}
	} // [NRS-1102] End of runAutomationWorkflow

	async executeAutomationSteps(actions, stepArray, sessionId, webContentsId, statusDiv) {
		// [NRS-1102] Execute automation steps
		const stageResults = []; // [NRS-810] Array to store each step result
		for (let i = 0; i < actions.length; i += 1) {
			// [NRS-810] Loop through all steps
			const action = actions[i]; // [NRS-810] Current action to execute
			if (statusDiv)
				statusDiv.innerHTML = `<div class="workflow-running">🚀 ${action.type}...</div>`; // [NRS-1301] Update status
			await this.prepareAnalysisContent(action, sessionId); // [NRS-1102] Prepare content if needed
			const result = await this.executeAction(action, stepArray[i], i, sessionId, webContentsId); // [NRS-1102] Execute step
			stageResults.push(result); // [NRS-810] Add result to array
			if (result.status === "failed") break; // [NRS-810] Stop on error
			if (action.type === "navigate") await new Promise((resolve) => setTimeout(resolve, 1200)); // [NRS-810] Wait after navigation
		}
		return stageResults; // [NRS-810] Return all results
	}

	async prepareAnalysisContent(action, sessionId) {
		// [NRS-1102] Prepare DOM content for analysis
		if (!["analyze", "extract"].includes(action.type)) return; // [NRS-810] Skip non-analysis actions
		const activeWebview = document.querySelector("webview.active"); // [NRS-1301] Get webview
		let content = document.documentElement.innerHTML; // [NRS-810] Default content
		if (activeWebview?.executeJavaScript) {
			try {
				content = await activeWebview.executeJavaScript("document.documentElement.outerHTML"); // [NRS-810] Get webview content
			} catch (err) {
				console.warn("Failed to read webview content:", err.message); // [NRS-1001] Log warning
			}
		}
		await globalThis.electronAPI.invoke("automation:update-content", sessionId, content); // [NRS-810] Send to LLM
	}

	async executeAction(action, stepInfo, index, sessionId, webContentsId) {
		// [NRS-1102] Execute single action
		try {
			const response = await globalThis.electronAPI.invoke("automation:execute", sessionId, {
				...action,
				webContentsId,
			}); // [NRS-810] Execute
			if (!response.success) throw new Error(response.error || "Automation step failed"); // [NRS-810] Check success
			return {
				id: `step-${index}`,
				name: action.type,
				description: stepInfo?.description || action.goal || action.type,
				status: "success",
				detail: response.result,
				warning: response.result?.warning,
			}; // [NRS-810] Return success
		} catch (err) {
			return {
				id: `step-${index}`,
				name: action.type,
				description: stepInfo?.description || action.goal || action.type,
				status: "failed",
				error: err.message,
			}; // [NRS-810] Return failure
		}
	}

	updateAutomationStatus(statusDiv, success, stageResults) {
		// [NRS-1102] Update automation UI status
		if (!statusDiv) return; // [NRS-810] Skip if no status div
		if (!success) {
			const failedStep = stageResults.find((r) => r.status === "failed"); // [NRS-810] Find failed step
			statusDiv.innerHTML = `<div class="workflow-error">❌ Automation failed: ${failedStep?.error || "Unknown error"}</div>`; // [NRS-1301] Show error
		} else {
			statusDiv.innerHTML = '<div class="workflow-running">✅ Automation completed</div>'; // [NRS-1301] Show success
		}
	}

	/**
	 * Show agent information modal by index
	 * [NRS-1102][NRS-1301] Displays agent details in alert dialog using array index
	 */
	showAgentInfoByIndex(index) {
		// [NRS-1102] Agent info by index method
		try {
			// [NRS-1102] Use global reference since 'this' might not be bound correctly in onclick context
			const agents = jarvisAgentPanel.agents; // [NRS-1102] Get agents array from global panel
			const agent = agents[index]; // [NRS-1102] Get agent by index

			if (!agent) {
				// [NRS-1102] Verify agent exists
				alert(`Agent not found at index: ${index}`); // [NRS-1301] Show error alert
				return; // [NRS-1102] Exit method
			}

			alert(
				`Agent: ${agent.name}\n\nRole: ${agent.role}\n\nStatus: ${agent.status}\n\nCapabilities:\n${agent.capabilities.join("\n")}`,
			); // [NRS-1301] Show agent info in alert
		} catch (e) {
			alert(`Error in showAgentInfoByIndex: ${e.message}`); // [NRS-1301] Show error alert
		}
	} // [NRS-1102] End of showAgentInfoByIndex method

	/**
	 * Show agent information modal
	 * [NRS-1102][NRS-1301] Displays agent details in custom modal popup
	 */
	showAgentInfo(name, infoJson) {
		// [NRS-1102] Agent info modal method
		const info = JSON.parse(infoJson); // [NRS-1102] Parse JSON info string
		const modal = `  // [NRS-1301] Start modal HTML template
      <div style=" // [NRS-1301]
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; // [NRS-1301]
        background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; // [NRS-1301]
        justify-content: center; z-index: 10000; // [NRS-1301]
      " onclick="this.remove()">  ${"[NRS-1301] Overlay click to close "}
        <div style=" // [NRS-1301]
          background: #2d2d2d; border: 1px solid #444; border-radius: 8px; // [NRS-1301]
          padding: 20px; min-width: 400px; max-width: 600px; // [NRS-1301]
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.9); // [NRS-1301]
          color: #e0e0e0; font-family: 'Segoe UI', sans-serif; // [NRS-1301]
        " onclick="event.stopPropagation()">  ${"[NRS-1301] Modal container, stop click propagation "}
          <h3 style="margin: 0 0 15px 0; color: #fff;">${name}</h3>  ${"[NRS-1301] Agent name heading "}
          <p><strong>Role:</strong> ${info.role}</p>  ${"[NRS-1301] Agent role "}
          <p><strong>Status:</strong> ${info.status}</p>  ${"[NRS-1301] Agent status "}
          <p><strong>Capabilities:</strong></p>  ${"[NRS-1301] Capabilities label "}
          <ul style="margin: 5px 0 15px 20px;">  ${"[NRS-1301] Capabilities list "}
            ${(info.capabilities || []).map((cap) => `<li>${cap}</li>`).join("")}  ${"[NRS-1301] Map capabilities to list items "}
          </ul> // [NRS-1301]
          <button onclick="this.closest('div[onclick]').remove()" style=" // [NRS-1301]
            padding: 8px 16px; background: #007acc; color: #fff; // [NRS-1301]
            border: none; border-radius: 4px; cursor: pointer; // [NRS-1301]
          ">Close</button>  ${"[NRS-1301] Close button "}
        </div> // [NRS-1301]
      </div> // [NRS-1301]
    `; // [NRS-1301] End modal HTML template
		document.body.insertAdjacentHTML("beforeend", modal); // [NRS-1301] Insert modal into page
	} // [NRS-1102] End of showAgentInfo method

	/**
	 * Execute a workflow
	 * [NRS-1002][NRS-810] Routes workflow requests to appropriate handlers (research, extract, automate)
	 */
	async executeWorkflow(type, params) {
		// [NRS-1002] Workflow execution router
		const statusDiv = document.getElementById("agent-workflow-status"); // [NRS-1301] Get status display element
		if (!statusDiv) return; // [NRS-1002] Exit if no status div

		try {
			statusDiv.innerHTML = '<div class="workflow-running">⏳ Running workflow...</div>'; // [NRS-1301] Show running status

			let result; // [NRS-1002] Will hold workflow result
			switch (
				type // [NRS-1002] Route by workflow type
			) {
				case "research":
					console.log("Executing research workflow with params:", params); // [NRS-1001] Log execution
					result = await globalThis.electronAPI.invoke("jarvis:workflow:research", params); // [NRS-810] Call main process
					console.log("Research workflow result:", result); // [NRS-1001] Log result
					break;
				case "extract":
					result = await globalThis.electronAPI.invoke("jarvis:workflow:extract", params.url, {
						// [NRS-810] Call main process
						content: params.selector || "*", // [NRS-810] Pass selector
					});
					break;
				case "automate":
					result = await this.runAutomationWorkflow(params); // [NRS-1002] Execute automation
					break;
			}

			if (result.success) {
				// [NRS-1002] Check workflow success
				this.displayWorkflowResults(result.results); // [NRS-1301] Display results
				this.workflowHistory.push({
					// [NRS-810] Record in history
					type, // [NRS-810] Workflow type
					status: "success", // [NRS-810] Success status
					timestamp: new Date(), // [NRS-810] Timestamp
					results: result.results, // [NRS-810] Store results
				});
			} else {
				const fallback = result.results?.stages?.[0]?.results?.find((r) => r.status === "failed"); // [NRS-810] Find failed step
				const msg = result.error || fallback?.error || "Automation failed"; // [NRS-810] Get error message
				statusDiv.innerHTML = `<div class="workflow-error">❌ Error: ${msg}</div>`; // [NRS-1301] Show error
			}
		} catch (error) {
			const msg = error?.message || error || "Unknown error"; // [NRS-810] Extract error message
			statusDiv.innerHTML = `<div class="workflow-error">❌ ${msg}</div>`; // [NRS-1301] Show error
			console.error("Workflow execution error:", error); // [NRS-1001] Log error
		}
	} // [NRS-1002] End of executeWorkflow method

	/**
	 * Demo workflow: Sort an example array via IPC
	 * [NRS-1001][NRS-810] Demonstrates IPC communication by sorting array with main process
	 */
	async runSortDemo() {
		// [NRS-1001] Sort demo method
		try {
			const input = document.getElementById("sort-input"); // [NRS-1301] Get input element
			let sample = [13, 4, 9, 1, 42, 0]; // [NRS-1001] Default sample array

			const rawInput = input?.value?.trim(); // [NRS-1301] Get user input text
			if (rawInput) {
				// [NRS-1301] Check if input provided
				const parsed = rawInput
					.split(",")
					.map((s) => {
						// [NRS-1001] Parse comma-separated values
						const n = Number.parseFloat(s.trim()); // [NRS-1001] Convert to number
						return Number.isNaN(n) ? null : n; // [NRS-1001] Filter invalid numbers
					})
					.filter((n) => n !== null); // [NRS-1001] Remove nulls

				if (parsed.length > 0) {
					// [NRS-1001] Check parsed numbers exist
					sample = parsed; // [NRS-1001] Use parsed numbers
				}
			}

			this.setWorkflowStatus("sort", "Sorting..."); // [NRS-1301] Show sorting status
			const result = await globalThis.electronAPI.invoke("jarvis:demo:sort", sample); // [NRS-810] Call main process
			if (result.success) {
				// [NRS-810] Check sort success
				const payload = { input: sample, output: result.sorted }; // [NRS-810] Build result payload
				this.setWorkflowStatus("sort", "✓ Sorted!"); // [NRS-1301] Show success
				this.workflowHistory.push({ type: "sort", results: payload }); // [NRS-810] Record in history
				this.showWorkflowResultsModal({ type: "sort", results: payload }); // [NRS-1301] Display results
			} else {
				this.setWorkflowStatus("sort", `Error: ${result.error}`); // [NRS-1301] Show error
			}
		} catch (error) {
			this.setWorkflowStatus("sort", `Failed: ${error.message}`); // [NRS-1301] Show failure
		}
	} // [NRS-1001] End of runSortDemo method

	/**
	 * Set workflow status message
	 * [NRS-1301] Updates status message in UI
	 */
	setWorkflowStatus(_type, message) {
		// [NRS-1301] Status setter method
		const statusDiv = document.getElementById("agent-workflow-status"); // [NRS-1301] Get status element
		if (!statusDiv) return; // [NRS-1301] Exit if no element
		statusDiv.innerHTML = `<div class="workflow-status-message">${message}</div>`; // [NRS-1301] Update message
	} // [NRS-1301] End of setWorkflowStatus method

	/**
	 * Show workflow results in a modal
	 * [NRS-1001][NRS-1301] Displays workflow results in formatted modal dialog
	 */
	showWorkflowResultsModal(workflow) {
		// [NRS-1001] Results modal display method
		// [NRS-1001] Use the detailed formatting
		const results = workflow.results; // [NRS-810] Get results object
		let contentHtml = ""; // [NRS-1301] Initialize content HTML

		// [NRS-1001] Format based on workflow type
		if (workflow.type === "sort") {
			// [NRS-1001] Check if sort workflow
			const input = results.input || []; // [NRS-810] Get input array
			const output = results.output || []; // [NRS-810] Get output array
			contentHtml = `  // [NRS-1301] Start sort workflow results template
        <h3>Sort Results</h3>  ${"[NRS-1301] Results heading "}
        <p style="color: #4ade80;"><strong>✓ Successfully sorted ${input.length} numbers in ascending order</strong></p>  ${"[NRS-1301] Success message "}
        <div style="margin: 20px 0;">  ${"[NRS-1301] Results container "}
          <p><strong>Original:</strong> ${input.join(", ")}</p>  ${"[NRS-810] Show original array "}
          <p><strong>Sorted:</strong> ${output.join(", ")}</p>  ${"[NRS-810] Show sorted array "}
        </div> // [NRS-1301]
        <p style="color: #4ade80; margin-top: 20px;">✓ Workflow completed successfully</p>  ${"[NRS-1301] Completion message "}
      `;
		} else if (workflow.type === "research") {
			// [NRS-1001] Check if research workflow
			contentHtml = `  // [NRS-1301] Start research workflow results template
        <h3>Research Results</h3>  ${"[NRS-1301] Results heading "}
        <p><strong>Topic:</strong> ${results.topic || "Unknown"}</p>  ${"[NRS-810] Show research topic "}
        <p><strong>Summary:</strong> ${results.summary || "No summary available"}</p>  ${"[NRS-810] Show summary "}
        <p><strong>Status:</strong> ${results.status || "Complete"}</p>  ${"[NRS-810] Show status "}
      `;
		} else {
			contentHtml = `  // [NRS-1301] Start generic workflow results template
        <h3>Workflow Results</h3>  ${"[NRS-1301] Results heading "}
        <pre style="background: #1e1e1e; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 12px; color: #d4d4d4;">${JSON.stringify(results, null, 2)}</pre>  ${"[NRS-810] Show raw JSON results "}
      `;
		}

		const modal = document.createElement("div"); // [NRS-1301] Create modal element
		modal.className = "modal"; // [NRS-1301] Set modal class
		modal.style.display = "flex"; // [NRS-1301] Set display flex
		modal.style.position = "fixed"; // [NRS-1301] Set position fixed
		modal.style.top = "0"; // [NRS-1301] Position at top
		modal.style.left = "0"; // [NRS-1301] Position at left
		modal.style.width = "100%"; // [NRS-1301] Full width
		modal.style.height = "100%"; // [NRS-1301] Full height
		modal.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; // [NRS-1301] Semi-transparent backdrop
		modal.style.zIndex = "10000"; // [NRS-1301] High z-index
		modal.style.alignItems = "center"; // [NRS-1301] Center align items
		modal.style.justifyContent = "center"; // [NRS-1301] Center justify content

		modal.innerHTML = `  // [NRS-1301] Render results modal markup
      <div style="background: #2d2d2d; padding: 24px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto; color: #e0e0e0;">  ${"[NRS-1301] Modal container "}
        <h2 style="margin-top: 0; color: #fff;">Workflow Results: ${workflow.type}</h2>  ${"[NRS-1301] Modal title "}
        <div style="color: #e0e0e0;">  ${"[NRS-1301] Content container "}
          ${contentHtml}  ${"[NRS-1301] Insert formatted content "}
        </div> // [NRS-1301]
        <button id="modal-close-btn" style="margin-top: 16px; padding: 8px 16px; background: #5865f2; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>  ${"[NRS-1301] Close button "}
      </div> // [NRS-1301]
    `;

		document.body.appendChild(modal); // [NRS-1301] Add modal to page

		const closeBtn = modal.querySelector("#modal-close-btn"); // [NRS-1301] Get close button
		if (closeBtn) {
			// [NRS-1301] Check button exists
			closeBtn.onclick = () => modal.remove(); // [NRS-1301] Remove on click
		}
		modal.onclick = (e) => {
			// [NRS-1301] Click handler on modal
			if (e.target === modal) modal.remove(); // [NRS-1301] Remove if background clicked
		};
	} // [NRS-1001] End of showWorkflowResultsModal method

	/**
	 * Display workflow results
	 * [NRS-1002][NRS-1301] Shows summary of workflow completion in status area
	 */
	displayWorkflowResults(results) {
		// [NRS-1002] Workflow results display method
		const statusDiv = document.getElementById("agent-workflow-status"); // [NRS-1301] Get status element
		if (!statusDiv) return; // [NRS-1002] Exit if no status div

		const stages = results?.stages || []; // [NRS-810] Get stages array
		const stagesSummary = stages // [NRS-810] Build summary
			.map(
				// [NRS-810] Map stages to HTML
				(stage) => `  // [NRS-810] Build per-stage summary snippet
      <div class="result-stage">  ${"[NRS-1301] Stage container "}
        <strong>${stage.name || "Stage"}</strong> (${stage.type || "unknown"})  ${"[NRS-810] Stage name and type "}
        <div class="stage-results">${stage.results?.length || 0} tasks completed</div>  ${"[NRS-810] Task count "}
      </div> // [NRS-1301]
    `,
			)
			.join(""); // [NRS-810] Join stages

		statusDiv.innerHTML = `  // [NRS-1301] Render workflow summary markup
      <div class="workflow-complete">  ${"[NRS-1301] Complete status container "}
        <div class="result-header">✅ Workflow Complete</div>  ${"[NRS-1301] Success header "}
        <div class="result-duration">${results.totalDuration}ms</div>  ${"[NRS-810] Total duration "}
        ${stagesSummary}  ${"[NRS-810] Insert stages summary "}
        <button class="view-details-btn" onclick="jarvisAgentPanel.showDetailedResults('${results.workflowId}')">  ${"[NRS-1301] Details button "}
          View Details  ${"[NRS-1301] Button text "}
        </button> // [NRS-1301]
      </div> // [NRS-1301]
    `;
	} // [NRS-1002] End of displayWorkflowResults method

	/**
	 * Show detailed results in modal
	 * [NRS-1002][NRS-1301] Retrieves workflow from history and displays in detailed modal
	 */
	showDetailedResults(workflowId) {
		// [NRS-1002] Detailed results modal method
		// [NRS-810] Find workflow by workflowId (could be in different locations depending on workflow type)
		const workflow = this.workflowHistory.find(
			(
				w, // [NRS-810] Search workflow history
			) =>
				w.results?.workflowId === workflowId || // [NRS-810] Check nested workflowId
				w.workflowId === workflowId || // [NRS-810] Check direct workflowId
				`${w.type}-${w.timestamp?.getTime()}` === workflowId, // [NRS-810] Check composite ID
		);

		if (!workflow) {
			// [NRS-810] Check if workflow found
			// [NRS-810] If not found by ID, use the most recent workflow as fallback
			const lastWorkflow = this.workflowHistory.at(-1); // [NRS-810] Get last workflow
			if (lastWorkflow) {
				// [NRS-810] Check if exists
				this.showWorkflowModal(lastWorkflow); // [NRS-1301] Show modal
			}
			return; // [NRS-810] Exit method
		}

		this.showWorkflowModal(workflow); // [NRS-1301] Show workflow modal
	} // [NRS-1002] End of showDetailedResults method

	/**
	 * Show workflow results in a comprehensive modal
	 * [NRS-1001][NRS-1301] Displays detailed workflow results with formatted content
	 */
	showWorkflowModal(workflow) {
		// [NRS-1001] Workflow modal display method
		const results = workflow.results; // [NRS-810] Get results object
		let contentHtml = ""; // [NRS-1301] Initialize content HTML

		// [NRS-1001] Format results based on type
		if (workflow.type === "research") {
			// [NRS-1001] Check if research workflow
			contentHtml = `  // [NRS-1301] Start research results template
        <div class="result-content">  ${""}  ${"// [NRS-1301] Result content container"}
          <h3>🔍 Research Results</h3>  ${"// [NRS-1301] Research header"}
          <p><strong>Topic:</strong> ${results.topic || "Unknown"}</p>  ${"// [NRS-810] Show research topic"}
          <p><strong>Summary:</strong> ${results.summary || "No summary available"}</p>  ${"// [NRS-810] Show summary"}
          <p><strong>Sources Found:</strong> ${results.sources?.length || 0}</p>  ${"// [NRS-810] Show source count"}
          ${(() => {
						// [NRS-1301] IIFE for conditional sources list
						if (!Array.isArray(results.sources)) return ""; // [NRS-810] Check sources is array
						const listItems = results.sources.map((s) => `<li>${s}</li>`).join(""); // [NRS-810] Map sources to list
						return `<ul style="margin-left: 20px;">${listItems}</ul>`; // [NRS-810] Return sources list
					})()} ${"// [NRS-1301]"}
          <p><strong>Status:</strong> ${results.status || "Complete"}</p>  ${"// [NRS-810] Show status"}
          ${results.totalDuration ? `<p><strong>Duration:</strong> ${results.totalDuration}ms</p>` : ""}  ${"// [NRS-810] Show duration if available"}
        </div> ${"// [NRS-1301]"}
      `;
		} else if (workflow.type === "extract") {
			// [NRS-1001] Check if extract workflow
			contentHtml = `  // [NRS-1301] Start extraction results template
        <div class="result-content">  ${"// [NRS-1301] Result content container"}
          <h3>📊 Data Extraction Results</h3>  ${"// [NRS-1301] Extraction header"}
          <p><strong>URL:</strong> ${results.url || "Unknown"}</p>  ${"// [NRS-810] Show extracted URL"}
          <p><strong>Items Extracted:</strong> ${results.itemsExtracted || 0}</p>  ${"// [NRS-810] Show item count"}
          <p><strong>Data Preview:</strong></p>  ${"// [NRS-1301] Preview label"}
          <pre style="background: #1e1e1e; padding: 12px; border-radius: 4px; overflow: auto; max-height: 300px;">${JSON.stringify(results.data?.slice(0, 5), null, 2) || "No data"}</pre>  ${"// [NRS-810] Show data preview"}
          <p><strong>Status:</strong> ${results.status || "Complete"}</p>  ${"// [NRS-810] Show status"}
          ${results.totalDuration ? `<p><strong>Duration:</strong> ${results.totalDuration}ms</p>` : ""}  ${"// [NRS-810] Show duration if available"}
        </div> ${"// [NRS-1301]"}
      `;
		} else if (workflow.type === "automate") {
			// [NRS-1001] Check if automation workflow
			const stage = results.stages?.[0]; // [NRS-810] Get first stage
			const stepList = stage?.results // [NRS-810] Get step list
				? stage.results // [NRS-810] Map step results
						.map((r) => {
							// [NRS-810] Format step
							const errorPart = r.error ? ` (${r.error})` : ""; // [NRS-810] Error info
							return `<li>${r.name || r.description || "Step"} — ${r.status || "done"}${errorPart}</li>`; // [NRS-810] Build step item
						}) // [NRS-810]
						.join("") // [NRS-810] Join steps
				: ""; // [NRS-810] Empty if no results
			const overallStatus = stage?.results?.every((r) => r.status === "success")
				? "Complete"
				: "With issues"; // [NRS-810] Determine overall status
			contentHtml = `  // [NRS-1301] Start automation results template
        <div class="result-content">  ${"// [NRS-1301] Result content container"}
          <h3>🤖 Automation Results</h3>  ${"// [NRS-1301] Automation header"}
          <p><strong>Steps Executed:</strong> ${stage?.results?.length || 0}</p>  ${"// [NRS-810] Show step count"}
          ${
						stepList
							? `
            <p><strong>Execution Details:</strong></p>  ${"// [NRS-1301] Details label"}
            <ul style="margin-left: 20px;">  ${"// [NRS-1301] Steps list"}
              ${stepList}  ${"// [NRS-810] Insert steps"}
            </ul>
          `
							: ""
					}  // [NRS-1301] Optional execution details block
          <p><strong>Total Duration:</strong> ${results.totalDuration || 0}ms</p>  ${"// [NRS-810] Show total duration"}
          <p><strong>Status:</strong> ${overallStatus}</p>  ${"// [NRS-810] Show status"}
        </div> ${"// [NRS-1301]"}
      `;
		} else if (workflow.type === "sort") {
			// [NRS-1001] Check if sort workflow
			const input = results.input || []; // [NRS-810] Get input array
			const output = results.output || []; // [NRS-810] Get output array
			contentHtml = `  // [NRS-1301] Start sort results template
        <div class="result-content">  ${"[NRS-1301] Result content container "}
          <h3>↕️ Sort Results</h3>  ${"[NRS-1301] Sort header "}
          <div style="background: #0a5a2a; padding: 15px; border-radius: 8px; margin: 15px 0;">  ${"[NRS-1301] Success box "}
            <p style="color: #4ade80; margin: 0; font-weight: bold;">✓ Successfully sorted ${input.length} numbers in ascending order</p>  ${"[NRS-810] Success message "}
          </div> // [NRS-1301]
          <div style="margin: 20px 0;">  ${"[NRS-1301] Results container "}
            <p><strong>Original:</strong> <code style="background: #333; padding: 4px; border-radius: 3px;">${input.join(", ")}</code></p>  ${"[NRS-810] Show original "}
            <p><strong>Sorted:</strong> <code style="background: #333; padding: 4px; border-radius: 3px; color: #4ade80;">${output.join(", ")}</code></p>  ${"[NRS-810] Show sorted "}
          </div> // [NRS-1301]
          <p><strong>Algorithm:</strong> Ascending numerical sort</p>  ${"[NRS-1301] Algorithm label "}
        </div> // [NRS-1301]
      `;
		} else {
			// [NRS-1001] For unknown workflow types, try to format nicely
			const hasInputOutput = results.input && results.output; // [NRS-810] Check for input/output
			if (hasInputOutput) {
				// [NRS-810] Check if input/output exists
				contentHtml = `  // [NRS-1301] Start generic success template with input/output
          <div class="result-content">  ${"[NRS-1301] Result content container "}
            <h3>📋 Workflow Results: ${workflow.type}</h3>  ${"[NRS-1301] Results header "}
            <div style="background: #0a5a2a; padding: 15px; border-radius: 8px; margin: 15px 0;">  ${"[NRS-1301] Success box "}
              <p style="color: #4ade80; margin: 0; font-weight: bold;">✓ Workflow completed successfully</p>  ${"[NRS-1301] Success message "}
            </div> // [NRS-1301]
            <div style="margin: 20px 0;">  ${"[NRS-1301] Results container "}
              <p><strong>Input:</strong> <pre style="background: #333; padding: 8px; border-radius: 4px;">${JSON.stringify(results.input, null, 2)}</pre></p>  ${"[NRS-810] Show input "}
              <p><strong>Output:</strong> <pre style="background: #333; padding: 8px; border-radius: 4px; color: #4ade80;">${JSON.stringify(results.output, null, 2)}</pre></p>  ${"[NRS-810] Show output "}
            </div> // [NRS-1301]
          </div> // [NRS-1301]
        `;
			} else {
				contentHtml = `  // [NRS-1301] Start generic success template with raw JSON
          <div class="result-content">  ${"[NRS-1301] Result content container "}
            <h3>📋 Workflow Results: ${workflow.type}</h3>  ${"[NRS-1301] Results header "}
            <div style="background: #0a5a2a; padding: 15px; border-radius: 8px; margin: 15px 0;">  ${"[NRS-1301] Success box "}
              <p style="color: #4ade80; margin: 0; font-weight: bold;">✓ Workflow completed successfully</p>  ${"[NRS-1301] Success message "}
            </div> // [NRS-1301]
            <pre style="background: #1e1e1e; padding: 12px; border-radius: 4px; overflow: auto; max-height: 400px;">${JSON.stringify(results, null, 2)}</pre>  ${"[NRS-810] Show raw JSON "}
          </div> // [NRS-1301]
        `;
			}
		}

		const modal = document.createElement("div"); // [NRS-1301] Create modal element
		modal.className = "modal open"; // [NRS-1301] Set modal class
		modal.style.cssText = `  // [NRS-1301] Set modal CSS
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;  ${"[NRS-1301] Full screen "}
      background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center;  ${"[NRS-1301] Centered backdrop "}
      z-index: 10000; font-family: 'Segoe UI', sans-serif;  ${"[NRS-1301] Z-index and font "}
    `;

		modal.innerHTML = `  // [NRS-1301] Render comprehensive workflow modal markup
      <div style="  ${"[NRS-1301] Modal container "}
        background: #2d2d2d; border: 1px solid #444; border-radius: 12px; padding: 24px;  ${"[NRS-1301] Modal styling "}
        min-width: 500px; max-width: 80vw; max-height: 80vh; overflow-y: auto;  ${"[NRS-1301] Size constraints "}
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9); color: #e0e0e0;  ${"[NRS-1301] Shadow and color "}
      " onclick="event.stopPropagation()">  ${"[NRS-1301] Stop click propagation "}
        <h2 style="margin: 0 0 20px 0; color: #fff; display: flex; align-items: center; gap: 10px;">  ${"[NRS-1301] Title styling "}
          ${(() => {
						// [NRS-1301] Get type emoji
						if (workflow.type === "sort") return "↕️";
						if (workflow.type === "research") return "🔍";
						if (workflow.type === "extract") return "📊";
						if (workflow.type === "automate") return "🤖";
						return "📋";
					})()}  ${"[NRS-1301] Type emoji "}
          ${workflow.type.charAt(0).toUpperCase() + workflow.type.slice(1)} Results  ${"[NRS-1301] Type name "}
        </h2> // [NRS-1301]
        ${contentHtml}  ${"[NRS-1301] Insert formatted content "}
        <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: center;">  ${"[NRS-1301] Footer container "}
          <span style="color: #888; font-size: 12px;">  ${"[NRS-1301] Timestamp label "}
            ${workflow.timestamp ? `Completed: ${workflow.timestamp.toLocaleString()}` : ""}  ${"[NRS-810] Show completion time "}
          </span> // [NRS-1301]
          <button onclick="this.closest('.modal').remove()" style="  ${"[NRS-1301] Close button "}
            padding: 10px 20px; background: #007acc; color: #fff;  ${"[NRS-1301] Button styling "}
            border: none; border-radius: 6px; cursor: pointer; font-size: 14px;  ${"[NRS-1301] Button appearance "}
            transition: background 0.2s;  ${"[NRS-1301] Hover transition "}
          " onmouseover="this.style.background='#005a9e'" onmouseout="this.style.background='#007acc'">  ${"[NRS-1301] Hover effects "}
            Close  ${"[NRS-1301] Button text "}
          </button> // [NRS-1301]
        </div> // [NRS-1301]
      </div> // [NRS-1301]
    `;

		// [NRS-1301] Close modal when clicking outside
		modal.addEventListener("click", (e) => {
			// [NRS-1301] Add click listener
			if (e.target === modal) modal.remove(); // [NRS-1301] Remove if background clicked
		});

		document.body.appendChild(modal); // [NRS-1301] Add modal to page
	} // [NRS-1001] End of showWorkflowModal method

	/**
	 * Update agent status display - only updates status cards, not the whole panel
	 * [NRS-1102][NRS-1301] Queries agent stats and updates status cards in place
	 */
	async updateAgentStatus() {
		// [NRS-1102] Agent status update method
		try {
			const result = await globalThis.electronAPI.invoke("jarvis:agents:stats"); // [NRS-810] Call main process
			if (result.success) {
				// [NRS-810] Check success
				// [NRS-1102] Update agents array with latest status
				this.agents = result.stats.agents; // [NRS-1102] Update agents array

				// [NRS-1102] Only update the agent status container, not the entire panel
				// [NRS-1102] This preserves input fields and their event listeners
				const statusContainer = document.querySelector(".agent-status-container"); // [NRS-1301] Get container element
				if (statusContainer) {
					// [NRS-1301] Check container exists
					statusContainer.innerHTML = this.agents
						.map((agent, idx) => this.renderAgentCard(agent, idx))
						.join(""); // [NRS-1102] Re-render cards
				}
			}
		} catch (error) {
			console.error("Failed to update agent status:", error); // [NRS-1001] Log error
		}
	} // [NRS-1102] End of updateAgentStatus method

	/**
	 * Poll agent status periodically
	 * [NRS-810] Starts interval timer for regular status polling
	 */
	startStatusPolling(interval = 2000) {
		// [NRS-810] Status polling method
		setInterval(() => {
			// [NRS-810] Start interval timer
			this.updateAgentStatus(); // [NRS-1102] Update agent status
		}, interval); // [NRS-810] Polling interval
	} // [NRS-810] End of startStatusPolling method
} // [NRS-1102] End of JarvisAgentPanel class

/**
 * Global function to show agent details from card data attribute
 * [NRS-1301][NRS-1001] Uses a non-blocking overlay instead of alert() to preserve input focus
 */
function _showAgentDetails(cardElement) {
	// [NRS-1301] Agent details global function
	try {
		const agentJson = cardElement.dataset.agent; // [NRS-1102] Get agent JSON from data attribute
		if (!agentJson) {
			// [NRS-1301] Check JSON exists
			console.warn("No agent data found"); // [NRS-1001] Log warning
			return; // [NRS-1301] Exit function
		}

		const agent = JSON.parse(agentJson.replaceAll("&quot;", '"')); // [NRS-1102] Parse and unescape JSON

		// [NRS-1301] Create a non-blocking info overlay
		const overlay = document.createElement("div"); // [NRS-1301] Create overlay element
		overlay.style.cssText = `  // [NRS-1301] Set overlay CSS
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;  ${"[NRS-1301] Full screen "}
      background: rgba(0, 0, 0, 0.5);  ${"[NRS-1301] Semi-transparent backdrop "}
      display: flex; align-items: center; justify-content: center;  ${"[NRS-1301] Center content "}
      z-index: 10000;  ${"[NRS-1301] High z-index "}
    `;

		const dialog = document.createElement("div"); // [NRS-1301] Create dialog element
		dialog.style.cssText = `  // [NRS-1301] Set dialog CSS
      background: #2d2d2d; border: 1px solid #444; border-radius: 8px; padding: 20px;  ${"[NRS-1301] Dialog styling "}
      min-width: 300px; max-width: 400px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.9);  ${"[NRS-1301] Size and shadow "}
      color: #e0e0e0; font-family: 'Segoe UI', sans-serif;  ${"[NRS-1301] Text styling "}
    `;

		dialog.innerHTML = `  // [NRS-1301] Agent details dialog markup
      <h3 style="margin: 0 0 10px 0; color: #fff;">Agent: ${agent.name}</h3>  ${"[NRS-1102] Agent name heading "}
      <p style="margin: 5px 0;"><strong>Role:</strong> ${agent.role}</p>  ${"[NRS-1102] Agent role "}
      <p style="margin: 5px 0;"><strong>Status:</strong> ${agent.status}</p>  ${"[NRS-1102] Agent status "}
      <p style="margin: 5px 0;"><strong>Capabilities:</strong></p>  ${"[NRS-1301] Capabilities label "}
      <ul style="margin: 5px 0; padding-left: 20px;">  ${"[NRS-1102] Capabilities list "}
        ${(agent.capabilities || []).map((c) => `<li>${c}</li>`).join("")}  ${"[NRS-1102] Map capabilities to list items "}
      </ul> // [NRS-1301]
      <button id="agent-details-close" style=" // [NRS-1301]
        margin-top: 15px; padding: 8px 16px; background: #007acc; color: #fff;  ${"[NRS-1301] Button styling "}
        border: none; border-radius: 4px; cursor: pointer; font-size: 13px; width: 100%;  ${"[NRS-1301] Button appearance "}
      ">Close</button>  ${"[NRS-1301] Close button "}
    `;

		overlay.appendChild(dialog); // [NRS-1301] Add dialog to overlay
		document.body.appendChild(overlay); // [NRS-1301] Add overlay to page

		// [NRS-1301] Close on button click or overlay click
		const closeBtn = dialog.querySelector("#agent-details-close"); // [NRS-1301] Get close button
		closeBtn.focus(); // [NRS-1301] Set focus on button

		const cleanup = () => overlay.remove(); // [NRS-1301] Cleanup function

		closeBtn.addEventListener("click", cleanup); // [NRS-1301] Close on button click
		overlay.addEventListener("click", (e) => {
			// [NRS-1301] Close on overlay click
			if (e.target === overlay) cleanup(); // [NRS-1301] Only close if overlay clicked
		});

		// [NRS-1301] Close on Escape key
		const escHandler = (e) => {
			// [NRS-1301] Escape key handler
			if (e.key === "Escape") {
				// [NRS-1301] Check if Escape pressed
				cleanup(); // [NRS-1301] Clean up overlay
				document.removeEventListener("keydown", escHandler); // [NRS-1301] Remove listener
			}
		};
		document.addEventListener("keydown", escHandler); // [NRS-1301] Add listener
	} catch (e) {
		console.error("Error showing agent details:", e.message); // [NRS-1001] Log error
	}
} // [NRS-1301] End of showAgentDetails global function

/**
 * Custom input dialog - replacement for prompt() which doesn't work in Electron
 * [NRS-1301][NRS-810] Creates custom input dialog with Promise-based API
 */
function showInputDialog(title, defaultValue = "") {
	// [NRS-1301] Input dialog global function
	return new Promise((resolve) => {
		// [NRS-1301] Return promise
		const overlay = document.createElement("div"); // [NRS-1301] Create overlay element
		overlay.style.cssText = `  // [NRS-1301] Set overlay CSS
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;  ${"[NRS-1301] Full screen "}
      background: rgba(0, 0, 0, 0.7);  ${"[NRS-1301] Semi-transparent backdrop "}
      display: flex; align-items: center; justify-content: center;  ${"[NRS-1301] Center content "}
      z-index: 10000;  ${"[NRS-1301] High z-index "}
    `;

		const dialog = document.createElement("div"); // [NRS-1301] Create dialog element
		dialog.style.cssText = `  // [NRS-1301] Set dialog CSS
      background: #2d2d2d; border: 1px solid #444; border-radius: 8px; padding: 20px;  ${"[NRS-1301] Dialog styling "}
      min-width: 400px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.9);  ${"[NRS-1301] Width and shadow "}
      color: #e0e0e0; font-family: 'Segoe UI', sans-serif;  ${"[NRS-1301] Text styling "}
    `;

		dialog.innerHTML = `  // [NRS-1301] Input dialog markup
      <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 16px;">${title}</h3>  ${"[NRS-1301] Dialog title "}
      <input type="text" id="dialog-input" value="${defaultValue}" style="  ${"[NRS-1301] Input field "}
        width: 100%; padding: 8px; border: 1px solid #444; background: #1e1e1e;  ${"[NRS-1301] Input styling "}
        color: #e0e0e0; border-radius: 4px; font-family: 'Segoe UI', sans-serif;  ${"[NRS-1301] Input appearance "}
        font-size: 14px; box-sizing: border-box; margin-bottom: 15px;  ${"[NRS-1301] Input spacing "}
      " /> // [NRS-1301]
      <div style="display: flex; gap: 8px; justify-content: flex-end;">  ${"[NRS-1301] Button container "}
        <button id="dialog-cancel" style="  ${"[NRS-1301] Cancel button "}
          padding: 8px 16px; background: #444; color: #e0e0e0;  ${"[NRS-1301] Button styling "}
          border: none; border-radius: 4px; cursor: pointer; font-size: 13px;  ${"[NRS-1301] Button appearance "}
        ">Cancel</button> // [NRS-1301]
        <button id="dialog-ok" style="  ${"[NRS-1301] OK button "}
          padding: 8px 16px; background: #007acc; color: #fff;  ${"[NRS-1301] Button styling "}
          border: none; border-radius: 4px; cursor: pointer; font-size: 13px;  ${"[NRS-1301] Button appearance "}
        ">OK</button> // [NRS-1301]
      </div> // [NRS-1301]
    `;

		overlay.appendChild(dialog); // [NRS-1301] Add dialog to overlay
		document.body.appendChild(overlay); // [NRS-1301] Add overlay to page

		const input = dialog.querySelector("#dialog-input"); // [NRS-1301] Get input element
		const okBtn = dialog.querySelector("#dialog-ok"); // [NRS-1301] Get OK button
		const cancelBtn = dialog.querySelector("#dialog-cancel"); // [NRS-1301] Get cancel button

		input.focus(); // [NRS-1301] Set focus on input
		input.select(); // [NRS-1301] Select default text

		const cleanup = () => overlay.remove(); // [NRS-1301] Cleanup function

		okBtn.addEventListener("click", () => {
			// [NRS-1301] OK button listener
			cleanup(); // [NRS-1301] Remove overlay
			resolve(input.value || null); // [NRS-810] Resolve with input value
		});

		cancelBtn.addEventListener("click", () => {
			// [NRS-1301] Cancel button listener
			cleanup(); // [NRS-1301] Remove overlay
			resolve(null); // [NRS-810] Resolve with null
		});

		input.addEventListener("keypress", (e) => {
			// [NRS-1301] Enter key listener
			if (e.key === "Enter") {
				// [NRS-1301] Check if Enter pressed
				cleanup(); // [NRS-1301] Remove overlay
				resolve(input.value || null); // [NRS-810] Resolve with input value
			}
		});
	});
} // [NRS-1301] End of showInputDialog global function

// [NRS-810] Initialize the agent panel on page load
const jarvisAgentPanel = new JarvisAgentPanel(); // [NRS-1102] Create panel instance

// [NRS-1301] Wait for DOM to be ready
try {
	if (document.readyState === "loading") {
		// [NRS-1301] Check if DOM still loading
		document.addEventListener("DOMContentLoaded", () => {
			// [NRS-1301] Wait for DOM ready
			jarvisAgentPanel.init(); // [NRS-1102] Initialize panel
			jarvisAgentPanel.startStatusPolling(3000); // [NRS-810] Start status polling
		});
	} else {
		jarvisAgentPanel.init(); // [NRS-1102] Initialize panel
		jarvisAgentPanel.startStatusPolling(3000); // [NRS-810] Start status polling
	}
} catch (e) {
	console.error("Failed to initialize Jarvis Agent Panel:", e); // [NRS-1001] Log initialization error
}
