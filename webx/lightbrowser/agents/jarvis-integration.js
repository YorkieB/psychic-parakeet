/** // [NRS-1001]
 * Jarvis Multi-Agent Integration // [NRS-1001]
 * IPC handlers for Jarvis to control multi-agent workflows // [NRS-1001]
 *  // [NRS-1001]
 * Note: Full agent functionality requires Anthropic API key configured in .env // [NRS-1001]
 */ // [NRS-1001]

const { ipcMain } = require("electron"); // [NRS-1501] Electron IPC for agent communication
const debug = require("debug")("jarvis:integration"); // [NRS-1001] Debug logging for Jarvis integration

let coordinator = null; // [NRS-1002] Global coordinator instance

/** // [NRS-1001]
 * Initialize the multi-agent coordinator // [NRS-1001]
 */ // [NRS-1001]
async function initializeCoordinator() {
	// [NRS-1001]
	if (!coordinator) {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const MultiAgentCoordinator = require("./multi-agent-coordinator"); // [NRS-1002] Load coordinator class
			coordinator = new MultiAgentCoordinator({
				// [NRS-1001]
				maxConcurrentTasks: 4, // [NRS-1001]
			}); // [NRS-1002] Create coordinator with concurrency limit
			await coordinator.initializeDefaultAgents(); // [NRS-1002] Initialize default agent pool
			debug("Multi-agent coordinator initialized"); // [NRS-1001] Log success
		} catch (error) {
			// [NRS-1001]
			debug("Multi-agent coordinator failed to initialize:", error.message); // [NRS-1001] Log initialization error
			// Surface error so IPC handlers can return failure instead of mock data // [NRS-1001]
			throw error; // [NRS-1001] Propagate error
		} // [NRS-1001]
	} // [NRS-1001]
	return coordinator; // [NRS-1002] Return coordinator instance
} // [NRS-1001]

/** // [NRS-1001]
 * Setup IPC handlers for Jarvis // [NRS-1001]
 */ // [NRS-1001]
function setupJarvisAgentHandlers() {
	// [NRS-1001]
	// Initialize coordinator on demand // [NRS-1001]
	ipcMain.handle("jarvis:agents:init", async () => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1002] Get coordinator instance
			return { success: true, agents: coord.orchestrator.listAgents() }; // [NRS-1002] Return agent list
		} catch (error) {
			// [NRS-1001]
			debug("Initialization error:", error); // [NRS-1001] Log initialization error
			return { success: false, error: error.message }; // [NRS-1001] Return error response
		} // [NRS-1001]
	}); // [NRS-1001]

	// Execute research workflow // [NRS-1001]
	ipcMain.handle("jarvis:workflow:research", async (event, topic, options = {}) => {
		// [NRS-1001]
		console.log("[Research] IPC Handler called with:", { topic, options }); // [NRS-1001] Log research request
		console.log("[Research] Topic type:", typeof topic, "Value:", topic); // [NRS-1001] Log topic details

		try {
			// [NRS-1001]
			// ALWAYS return mock data for now to test the flow // [NRS-1001]
			console.log("[Research] Returning mock data for testing"); // [NRS-1001] Log mock mode
			const mockResult = {
				// [NRS-1001]
				success: true, // [NRS-1001]
				results: {
					// [NRS-1001]
					workflowId: `research-${Date.now()}`, // [NRS-1001]
					topic: topic || "No Topic Provided", // [NRS-1001]
					summary: `Mock research summary for: ${topic}. This includes detailed findings about the topic, key insights, and important considerations. The research covers multiple aspects and provides comprehensive analysis.`, // [NRS-1001]
					sources: [
						// [NRS-1001]
						"https://example.com/source1", // [NRS-1001]
						"https://example.com/source2", // [NRS-1001]
						"https://example.com/source3", // [NRS-1001]
					], // [NRS-1001]
					status: "Complete", // [NRS-1001]
					rawFindings: [
						// [NRS-1001]
						`Mock finding 1 about ${topic}`, // [NRS-1001] Mock result line 1
						`Mock finding 2 with more details`, // [NRS-1001] Mock result line 2
					], // [NRS-1001]
					totalDuration: Math.floor(Math.random() * 5000) + 1000, // [NRS-1001]
				}, // [NRS-1001]
			}; // [NRS-1001] Build mock research result
			console.log("[Research] Mock result:", mockResult); // [NRS-1001] Log mock result
			return mockResult; // [NRS-1001] Return mock data
		} catch (error) {
			// [NRS-1001]
			console.error("[Research] Error:", error); // [NRS-1001] Log research error
			return {
				// [NRS-1001]
				success: false, // [NRS-1001]
				error: error.message, // [NRS-1001]
				results: {
					// [NRS-1001]
					topic: topic || "Error", // [NRS-1001]
					summary: `Error occurred: ${error.message}`, // [NRS-1001]
					sources: [], // [NRS-1001]
					status: "Error", // [NRS-1001]
				}, // [NRS-1001]
			}; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Execute data extraction workflow // [NRS-1001]
	ipcMain.handle("jarvis:workflow:extract", async (event, url, selectors, options = {}) => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			const results = await coord.executeDataExtractionWorkflow(url, selectors, options); // [NRS-1001]
			return { success: true, results }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			debug("Extraction workflow error:", error); // [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Execute automation workflow // [NRS-1001]
	ipcMain.handle("jarvis:workflow:automate", async (event, steps, options = {}) => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			const results = await coord.executeAutomationWorkflow(steps, options); // [NRS-1001]
			return { success: true, results }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			debug("Automation workflow error:", error); // [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Execute custom workflow // [NRS-1001]
	ipcMain.handle("jarvis:workflow:custom", async (event, workflowConfig) => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			const results = await coord.executeCustomWorkflow(workflowConfig); // [NRS-1001]
			return { success: true, results }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			debug("Custom workflow error:", error); // [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Get coordinator stats // [NRS-1001]
	ipcMain.handle("jarvis:agents:stats", async () => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			return { success: true, stats: coord.getStats() }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Get execution history // [NRS-1001]
	ipcMain.handle("jarvis:agents:history", async (event, limit = 10) => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			const history = coord.getExecutionHistory(limit); // [NRS-1001]
			return { success: true, history }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Register custom workflow // [NRS-1001]
	ipcMain.handle("jarvis:workflow:register", async (event, workflowConfig) => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			coord.registerWorkflow(workflowConfig); // [NRS-1001]
			return { success: true, message: "Workflow registered" }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Browser session management // [NRS-1001]
	ipcMain.handle("jarvis:browser:start", async (event, config = {}) => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			const session = await coord.startBrowserSession(config); // [NRS-1001]
			return { success: true, sessionId: session?.id }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			debug("Browser start error:", error); // [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	ipcMain.handle("jarvis:browser:close", async () => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const coord = await initializeCoordinator(); // [NRS-1001]
			await coord.closeBrowserSession(); // [NRS-1001]
			return { success: true }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	// Demo: simple sort via IPC to prove panel wiring // [NRS-1001]
	ipcMain.handle("jarvis:demo:sort", async (event, numbers = []) => {
		// [NRS-1001]
		try {
			// [NRS-1001]
			const arr = Array.isArray(numbers) ? numbers.slice() : []; // [NRS-1001]
			arr.sort((a, b) => (a ?? 0) - (b ?? 0)); // [NRS-1001]
			return { success: true, sorted: arr }; // [NRS-1001]
		} catch (error) {
			// [NRS-1001]
			return { success: false, error: error.message }; // [NRS-1001]
		} // [NRS-1001]
	}); // [NRS-1001]

	debug("Jarvis agent IPC handlers registered"); // [NRS-1001]
} // [NRS-1001]

module.exports = {
	// [NRS-1001]
	setupJarvisAgentHandlers, // [NRS-1001]
	initializeCoordinator, // [NRS-1001]
}; // [NRS-1001]
