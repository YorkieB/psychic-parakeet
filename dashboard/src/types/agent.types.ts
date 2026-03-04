export interface AgentStatus {
	name: string;
	status: "spawning" | "active" | "idle" | "error" | "respawning" | "killed" | "offline";
	healthScore: number;
	responseTime: number;
	successRate: number;
	errorRate: number;
	memoryUsage: number;
	cpuUsage: number;
	activeRequests: number;
	queuedRequests: number;
	uptime: number;
	lastActivity: string;
	spawnCount: number;
	crashCount: number;
	lastCrash?: string;
	lastRespawn?: string;
	isResponsive: boolean;
	isHealthy: boolean;
}

export interface AgentMetrics {
	status: "active" | "idle" | "busy" | "error" | "offline";
	uptime: number;
	lastActivity: Date;
	responseTime: number;
	successRate: number;
	errorRate: number;
	memoryUsage: number;
	cpuUsage: number;
	activeRequests: number;
	queuedRequests: number;
	spawnCount: number;
	crashCount: number;
	lastCrash?: Date;
	lastRespawn?: Date;
	isResponsive: boolean;
	isHealthy: boolean;
	healthScore: number;
}

export interface AgentState {
	name: string;
	status: "spawning" | "active" | "idle" | "error" | "respawning" | "killed" | "offline";
	pid?: number;
	threadId?: number;
	spawnedAt: Date;
	lastPing: Date;
	metadata: Record<string, any>;
}

export interface SpawnHistory {
	id: number;
	agentName: string;
	spawnCount: number;
	crashCount: number;
	lastSpawn: Date;
	lastCrash?: Date;
	spawnDurationMs?: number;
}

export type AgentGroup = "core" | "specialized" | "creative" | "technical" | "voice";

export interface AgentConfig {
	name: string;
	group: AgentGroup;
	critical: boolean;
	icon?: string;
}
