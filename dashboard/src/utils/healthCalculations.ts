import type { AgentStatus, HealthMetrics } from "../types";

export function calculateSystemHealth(agents: AgentStatus[]): HealthMetrics {
	if (agents.length === 0) {
		return {
			systemHealth: 0,
			healthyCount: 0,
			degradedCount: 0,
			criticalCount: 0,
			offlineCount: 0,
			totalAgents: 0,
			autoRepairEnabled: true,
			systemUptime: 0,
			repairsToday: 0,
		};
	}

	const totalHealth = agents.reduce((sum, agent) => sum + agent.healthScore, 0);
	const systemHealth = Math.round(totalHealth / agents.length);

	const healthyCount = agents.filter((a) => a.healthScore >= 90 && a.status === "active").length;
	const degradedCount = agents.filter((a) => a.healthScore >= 70 && a.healthScore < 90).length;
	const criticalCount = agents.filter((a) => a.healthScore < 70 && a.status !== "offline").length;
	const offlineCount = agents.filter((a) => a.status === "offline" || a.status === "killed").length;

	return {
		systemHealth,
		healthyCount,
		degradedCount,
		criticalCount,
		offlineCount,
		totalAgents: agents.length,
		autoRepairEnabled: true, // TODO: Get from API
		systemUptime: 0, // TODO: Calculate from system start time
		repairsToday: 0, // TODO: Get from repair history
	};
}

export function getHealthStatus(
	healthScore: number,
	agentStatus: string,
): "healthy" | "degraded" | "critical" | "offline" {
	if (agentStatus === "offline" || agentStatus === "killed") {
		return "offline";
	}
	if (healthScore >= 90) {
		return "healthy";
	}
	if (healthScore >= 70) {
		return "degraded";
	}
	return "critical";
}

export function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return `${days}d ${hours}h ${minutes}m`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}
