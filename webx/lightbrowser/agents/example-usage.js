/** // [NRS-1001]
 * Example: Using Multi-Agent Browser Use with Jarvis // [NRS-1001]
 * This demonstrates how to use the multi-agent coordinator // [NRS-1001]
 */ // [NRS-1001]

// [NRS-1002] In your renderer.js or Jarvis module:

async function exampleResearchWorkflow() {
	// [NRS-1002] Research workflow example
	// [NRS-1002] Research a topic using multiple agents
	const result = await globalThis.electronAPI.invoke(
		"jarvis:workflow:research", // [NRS-1002] Invoke research workflow
		"The latest developments in AI safety", // [NRS-1002] Research topic
		{ timeout: 60000 }, // [NRS-1002] Workflow timeout
	); // [NRS-1001]

	if (result.success) {
		// [NRS-1002] Check workflow success
		console.log("Research completed:", result.results); // [NRS-1002] Log results
		// Use the results... // [NRS-1001]
	} // [NRS-1001]
} // [NRS-1001]

async function exampleDataExtractionWorkflow() {
	// [NRS-1102] Data extraction example
	// [NRS-1102] Extract data from a webpage
	const result = await globalThis.electronAPI.invoke(
		"jarvis:workflow:extract", // [NRS-1102] Invoke extraction
		"https://example.com", // [NRS-905] Target URL
		{
			// [NRS-1102] CSS selectors for extraction
			title: ".page-title", // [NRS-1102] Title selector
			content: ".main-content", // [NRS-1102] Content selector
			links: "a[href]", // [NRS-1102] Links selector
		}, // [NRS-1001]
	); // [NRS-1001]

	if (result.success) {
		// [NRS-1102] Check extraction success
		console.log("Data extracted:", result.results); // [NRS-1102] Log extracted data
	} // [NRS-1001]
} // [NRS-1001]

async function exampleAutomationWorkflow() {
	// [NRS-1102] Automation example
	// [NRS-1102] Automate multi-step browser tasks
	const result = await globalThis.electronAPI.invoke(
		"jarvis:workflow:automate", // [NRS-1102] Invoke automation
		[
			// [NRS-1102] Task sequence
			{
				// [NRS-1102] Navigation task
				description: 'Navigate to example.com and search for "JavaScript"', // [NRS-905] Navigation action
				agentId: "automator", // [NRS-1102] Agent assignment
			}, // [NRS-1001]
			{
				// [NRS-1102] Extraction task
				description: "Extract search results with titles and links", // [NRS-1102] Extraction action
				agentId: "extractor", // [NRS-1102] Agent assignment
			}, // [NRS-1001]
			{
				// [NRS-1102] Analysis task
				description: "Analyze results and provide summary of top findings", // [NRS-1102] Analysis action
				agentId: "analyst", // [NRS-1102] Agent assignment
			}, // [NRS-1001]
		], // [NRS-1001]
	); // [NRS-1001]

	if (result.success) {
		// [NRS-1102] Check automation success
		console.log("Automation completed:", result.results); // [NRS-1102] Log automation results
	} // [NRS-1001]
} // [NRS-1001]

async function exampleCustomWorkflow() {
	// [NRS-1002] Custom workflow example
	// [NRS-1002] Custom multi-stage workflow with parallel and sequential execution
	const workflowConfig = {
		// [NRS-1002] Workflow configuration
		id: "custom-research-workflow", // [NRS-1002] Workflow identifier
		type: "custom", // [NRS-1002] Custom workflow type
		stages: [
			// [NRS-1002] Workflow stages
			{
				// [NRS-1002] Parallel stage
				name: "Parallel Research", // [NRS-1002] Stage name
				type: "parallel", // [NRS-1002] Parallel execution
				tasks: [
					// [NRS-1002] Task list
					{
						// [NRS-1002] Research task 1
						id: "research-1", // [NRS-1002] Task identifier
						agentId: "researcher", // [NRS-1002] Agent assignment
						description: "Research topic A", // [NRS-1002] Task description
					}, // [NRS-1001]
					{
						// [NRS-1002] Research task 2
						id: "research-2", // [NRS-1002] Task identifier
						agentId: "researcher", // [NRS-1002] Agent assignment
						description: "Research topic B", // [NRS-1002] Task description
					}, // [NRS-1001]
				], // [NRS-1001]
			}, // [NRS-1001]
			{
				// [NRS-1002] Sequential analysis stage
				name: "Sequential Analysis", // [NRS-1002] Stage name for sequential execution
				type: "sequential", // [NRS-1002] Sequential execution type
				tasks: [
					// [NRS-1002] Sequential task list
					{
						// [NRS-1002] Analysis task
						id: "analysis-1", // [NRS-1002] Task identifier
						agentId: "analyst", // [NRS-1002] Agent assignment
						description: "Analyze all research findings", // [NRS-1002] Task description
					}, // [NRS-1001]
				], // [NRS-1001]
			}, // [NRS-1001]
		], // [NRS-1001]
	}; // [NRS-1001]

	const result = await globalThis.electronAPI.invoke("jarvis:workflow:custom", workflowConfig); // [NRS-1002] Invoke custom workflow
	if (result.success) {
		// [NRS-1002] Check workflow success
		console.log("Custom workflow completed:", result.results); // [NRS-1002] Log results
	} // [NRS-1001]
} // [NRS-1001]

async function getAgentStats() {
	// [NRS-1001] Get agent statistics
	const result = await globalThis.electronAPI.invoke("jarvis:agents:stats"); // [NRS-1001] Request stats
	if (result.success) {
		// [NRS-1001] Check stats success
		console.log("Agent Statistics:", result.stats); // [NRS-1001] Log statistics
	} // [NRS-1001]
} // [NRS-1001]

async function initializeAgents() {
	// [NRS-1001] Initialize all agents
	const result = await globalThis.electronAPI.invoke("jarvis:agents:init"); // [NRS-1001] Request initialization
	if (result.success) {
		// [NRS-1001] Check init success
		console.log("Agents initialized:", result.agents); // [NRS-1001] Log agent list
	} // [NRS-1001]
} // [NRS-1001]

// [NRS-1001] Jarvis command handler dispatcher
async function handleJarvisCommand(command, params) {
	// [NRS-1001] Command routing
	switch (
		command // [NRS-1001] Command switch
	) {
		case "research": // [NRS-1002] Research command
			return exampleResearchWorkflow(); // [NRS-1002] Invoke research

		case "extract": // [NRS-1102] Extract command
			return exampleDataExtractionWorkflow(); // [NRS-1102] Invoke extraction

		case "automate": // [NRS-1102] Automate command
			return exampleAutomationWorkflow(); // [NRS-1102] Invoke automation

		case "stats": // [NRS-1001] Stats command
			return getAgentStats(); // [NRS-1001] Get statistics

		default: // [NRS-1001] Unknown command
			return null; // [NRS-1001] Return null
	} // [NRS-1001]
} // [NRS-1001]

module.exports = {
	// [NRS-1001] Module exports
	exampleResearchWorkflow, // [NRS-1002] Export research workflow
	exampleDataExtractionWorkflow, // [NRS-1102] Export extraction workflow
	exampleAutomationWorkflow, // [NRS-1102] Export automation workflow
	exampleCustomWorkflow, // [NRS-1002] Export custom workflow
	getAgentStats, // [NRS-1001] Export stats getter
	initializeAgents, // [NRS-1001] Export agent initializer
	handleJarvisCommand, // [NRS-1001] Export command handler
}; // [NRS-1001]
