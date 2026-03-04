import type {
	AgentMetrics,
	AgentStatus,
	SensorHealthReport,
	SensorStatus,
	SpawnHistory,
} from "../types";

const API_URL = (import.meta.env?.VITE_API_URL as string) || "http://localhost:3000";

// Retry configuration for stability
const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
};

export class HealthAPI {
	private baseUrl = `${API_URL}/health`;
	private isBackendAvailable = true;
	private lastConnectionAttempt = 0;
	private connectionCheckInterval = 5000; // 5 seconds

	// Retry with exponential backoff
	private async fetchWithRetry(
		url: string,
		options?: RequestInit,
		retries = RETRY_CONFIG.maxRetries,
	): Promise<Response> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

				const response = await fetch(url, {
					...options,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);
				this.isBackendAvailable = true;
				return response;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Don't retry on abort
				if (lastError.name === "AbortError") {
					throw new Error("Request timeout - backend may be unresponsive");
				}

				// Mark backend as unavailable on connection errors
				if (lastError.message.includes("fetch") || lastError.message.includes("network")) {
					this.isBackendAvailable = false;
				}

				if (attempt < retries) {
					// Exponential backoff with jitter
					const delay = Math.min(
						RETRY_CONFIG.baseDelay * 2 ** attempt + Math.random() * 1000,
						RETRY_CONFIG.maxDelay,
					);
					console.log(`[HealthAPI] Retry ${attempt + 1}/${retries} after ${Math.round(delay)}ms`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError || new Error("Failed after retries");
	}

	// Check if backend is available
	async checkConnection(): Promise<boolean> {
		const now = Date.now();
		if (now - this.lastConnectionAttempt < this.connectionCheckInterval) {
			return this.isBackendAvailable;
		}

		this.lastConnectionAttempt = now;

		try {
			const response = await fetch(`${API_URL}/health`, {
				method: "GET",
				signal: AbortSignal.timeout(5000),
			});
			this.isBackendAvailable = response.ok;
			return this.isBackendAvailable;
		} catch {
			this.isBackendAvailable = false;
			return false;
		}
	}

	get isConnected(): boolean {
		return this.isBackendAvailable;
	}

	async getAllAgents(): Promise<AgentStatus[]> {
		const response = await this.fetchWithRetry(`${this.baseUrl}/agents`);
		if (!response.ok) {
			throw new Error(`Failed to fetch agents: ${response.statusText}`);
		}
		const data = await response.json();
		// API returns { success, data: { agents: [...] }, timestamp } - extract agents array
		// Handle both nested (data.data.agents) and flat (data.agents) formats
		const agents = data.data?.agents || data.agents || data;
		return Array.isArray(agents)
			? agents.map((agent: any) => ({
					name: agent.name,
					status: this.mapStatus(agent.status, agent.isHealthy),
					healthScore: agent.isHealthy ? 95 : 30, // Approximate health score from boolean
					responseTime: 0,
					successRate: agent.isHealthy ? 100 : 0,
					errorRate: agent.isHealthy ? 0 : 100,
					memoryUsage: 0,
					cpuUsage: 0,
					activeRequests: 0,
					queuedRequests: 0,
					uptime: agent.spawnedAt
						? Math.floor((Date.now() - new Date(agent.spawnedAt).getTime()) / 1000)
						: 0,
					lastActivity: agent.lastPing || new Date().toISOString(),
					spawnCount: 1,
					crashCount: 0,
					isResponsive: agent.isHealthy,
					isHealthy: agent.isHealthy,
				}))
			: [];
	}

	private mapStatus(status: string, isHealthy: boolean): AgentStatus["status"] {
		if (status === "running" && isHealthy) return "active";
		if (status === "running" && !isHealthy) return "error";
		if (status === "unhealthy") return "error";
		if (status === "killed") return "killed";
		if (status === "offline") return "offline";
		if (status === "spawning") return "spawning";
		if (status === "respawning") return "respawning";
		return "idle";
	}

	private mapSensorStatus(status: string): SensorStatus {
		const normalized = status.toLowerCase();
		if (normalized === "healthy" || normalized === "ok" || normalized === "success") {
			return "healthy";
		}
		if (normalized === "degraded" || normalized === "warning") {
			return "degraded";
		}
		if (normalized === "error" || normalized === "failed" || normalized === "critical") {
			return "error";
		}
		return "unavailable";
	}

	async getSensorReports(): Promise<SensorHealthReport[]> {
		const response = await this.fetchWithRetry(`${this.baseUrl}/sensors`);
		if (!response.ok) {
			throw new Error(`Failed to fetch sensor reports: ${response.statusText}`);
		}

		const json = await response.json();
		const rawReports = json?.data?.sensors ?? json?.sensors ?? [];

		if (!Array.isArray(rawReports)) {
			return [];
		}

		return rawReports.map((report: any) => ({
			sensorName: String(report?.sensorName ?? "unknown"),
			status: this.mapSensorStatus(String(report?.status ?? "unavailable")),
			message: String(report?.message ?? ""),
			details:
				typeof report?.details === "object" && report.details !== null ? report.details : undefined,
			timestamp:
				typeof report?.timestamp === "number"
					? report.timestamp
					: Date.parse(String(report?.timestamp ?? "")) || Date.now(),
			receivedAt: typeof report?.receivedAt === "string" ? report.receivedAt : undefined,
		}));
	}

	async getSensorHistory(limit = 100, sensorName?: string): Promise<SensorHealthReport[]> {
		const params = new URLSearchParams();
		params.set("limit", String(limit));
		if (sensorName) {
			params.set("sensorName", sensorName);
		}

		const response = await this.fetchWithRetry(
			`${this.baseUrl}/sensors/history?${params.toString()}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch sensor history: ${response.statusText}`);
		}

		const json = await response.json();
		const rawHistory = json?.data?.history ?? json?.history ?? [];

		if (!Array.isArray(rawHistory)) {
			return [];
		}

		return rawHistory.map((report: any) => ({
			sensorName: String(report?.sensorName ?? "unknown"),
			status: this.mapSensorStatus(String(report?.status ?? "unavailable")),
			message: String(report?.message ?? ""),
			details:
				typeof report?.details === "object" && report.details !== null ? report.details : undefined,
			timestamp:
				typeof report?.timestamp === "number"
					? report.timestamp
					: Date.parse(String(report?.timestamp ?? "")) || Date.now(),
			receivedAt: typeof report?.receivedAt === "string" ? report.receivedAt : undefined,
		}));
	}

	async getAgent(name: string): Promise<AgentStatus> {
		const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(name)}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch agent ${name}: ${response.statusText}`);
		}
		return response.json();
	}

	async respawnAgent(name: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(name)}/respawn`, {
			method: "POST",
		});
		if (!response.ok) {
			throw new Error(`Failed to respawn agent ${name}: ${response.statusText}`);
		}
	}

	async killAgent(name: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(name)}/kill`, {
			method: "POST",
		});
		if (!response.ok) {
			throw new Error(`Failed to kill agent ${name}: ${response.statusText}`);
		}
	}

	/**
	 * Restore an agent's source code from Git and restart the backend
	 * This will:
	 * 1. Restore the agent's source file from the last Git commit
	 * 2. Rebuild the TypeScript project
	 * 3. Restart the backend via PM2
	 */
	async restoreAgent(name: string): Promise<{
		success: boolean;
		message: string;
		sourceFile?: string;
		commitHash?: string;
		wasModified: boolean;
		buildSuccess?: boolean;
		restartTriggered: boolean;
	}> {
		const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(name)}/restore`, {
			method: "POST",
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || `Failed to restore agent ${name}: ${response.statusText}`);
		}

		return {
			success: data.success,
			message: data.message,
			sourceFile: data.data?.sourceFile,
			commitHash: data.data?.commitHash,
			wasModified: data.data?.wasModified || false,
			buildSuccess: data.data?.buildSuccess,
			restartTriggered: data.data?.restartTriggered || false,
		};
	}

	async getAgentMetrics(name: string): Promise<AgentMetrics> {
		const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(name)}/metrics`);
		if (!response.ok) {
			throw new Error(`Failed to fetch metrics for ${name}: ${response.statusText}`);
		}
		const data = await response.json();
		// Convert date strings to Date objects
		if (data.lastActivity) data.lastActivity = new Date(data.lastActivity);
		if (data.lastCrash) data.lastCrash = new Date(data.lastCrash);
		if (data.lastRespawn) data.lastRespawn = new Date(data.lastRespawn);
		return data;
	}

	async getAgentHistory(name: string): Promise<SpawnHistory[]> {
		const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(name)}/history`);
		if (!response.ok) {
			throw new Error(`Failed to fetch history for ${name}: ${response.statusText}`);
		}
		const data = await response.json();
		// Convert date strings to Date objects
		return data.map((item: any) => ({
			...item,
			lastSpawn: new Date(item.lastSpawn),
			lastCrash: item.lastCrash ? new Date(item.lastCrash) : undefined,
		}));
	}

	/** Primary LLM config (Vertex AI when configured, else Claude) for dashboard */
	async getPrimaryAIProvider(): Promise<{
		primary: string;
		providerLabel: string;
		model: string;
		linked: boolean;
		endpointRegion?: string;
	}> {
		const base = this.baseUrl.replace(/\/health\/?$/, "");
		const response = await fetch(`${base}/api/health/ai-provider`, {
			signal: AbortSignal.timeout(8000),
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch AI provider: ${response.statusText}`);
		}
		const json = await response.json();
		const data = json.data ?? json;
		return {
			primary: data.primary ?? "claude-sonnet",
			providerLabel: data.providerLabel ?? "Claude",
			model: data.model ?? "",
			linked: data.linked ?? false,
			endpointRegion: data.endpointRegion,
		};
	}
}

export const healthApi = new HealthAPI();
