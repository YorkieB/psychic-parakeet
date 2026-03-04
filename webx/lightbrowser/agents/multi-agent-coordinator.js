/** // [NRS-1002]
 * Multi-Agent Coordinator - Orchestrates complex multi-agent workflows // [NRS-1002]
 * Coordinates agents for tasks like research, data extraction, automation // [NRS-1002]
 */ // [NRS-1002]

const debug = require("debug")("jarvis:coordinator"); // [NRS-1002] Debug logging for coordinator
const AgentOrchestrator = require("./agent-orchestrator"); // [NRS-1002] Agent orchestrator class
const BrowserUseAgent = require("./browser-use-agent"); // [NRS-1101] Browser automation agent

class MultiAgentCoordinator {
	// [NRS-1002]
	constructor(options = {}) {
		// [NRS-1002]
		this.orchestrator = new AgentOrchestrator(options); // [NRS-1002] Create orchestrator instance
		this.browserAgent = new BrowserUseAgent(options); // [NRS-1101] Create browser agent instance
		this.workflows = new Map(); // [NRS-1002] Workflow registry
		this.executionHistory = []; // [NRS-1002] Execution history log
		debug("MultiAgentCoordinator initialized"); // [NRS-1002] Log initialization
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Initialize predefined agents for common tasks // [NRS-1002]
	 */ // [NRS-1002]
	async initializeDefaultAgents() {
		// [NRS-1002]
		// Research agent // [NRS-1002]
		this.orchestrator.registerAgent("researcher", {
			// [NRS-1002]
			name: "Research Agent", // [NRS-1002]
			role: "research", // [NRS-1002]
			capabilities: ["web-search", "information-gathering", "analysis"], // [NRS-1002]
			systemPrompt: `You are a research agent specializing in finding and analyzing information. 
Your role is to:
- Search for relevant information
- Synthesize multiple sources
- Identify key insights
- Provide well-sourced answers`, // [NRS-1002]
		}); // [NRS-1002] Register research agent

		// Data extraction agent // [NRS-1002]
		this.orchestrator.registerAgent("extractor", {
			// [NRS-1002]
			name: "Data Extraction Agent", // [NRS-1002]
			role: "extraction", // [NRS-1002]
			capabilities: ["data-extraction", "parsing", "formatting"], // [NRS-1002]
			systemPrompt: `You are a data extraction specialist. Your role is to:
- Extract structured data from unstructured content
- Parse and validate information
- Format data according to specifications
- Handle edge cases and malformed data`, // [NRS-1002]
		}); // [NRS-1002] Register extraction agent

		// Automation agent // [NRS-1002]
		this.orchestrator.registerAgent("automator", {
			// [NRS-1002]
			name: "Automation Agent", // [NRS-1002]
			role: "automation", // [NRS-1002]
			capabilities: ["browser-control", "task-automation", "workflow-execution"], // [NRS-1002]
			systemPrompt: `You are an automation specialist. Your role is to:
- Execute browser automation tasks
- Coordinate multi-step workflows
- Handle errors gracefully
- Report progress and results`, // [NRS-1002]
		}); // [NRS-1002] Register automation agent

		// Analysis agent // [NRS-1002]
		this.orchestrator.registerAgent("analyst", {
			// [NRS-1002]
			name: "Analysis Agent", // [NRS-1002]
			role: "analysis", // [NRS-1002]
			capabilities: ["data-analysis", "insights", "recommendations"], // [NRS-1002]
			systemPrompt: `You are a data analyst. Your role is to:
- Analyze collected data
- Generate insights
- Provide recommendations
- Create summaries and reports`, // [NRS-1002]
		}); // [NRS-1002] Register analysis agent

		debug("Default agents initialized"); // [NRS-1002] Log agent setup complete
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Execute a research workflow // [NRS-1002]
	 * Researchers gather info, analyzer synthesizes findings // [NRS-1002]
	 */ // [NRS-1002]
	async executeResearchWorkflow(topic, options = {}) {
		// [NRS-1002]
		const workflowId = `research-${Date.now()}`; // [NRS-1002] Generate workflow ID
		console.log(`[Research] Starting research workflow: ${workflowId} for topic: "${topic}"`); // [NRS-1002]
		debug(`Starting research workflow: ${workflowId} for topic: "${topic}"`); // [NRS-1002]

		if (!topic || topic.trim() === "") {
			// [NRS-1002]
			console.log("[Research] No topic provided, returning error"); // [NRS-1002]
			return {
				// [NRS-1002]
				workflowId, // [NRS-1002]
				topic: "No topic provided", // [NRS-1002]
				summary: "Please provide a research topic", // [NRS-1002]
				sources: [], // [NRS-1002]
				status: "error", // [NRS-1002]
				totalDuration: 0, // [NRS-1002]
			}; // [NRS-1002]
		} // [NRS-1002]

		// Initialize agents if not already done // [NRS-1002]
		await this.initializeDefaultAgents(); // [NRS-1002]
		console.log("[Research] Agents initialized"); // [NRS-1002]

		const workflow = {
			// [NRS-1002]
			id: workflowId, // [NRS-1002]
			type: "research", // [NRS-1002]
			stages: [
				// [NRS-1002]
				{
					// [NRS-1002]
					name: "Research", // [NRS-1002]
					type: "parallel", // [NRS-1002]
					tasks: [
						// [NRS-1002]
						{
							// [NRS-1002]
							id: "research-task-1", // [NRS-1002]
							agentId: "researcher", // [NRS-1002]
							description: `Research the following topic comprehensively: "${topic}". Focus on recent developments, key facts, and authoritative sources. Provide specific examples and findings.`, // [NRS-1002]
						}, // [NRS-1002]
						{
							// [NRS-1002]
							id: "research-task-2", // [NRS-1002]
							agentId: "researcher", // [NRS-1002]
							description: `Find practical applications and use cases for: "${topic}". Identify real-world examples, benefits, and limitations.`, // [NRS-1002]
						}, // [NRS-1002]
					], // [NRS-1002]
				}, // [NRS-1002]
				{
					// [NRS-1002]
					name: "Analysis", // [NRS-1002]
					type: "sequential", // [NRS-1002]
					tasks: [
						// [NRS-1002]
						{
							// [NRS-1002]
							id: "analysis-task-1", // [NRS-1002]
							agentId: "analyst", // [NRS-1002]
							description: `Analyze all the research findings about "${topic}" and synthesize them into key insights. Provide a comprehensive summary and identify the most important sources.`, // [NRS-1002]
						}, // [NRS-1002]
					], // [NRS-1002]
				}, // [NRS-1002]
			], // [NRS-1002]
		}; // [NRS-1002]

		console.log("[Research] Workflow config created:", JSON.stringify(workflow, null, 2)); // [NRS-1002]
		const startTime = Date.now(); // [NRS-1002]

		try {
			// [NRS-1002]
			const results = await this.orchestrator.executeWorkflow(workflow); // [NRS-1002]
			console.log("[Research] Raw workflow results:", JSON.stringify(results, null, 2)); // [NRS-1002]

			// Transform the workflow results into research format // [NRS-1002]
			const researchResults = this.formatResearchResults(topic, results); // [NRS-1002]
			researchResults.totalDuration = Date.now() - startTime; // [NRS-1002]

			console.log(
				"[Research] Formatted research results:",
				JSON.stringify(researchResults, null, 2),
			); // [NRS-1002]
			this.executionHistory.push({
				workflowId,
				type: "research",
				results: researchResults,
			}); // [NRS-1002]
			return researchResults; // [NRS-1002]
		} catch (error) {
			// [NRS-1002]
			console.error("[Research] Workflow execution error:", error); // [NRS-1002]
			return {
				// [NRS-1002]
				workflowId, // [NRS-1002]
				topic: topic, // [NRS-1002]
				summary: `Research failed: ${error.message}`, // [NRS-1002]
				sources: [], // [NRS-1002]
				status: "error", // [NRS-1002]
				totalDuration: Date.now() - startTime, // [NRS-1002]
				error: error.message, // [NRS-1002]
			}; // [NRS-1002]
		} // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Transform workflow results into research-specific format // [NRS-1002]
	 */ // [NRS-1002]
	formatResearchResults(topic, workflowResults) {
		// [NRS-1002]
		const researchStage = workflowResults.stages.find((s) => s.name === "Research"); // [NRS-1002]
		const analysisStage = workflowResults.stages.find((s) => s.name === "Analysis"); // [NRS-1002]

		// Extract findings from research tasks // [NRS-1002]
		const researchFindings = []; // [NRS-1002]
		const sources = []; // [NRS-1002]

		if (researchStage?.results) {
			// [NRS-1002]
			for (const task of researchStage.results) {
				// [NRS-1002]
				if (task.success && task.response) {
					// [NRS-1002]
					researchFindings.push(task.response); // [NRS-1002]
					// Extract potential sources from the response // [NRS-1002]
					const urlRegex = /https?:\/\/[^\s]+/g; // [NRS-1002]
					const foundUrls = task.response.match(urlRegex) || []; // [NRS-1002]
					sources.push(...foundUrls); // [NRS-1002]
				} // [NRS-1002]
			} // [NRS-1002]
		} // [NRS-1002]

		// Get analysis summary // [NRS-1002]
		let summary = "No analysis available"; // [NRS-1002]
		if (analysisStage?.results?.[0]) {
			// [NRS-1002]
			const analysisResult = analysisStage.results[0]; // [NRS-1002]
			if (analysisResult.success && analysisResult.response) {
				// [NRS-1002]
				summary = analysisResult.response; // [NRS-1002]
			} // [NRS-1002]
		} // [NRS-1002]

		// If no proper analysis, create summary from research findings // [NRS-1002]
		if (summary === "No analysis available" && researchFindings.length > 0) {
			// [NRS-1002]
			summary = `Based on research findings: ${researchFindings.join(". ").substring(0, 300)}...`; // [NRS-1002]
		} // [NRS-1002]

		return {
			// [NRS-1002]
			workflowId: workflowResults.workflowId, // [NRS-1002]
			topic: topic || "Unknown", // [NRS-1002]
			summary: summary || "No summary available", // [NRS-1002]
			sources: [...new Set(sources)], // Remove duplicates // [NRS-1002]
			status: "Complete", // [NRS-1002]
			rawFindings: researchFindings, // [NRS-1002]
			stages: workflowResults.stages, // [NRS-1002]
		}; // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Execute a data extraction workflow // [NRS-1002]
	 * Navigate, extract, parse, and format data // [NRS-1002]
	 */ // [NRS-1002]
	async executeDataExtractionWorkflow(url, selectors, options = {}) {
		// [NRS-1002]
		const workflowId = `extraction-${Date.now()}`; // [NRS-1002] Unique extraction workflow identifier
		debug(`Starting data extraction workflow: ${workflowId}`); // [NRS-1002]

		const tasks = [
			// [NRS-1002]
			{
				// [NRS-1002]
				id: "navigate", // [NRS-1002]
				agentId: "automator", // [NRS-1002]
				description: `Navigate to ${url} and take a screenshot of the page.`, // [NRS-1002]
			}, // [NRS-1002]
			{
				// [NRS-1002]
				id: "extract-data", // [NRS-1002]
				agentId: "extractor", // [NRS-1002]
				description: `Extract data from selectors: ${JSON.stringify(selectors)}. Parse and structure the data.`, // [NRS-1002]
			}, // [NRS-1002]
			{
				// [NRS-1002]
				id: "format", // [NRS-1002]
				agentId: "analyst", // [NRS-1002]
				description: `Format and validate the extracted data. Provide a summary of findings.`, // [NRS-1002]
			}, // [NRS-1002]
		]; // [NRS-1002]

		const results = await this.orchestrator.executeSequential(tasks); // [NRS-1002]
		this.executionHistory.push({ workflowId, type: "extraction", results }); // [NRS-1002]
		return results; // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Execute an automation workflow // [NRS-1002]
	 * Multiple agents coordinate to complete complex task // [NRS-1002]
	 */ // [NRS-1002]
	async executeAutomationWorkflow(steps, options = {}) {
		// [NRS-1002]
		const workflowId = `automation-${Date.now()}`; // [NRS-1002] Unique automation workflow identifier
		debug(`Starting automation workflow: ${workflowId}`); // [NRS-1002]

		// Break down workflow into stages // [NRS-1002]
		const stages = []; // [NRS-1002]
		let stage = {
			// [NRS-1002]
			name: "Execution", // [NRS-1002]
			type: "sequential", // [NRS-1002]
			tasks: steps.map((step, index) => ({
				// [NRS-1002]
				id: `step-${index}`, // [NRS-1002]
				agentId: step.agentId || "automator", // [NRS-1002]
				description: step.description, // [NRS-1002]
			})), // [NRS-1002]
		}; // [NRS-1002]
		stages.push(stage); // [NRS-1002]

		const workflow = {
			// [NRS-1002]
			id: workflowId, // [NRS-1002]
			type: "automation", // [NRS-1002]
			stages, // [NRS-1002]
		}; // [NRS-1002]

		const results = await this.orchestrator.executeWorkflow(workflow); // [NRS-1002]
		this.executionHistory.push({ workflowId, type: "automation", results }); // [NRS-1002]
		return results; // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Execute a custom workflow with full control // [NRS-1002]
	 */ // [NRS-1002]
	async executeCustomWorkflow(workflowConfig) {
		// [NRS-1002]
		const results = await this.orchestrator.executeWorkflow(workflowConfig); // [NRS-1002]
		this.executionHistory.push({
			// [NRS-1002]
			workflowId: workflowConfig.id, // [NRS-1002]
			type: "custom", // [NRS-1002]
			results, // [NRS-1002]
		}); // [NRS-1002]
		return results; // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Monitor browser agent // [NRS-1002]
	 */ // [NRS-1002]
	async startBrowserSession(config = {}) {
		// [NRS-1002]
		return this.browserAgent.startSession(config); // [NRS-1002]
	} // [NRS-1002]

	async closeBrowserSession() {
		// [NRS-1002]
		return this.browserAgent.closeSession(); // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Get coordinator stats // [NRS-1002]
	 */ // [NRS-1002]
	getStats() {
		// [NRS-1002]
		return {
			// [NRS-1002]
			orchestrator: this.orchestrator.getStats(), // [NRS-1002]
			totalExecutions: this.executionHistory.length, // [NRS-1002]
			workflows: Array.from(this.workflows.values()).map((w) => ({
				// [NRS-1002]
				id: w.id, // [NRS-1002]
				type: w.type, // [NRS-1002]
				executedAt: w.executedAt, // [NRS-1002]
			})), // [NRS-1002]
		}; // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Get execution history // [NRS-1002]
	 */ // [NRS-1002]
	getExecutionHistory(limit = 10) {
		// [NRS-1002]
		return this.executionHistory.slice(-limit); // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Register custom workflow // [NRS-1002]
	 */ // [NRS-1002]
	registerWorkflow(workflowConfig) {
		// [NRS-1002]
		this.workflows.set(workflowConfig.id, {
			// [NRS-1002]
			...workflowConfig, // [NRS-1002]
			registeredAt: new Date(), // [NRS-1002]
		}); // [NRS-1002]
		debug(`Workflow registered: ${workflowConfig.id}`); // [NRS-1002]
	} // [NRS-1002]
} // [NRS-1002]

module.exports = MultiAgentCoordinator; // [NRS-1002]
