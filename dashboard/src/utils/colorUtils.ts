import type { HealthStatus } from "../types";

export function getStatusColor(status: HealthStatus): string {
	switch (status) {
		case "healthy":
			return "text-dashboard-success border-dashboard-success";
		case "degraded":
			return "text-dashboard-warning border-dashboard-warning";
		case "critical":
			return "text-dashboard-error border-dashboard-error";
		case "offline":
			return "text-gray-500 border-gray-500";
		default:
			return "text-gray-400 border-gray-400";
	}
}

export function getStatusBgColor(status: HealthStatus): string {
	switch (status) {
		case "healthy":
			return "bg-dashboard-success/20 border-dashboard-success";
		case "degraded":
			return "bg-dashboard-warning/20 border-dashboard-warning";
		case "critical":
			return "bg-dashboard-error/20 border-dashboard-error";
		case "offline":
			return "bg-gray-500/20 border-gray-500";
		default:
			return "bg-gray-400/20 border-gray-400";
	}
}

export function getHealthScoreColor(score: number): string {
	if (score >= 90) return "text-dashboard-success";
	if (score >= 70) return "text-dashboard-warning";
	if (score >= 0) return "text-dashboard-error";
	return "text-gray-500";
}

export function getProgressBarColor(score: number): string {
	if (score >= 90) return "bg-dashboard-success";
	if (score >= 70) return "bg-dashboard-warning";
	if (score >= 0) return "bg-dashboard-error";
	return "bg-gray-500";
}

export function getEventColor(type: string): string {
	switch (type) {
		case "agent_spawned":
		case "repair_completed":
			return "text-dashboard-success";
		case "agent_crashed":
		case "repair_failed":
			return "text-dashboard-error";
		case "agent_respawned":
		case "repair_started":
			return "text-dashboard-accent";
		case "agent_health_changed":
			return "text-dashboard-warning";
		case "agent_killed":
			return "text-gray-500";
		default:
			return "text-gray-400";
	}
}
