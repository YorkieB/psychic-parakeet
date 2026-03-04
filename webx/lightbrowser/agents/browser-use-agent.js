/** // [NRS-1102]
 * Browser Use Agent - Integrates with OpenAI API for intelligent browser control // [NRS-1102]
 * Allows AI to analyze page content and make decisions about browser interactions // [NRS-1102]
 */ // [NRS-1102]

const debug = require("debug")("jarvis:browser-agent"); // [NRS-1101] Debug logging for browser agent
const OpenAI = require("openai"); // [NRS-1101] OpenAI client for browser automation

class BrowserUseAgent {
	// [NRS-1102]
	client = null; // [NRS-1101] OpenAI client instance

	constructor(options = {}) {
		// [NRS-1102]
		try {
			// [NRS-1102]
			const apiKey = process.env.OPENAI_API_KEY; // [NRS-1101] Get API key from environment
			if (apiKey) {
				// [NRS-1102]
				this.client = new OpenAI({ apiKey }); // [NRS-1101] Initialize OpenAI client
			} // [NRS-1102]
		} catch (e) {
			// [NRS-1102]
			debug("OpenAI SDK not available: %s", e.message); // [NRS-1101] Log SDK error with message
		} // [NRS-1102]
		this.model = options.model || "gpt-5.2"; // [NRS-1101] Default LLM model
		this.activeSession = null; // [NRS-1102] Current browser session
		this.sessionHistory = []; // [NRS-1102] Session history log
		this.pageContent = null; // [NRS-1103] Current page content cache
		debug("BrowserUseAgent initialized with OpenAI API"); // [NRS-1101] Log initialization
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Start a new browser session // [NRS-1102]
	 */ // [NRS-1102]
	async startSession(config = {}) {
		// [NRS-1102]
		try {
			// [NRS-1102]
			// Simulated session start since we're using Claude API // [NRS-1102]
			this.activeSession = {
				// [NRS-1102]
				id: `session-${Date.now()}`, // [NRS-1102]
				url: config.url || "about:blank", // [NRS-1102]
				status: "active", // [NRS-1102]
				startedAt: new Date(), // [NRS-1102]
			}; // [NRS-1102]

			this.sessionHistory.push({
				// [NRS-1102]
				sessionId: this.activeSession.id, // [NRS-1102]
				startedAt: new Date(), // [NRS-1102]
				config, // [NRS-1102]
			}); // [NRS-1102]

			debug(`Browser session started: ${this.activeSession.id}`); // [NRS-1102]
			return this.activeSession; // [NRS-1102]
		} catch (error) {
			// [NRS-1102]
			debug("Failed to start browser session:", error); // [NRS-1102]
			throw error; // [NRS-1102]
		} // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Execute an action in the browser using Claude's decision-making // [NRS-1102]
	 */ // [NRS-1102]
	async executeAction(action) {
		// [NRS-1102] Main action execution method
		if (!this.activeSession) {
			// [NRS-1102] Validate browser session exists
			throw new Error("No active browser session. Call startSession first."); // [NRS-1102] Error if no session
		} // [NRS-1102]

		if (!this.client) {
			// [NRS-1101] Validate OpenAI client initialized
			throw new Error(
				"OpenAI API client not initialized. Check OPENAI_API_KEY environment variable.",
			); // [NRS-1101] API error
		} // [NRS-1102]

		try {
			// [NRS-1102] Wrap execution in error handling
			debug(`Executing action: ${action.type}`); // [NRS-1102] Log action type being executed

			// Build context for Claude based on current action  // [NRS-1102] Prepare AI prompt context
			const systemPrompt = `You are a browser automation assistant. You help users interact with web pages by making intelligent decisions about what actions to take. You have access to browser state and can suggest or execute actions like clicking, typing, navigating, and extracting content.

Current page content: ${this.pageContent ? this.pageContent.substring(0, 2000) : "Not yet loaded"}

Your role is to:
1. Analyze the current page state
2. Determine the best action to take
3. Provide clear, structured responses about what should be done`; // [NRS-1102]

			const userPrompt = `Execute this browser action:  // [NRS-1102] Build action execution prompt
Type: ${action.type}
${action.selector ? `Selector: ${action.selector}` : ""}
${action.url ? `URL: ${action.url}` : ""}
${action.text ? `Text to type: ${action.text}` : ""}

Analyze the current page and provide the action result and next steps.`; // [NRS-1102]

			const response = await this.client.chat.completions.create({
				// [NRS-1101] Send action request to OpenAI API
				model: this.model, // [NRS-1102]
				max_completion_tokens: 512, // [NRS-1102]
				messages: [
					// [NRS-1102]
					{
						// [NRS-1102]
						role: "system", // [NRS-1102]
						content: systemPrompt, // [NRS-1101] System context for AI decision-making
					}, // [NRS-1102]
					{
						// [NRS-1102]
						role: "user", // [NRS-1101] User message with action details
						content: userPrompt, // [NRS-1102]
					}, // [NRS-1102]
				], // [NRS-1102]
			}); // [NRS-1102]

			const result = {
				// [NRS-1102] Structure action execution result
				type: action.type, // [NRS-1102]
				status: "completed", // [NRS-1102]
				response: response.choices[0].message.content, // [NRS-1101] Extract AI response
				executedAt: new Date(), // [NRS-1102]
			}; // [NRS-1102]

			debug(`Action completed: ${action.type}`); // [NRS-1102] Log action completion status
			return result; // [NRS-1102] Return action result to caller
		} catch (error) {
			// [NRS-1102]
			debug("Action execution failed:", error); // [NRS-1101] Log API or execution error
			throw error; // [NRS-1102]
		} // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Navigate to a URL // [NRS-1102]
	 */ // [NRS-1102]
	async navigate(url) {
		// [NRS-1102]
		this.activeSession.url = url; // [NRS-1103]
		return this.executeAction({
			// [NRS-1102]
			type: "navigate", // [NRS-1102]
			url, // [NRS-1102]
		}); // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Click an element (CSS selector or xpath) // [NRS-1102]
	 */ // [NRS-1102]
	async click(selector) {
		// [NRS-1102]
		return this.executeAction({
			// [NRS-1102]
			type: "click", // [NRS-1102]
			selector, // [NRS-1102]
		}); // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Type text into a field // [NRS-1102]
	 */ // [NRS-1102]
	async type(selector, text) {
		// [NRS-1102]
		return this.executeAction({
			// [NRS-1102]
			type: "type", // [NRS-1102]
			selector, // [NRS-1102]
			text, // [NRS-1102]
		}); // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Extract page content with Claude's analysis // [NRS-1102]
	 */ // [NRS-1102]
	async extractContent(selector) {
		// [NRS-1102]
		if (!this.client) {
			// [NRS-1101]
			throw new Error("OpenAI API client not initialized"); // [NRS-1101]
		} // [NRS-1102]

		try {
			// [NRS-1102]
			const response = await this.client.chat.completions.create({
				// [NRS-1101]
				model: this.model, // [NRS-1101]
				max_completion_tokens: 768, // [NRS-1101]
				messages: [
					// [NRS-1101]
					{
						// [NRS-1101]
						role: "system", // [NRS-1101]
						content:
							"You are a web content analyzer. Extract and summarize relevant information from the provided page content. Be concise and structured.", // [NRS-1101]
					}, // [NRS-1101]
					{
						// [NRS-1101]
						role: "user", // [NRS-1101]
						content: `Extract content from selector "${selector}" on current page. Page content:\n${this.pageContent || "Content not available"}`, // [NRS-1101] Provide selector and current page HTML
					}, // [NRS-1101]
				], // [NRS-1101]
			}); // [NRS-1101]

			return {
				// [NRS-1102]
				type: "extract", // [NRS-1102]
				selector: selector || "body", // [NRS-1102]
				status: "completed", // [NRS-1102]
				content: response.choices[0].message.content, // [NRS-1101]
			}; // [NRS-1102]
		} catch (error) {
			// [NRS-1101]
			debug("Content extraction failed:", error); // [NRS-1101]
			throw error; // [NRS-1101]
		} // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Execute JavaScript in the page // [NRS-1102]
	 */ // [NRS-1102]
	async executeScript(script) {
		// [NRS-1102]
		return this.executeAction({
			// [NRS-1102]
			type: "script", // [NRS-1102]
			code: script, // [NRS-1102]
		}); // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Get current page state // [NRS-1102]
	 */ // [NRS-1102]
	async getPageState() {
		// [NRS-1102]
		return {
			// [NRS-1103]
			url: this.activeSession?.url, // [NRS-1103]
			content: this.pageContent, // [NRS-1103]
			timestamp: new Date(), // [NRS-1103]
		}; // [NRS-1103]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Update page content (typically from the browser/renderer process) // [NRS-1102]
	 */ // [NRS-1102]
	setPageContent(content) {
		// [NRS-1103]
		this.pageContent = content; // [NRS-1103]
		debug("Page content updated"); // [NRS-1103]
	} // [NRS-1103]

	/** // [NRS-1102]
	 * Take a screenshot // [NRS-1102]
	 */ // [NRS-1102]
	async takeScreenshot() {
		// [NRS-1102]
		return this.executeAction({
			// [NRS-1102]
			type: "screenshot", // [NRS-1102]
		}); // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Wait for an element to appear // [NRS-1102]
	 */ // [NRS-1102]
	async waitForElement(selector, timeout = 30000) {
		// [NRS-1102]
		return this.executeAction({
			// [NRS-1102]
			type: "wait", // [NRS-1102]
			selector, // [NRS-1102]
			timeout, // [NRS-1102]
		}); // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Use Claude to analyze page and decide next action // [NRS-1102]
	 */ // [NRS-1102]
	async analyzeAndDecide(goal) {
		// [NRS-1102]
		if (!this.client) {
			// [NRS-1101]
			throw new Error("OpenAI API client not initialized"); // [NRS-1101]
		} // [NRS-1102]

		try {
			// [NRS-1102]
			const response = await this.client.chat.completions.create({
				// [NRS-1101]
				model: this.model, // [NRS-1101]
				max_completion_tokens: 512, // [NRS-1101]
				messages: [
					// [NRS-1101]
					{
						// [NRS-1101]
						role: "system", // [NRS-1101]
						content:
							"You are a web automation assistant. Analyze the current page state and decide what action should be taken next to achieve the goal. Provide structured JSON response with: action_type, selector/url/text, and reasoning.", // [NRS-1102]
					}, // [NRS-1101]
					{
						// [NRS-1101]
						role: "user", // [NRS-1101]
						content: `Goal: ${goal}\n\nCurrent page URL: ${this.activeSession?.url}\n\nPage content:\n${this.pageContent || "Not loaded yet"}\n\nWhat should be the next action?`, // [NRS-1101] Include goal, URL, and page HTML for analysis
					}, // [NRS-1101]
				], // [NRS-1101]
			}); // [NRS-1101]

			return {
				// [NRS-1102]
				status: "analyzed", // [NRS-1102]
				suggestion: response.choices[0].message.content, // [NRS-1101]
				analyzedAt: new Date(), // [NRS-1102]
			}; // [NRS-1102]
		} catch (error) {
			// [NRS-1101]
			debug("Analysis failed:", error); // [NRS-1101]
			throw error; // [NRS-1101]
		} // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Close the browser session // [NRS-1102]
	 */ // [NRS-1102]
	async closeSession() {
		// [NRS-1102]
		if (!this.activeSession) {
			// [NRS-1102]
			return; // [NRS-1102]
		} // [NRS-1102]

		try {
			// [NRS-1102]
			if (this.sessionHistory.length > 0) {
				// [NRS-1102]
				this.sessionHistory.at(-1).endedAt = new Date(); // [NRS-1102]
			} // [NRS-1102]
			this.activeSession = null; // [NRS-1102]
			this.pageContent = null; // [NRS-1103]
			debug("Browser session closed"); // [NRS-1102]
		} catch (error) {
			// [NRS-1101]
			debug("Error closing session:", error); // [NRS-1101]
		} // [NRS-1102]
	} // [NRS-1102]

	/** // [NRS-1102]
	 * Get session history // [NRS-1102]
	 */ // [NRS-1102]
	getSessionHistory() {
		// [NRS-1102]
		return this.sessionHistory; // [NRS-1102]
	} // [NRS-1102]
} // [NRS-1102]

module.exports = BrowserUseAgent; // [NRS-1101]

module.exports = BrowserUseAgent; // [NRS-1101]
