/** // [NRS-1002]
 * Agent Orchestrator - Manages multi-agent Browser Use workflows // [NRS-1002]
 * Coordinates multiple agents working in parallel or sequentially // [NRS-1002]
 */ // [NRS-1002]

const debug = require("debug")("jarvis:orchestrator"); // [NRS-1001] Debug logging for orchestrator
const OpenAI = require("openai"); // [NRS-1001] OpenAI client for agents

class AgentOrchestrator {
	// [NRS-1002]
	client = null; // [NRS-1001] OpenAI client instance

	constructor(options = {}) {
		// [NRS-1002]
		// Initialize OpenAI client // [NRS-1002]
		try {
			// [NRS-1002]
			const apiKey = process.env.OPENAI_API_KEY; // [NRS-1001] Get API key from environment
			if (apiKey) {
				// [NRS-1002]
				this.client = new OpenAI({ apiKey }); // [NRS-1001] Create OpenAI client
				debug("OpenAI client initialized successfully"); // [NRS-1001] Log success
			} else {
				// [NRS-1002]
				debug("No OPENAI_API_KEY found - agent features will be limited"); // [NRS-1001] Log warning
			} // [NRS-1002]
		} catch (error) {
			// [NRS-1002]
			debug("Failed to initialize OpenAI client:", error.message); // [NRS-1001] Log initialization error
		} // [NRS-1002]

		this.agents = new Map(); // [NRS-1002] Agent registry
		this.taskQueue = []; // [NRS-1002] Pending task queue
		this.executingTasks = new Set(); // [NRS-1002] Currently executing tasks
		this.maxConcurrentTasks = options.maxConcurrentTasks || 3; // [NRS-1002] Concurrency limit
		this.defaultModel = options.model || "gpt-5.2"; // [NRS-1001] Default LLM model
		debug("Orchestrator initialized with max concurrent tasks:", this.maxConcurrentTasks); // [NRS-1002] Log config
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Register an agent with the orchestrator // [NRS-1002]
	 * @param {string} agentId - Unique identifier for the agent // [NRS-1002]
	 * @param {object} config - Agent configuration // [NRS-1002]
	 */ // [NRS-1002]
	registerAgent(agentId, config) {
		// [NRS-1002]
		this.agents.set(agentId, {
			// [NRS-1002]
			id: agentId, // [NRS-1002]
			name: config.name || agentId, // [NRS-1002]
			role: config.role || "generic", // [NRS-1002]
			capabilities: config.capabilities || [], // [NRS-1002]
			model: config.model || this.defaultModel, // [NRS-1002]
			systemPrompt: config.systemPrompt || "", // [NRS-1002]
			status: "idle", // [NRS-1002]
			createdAt: new Date(), // [NRS-1002]
		}); // [NRS-1002] Store agent configuration
		debug(`Agent registered: ${agentId} (role: ${config.role})`); // [NRS-1002] Log registration
		return this.agents.get(agentId); // [NRS-1002] Return agent config
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Get agent configuration // [NRS-1002]
	 */ // [NRS-1002]
	getAgent(agentId) {
		// [NRS-1002]
		return this.agents.get(agentId); // [NRS-1002] Retrieve agent config
	} // [NRS-1002]

	/** // [NRS-1002]
	 * List all registered agents // [NRS-1002]
	 */ // [NRS-1002]
	listAgents() {
		// [NRS-1002]
		return Array.from(this.agents.values()); // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Execute a single agent task // [NRS-1002]
	 */ // [NRS-1002]
	async executeAgentTask(agentId, task) {
		// [NRS-1002]
		console.log(`[AgentOrchestrator] Executing task for agent: ${agentId}`, task); // [NRS-1002]
		const agent = this.getAgent(agentId); // [NRS-1002]
		if (!agent) {
			// [NRS-1002]
			console.error(`[AgentOrchestrator] Agent not found: ${agentId}`); // [NRS-1002]
			throw new Error(`Agent not found: ${agentId}`); // [NRS-1002]
		} // [NRS-1002]

		if (!this.client) {
			// [NRS-1002]
			console.error(`[AgentOrchestrator] No OpenAI client available for agent: ${agentId}`); // [NRS-1002]
			debug(`[${agentId}] No OpenAI client available; skipping execution`); // [NRS-1002]
			throw new Error("OpenAI client unavailable"); // [NRS-1002]
		} // [NRS-1002]

		console.log(`[AgentOrchestrator] Agent ${agentId} found, executing task:`, task.description); // [NRS-1002]
		debug(`[${agentId}] Executing task:`, task.description); // [NRS-1002]
		agent.status = "executing"; // [NRS-1002]
		this.executingTasks.add(agentId); // [NRS-1002]

		try {
			// [NRS-1002]
			const response = await this.client.chat.completions.create({
				// [NRS-1002]
				model: agent.model, // [NRS-1002]
				max_completion_tokens: 512, // [NRS-1002]
				messages: [
					// [NRS-1002]
					{
						// [NRS-1002]
						role: "system", // [NRS-1002]
						content:
							agent.systemPrompt ||
							`You are ${agent.name}, a ${agent.role} agent. Your capabilities: ${agent.capabilities.join(", ")}`, // [NRS-1002]
					}, // [NRS-1002]
					{
						// [NRS-1002]
						role: "user", // [NRS-1002]
						content: task.prompt || task.description, // [NRS-1002]
					}, // [NRS-1002]
				], // [NRS-1002]
			}); // [NRS-1002]

			agent.status = "idle"; // [NRS-1002]
			this.executingTasks.delete(agentId); // [NRS-1002]

			const result = {
				// [NRS-1002]
				agentId, // [NRS-1002]
				taskId: task.id, // [NRS-1002]
				status: "completed", // [NRS-1002]
				response: response.choices[0].message.content, // [NRS-1002]
				success: true, // [NRS-1002]
				output: response.choices[0].message.content, // [NRS-1002]
				executedAt: new Date(), // [NRS-1002]
				usage: response.usage, // [NRS-1002]
			}; // [NRS-1002]

			console.log(
				`[AgentOrchestrator] Task completed successfully for ${agentId}:`,
				result.response,
			); // [NRS-1002]
			debug(`[${agentId}] Task completed successfully`); // [NRS-1002]
			return result; // [NRS-1002]
		} catch (error) {
			// [NRS-1002]
			agent.status = "error"; // [NRS-1002]
			this.executingTasks.delete(agentId); // [NRS-1002]
			console.error(`[AgentOrchestrator] Task failed for ${agentId}:`, error.message); // [NRS-1002]
			debug(`[${agentId}] Task failed:`, error.message); // [NRS-1002]

			return {
				// [NRS-1002]
				agentId, // [NRS-1002]
				taskId: task.id, // [NRS-1002]
				status: "failed", // [NRS-1002]
				success: false, // [NRS-1002]
				error: error.message, // [NRS-1002]
				executedAt: new Date(), // [NRS-1002]
			}; // [NRS-1002]
		} // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Execute multiple agent tasks in parallel // [NRS-1002]
	 */ // [NRS-1002]
	async executeParallel(tasks) {
		// [NRS-1002]
		debug(`Executing ${tasks.length} tasks in parallel`); // [NRS-1002]
		const results = await Promise.allSettled(
			// [NRS-1002]
			tasks.map((task) => this.executeAgentTask(task.agentId, task)), // [NRS-1002]
		); // [NRS-1002]

		return results.map((result, index) => ({
			// [NRS-1002]
			...result, // [NRS-1002]
			taskIndex: index, // [NRS-1002]
			success: result.status === "fulfilled", // [NRS-1002]
			result: result.status === "fulfilled" ? result.value : result.reason, // [NRS-1002]
		})); // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Execute tasks sequentially with context passing // [NRS-1002]
	 */ // [NRS-1002]
	async executeSequential(tasks, contextKey = "previousOutput") {
		// [NRS-1002]
		debug(`Executing ${tasks.length} tasks sequentially`); // [NRS-1002]
		const results = []; // [NRS-1002]
		let context = {}; // [NRS-1002]

		for (const task of tasks) {
			// [NRS-1002]
			const enrichedTask = {
				// [NRS-1002]
				...task, // [NRS-1002]
				prompt:
					task.prompt || `${task.description}\n\nPrevious context: ${JSON.stringify(context)}`, // [NRS-1002]
			}; // [NRS-1002]

			try {
				// [NRS-1002]
				const result = await this.executeAgentTask(task.agentId, enrichedTask); // [NRS-1002]
				results.push(result); // [NRS-1002]
				context[contextKey] = result.output; // [NRS-1002]
			} catch (error) {
				// [NRS-1002]
				debug(`Sequential execution stopped at task: ${task.id}`, error.message); // [NRS-1002]
				results.push({
					// [NRS-1002]
					agentId: task.agentId, // [NRS-1002]
					taskId: task.id, // [NRS-1002]
					status: "failed", // [NRS-1002]
					error: error.message, // [NRS-1002]
				}); // [NRS-1002]
				break; // [NRS-1002]
			} // [NRS-1002]
		} // [NRS-1002]

		return results; // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Complex workflow: coordinate agents with conditional branching // [NRS-1002]
	 */ // [NRS-1002]
	async executeWorkflow(workflowConfig) {
		// [NRS-1002]
		const { stages } = workflowConfig; // [NRS-1002]
		const results = {
			// [NRS-1002]
			workflowId: workflowConfig.id, // [NRS-1002]
			stages: [], // [NRS-1002]
			startedAt: new Date(), // [NRS-1002]
		}; // [NRS-1002]

		for (const stage of stages) {
			// [NRS-1002]
			debug(`\n--- Stage: ${stage.name} ---`); // [NRS-1002]

			let stageResults; // [NRS-1002]
			if (stage.type === "parallel") {
				// [NRS-1002]
				stageResults = await this.executeParallel(stage.tasks); // [NRS-1002]
			} else if (stage.type === "sequential") {
				// [NRS-1002]
				stageResults = await this.executeSequential(stage.tasks); // [NRS-1002]
			} // [NRS-1002]

			results.stages.push({
				// [NRS-1002]
				name: stage.name, // [NRS-1002]
				type: stage.type, // [NRS-1002]
				results: stageResults, // [NRS-1002]
				completedAt: new Date(), // [NRS-1002]
			}); // [NRS-1002]

			// Check for early exit conditions // [NRS-1002]
			if (stage.exitOnFailure && stageResults.some((r) => !r.success)) {
				// [NRS-1002]
				debug("Stage failed with exitOnFailure enabled, stopping workflow"); // [NRS-1002]
				break; // [NRS-1002]
			} // [NRS-1002]
		} // [NRS-1002]

		results.completedAt = new Date(); // [NRS-1002]
		results.totalDuration = results.completedAt - results.startedAt; // [NRS-1002]
		debug(`\nWorkflow completed in ${results.totalDuration}ms`); // [NRS-1002]

		return results; // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Route a task to the most appropriate agent // [NRS-1002]
	 */ // [NRS-1002]
	async routeTask(taskDescription, requiredCapability) {
		// [NRS-1002]
		const candidates = Array.from(this.agents.values()).filter((agent) => {
			// [NRS-1002]
			if (requiredCapability) {
				// [NRS-1002]
				return agent.capabilities.includes(requiredCapability); // [NRS-1002]
			} // [NRS-1002]
			return true; // [NRS-1002]
		}); // [NRS-1002]

		if (candidates.length === 0) {
			// [NRS-1002]
			throw new Error(`No agents available for capability: ${requiredCapability}`); // [NRS-1002]
		} // [NRS-1002]

		// Route to least busy agent // [NRS-1002]
		const agent = candidates.reduce((least, current) => {
			// [NRS-1002]
			const leastBusy = least.status === "idle" && current.status !== "idle"; // [NRS-1002]
			return leastBusy ? least : current; // [NRS-1002]
		}, candidates[0]); // [NRS-1002]

		debug(`Routing task to agent: ${agent.id}`); // [NRS-1002]
		return this.executeAgentTask(agent.id, {
			// [NRS-1002]
			description: taskDescription, // [NRS-1002]
		}); // [NRS-1002]
	} // [NRS-1002]

	/** // [NRS-1002]
	 * Get orchestrator stats // [NRS-1002]
	 */ // [NRS-1002]
	getStats() {
		// [NRS-1002]
		return {
			// [NRS-1002]
			totalAgents: this.agents.size, // [NRS-1002]
			executingTasks: this.executingTasks.size, // [NRS-1002]
			maxConcurrentTasks: this.maxConcurrentTasks, // [NRS-1002]
			agents: Array.from(this.agents.values()).map((a) => ({
				// [NRS-1002]
				id: a.id, // [NRS-1002]
				name: a.name, // [NRS-1002]
				role: a.role, // [NRS-1002]
				status: a.status, // [NRS-1002]
			})), // [NRS-1002]
		}; // [NRS-1002]
	} // [NRS-1002]
} // [NRS-1002]

module.exports = AgentOrchestrator; // [NRS-1002]
