export interface HealthMetrics {
	systemHealth: number;
	healthyCount: number;
	degradedCount: number;
	criticalCount: number;
	offlineCount: number;
	totalAgents: number;
	autoRepairEnabled: boolean;
	lastRepair?: Date;
	systemUptime: number;
	repairsToday: number;
}

export interface HealthDataPoint {
	timestamp: Date;
	healthScore: number;
	agentName: string;
}

export interface HealthTimeSeries {
	agentName: string;
	data: HealthDataPoint[];
	color: string;
}

export type HealthStatus = "healthy" | "degraded" | "critical" | "offline";

export interface HealthThresholds {
	healthy: number; // 90-100
	degraded: number; // 70-89
	critical: number; // 0-69
}

export type SensorStatus = "healthy" | "degraded" | "error" | "unavailable";

export interface SensorHealthReport {
	sensorName: string;
	status: SensorStatus;
	message: string;
	details?: Record<string, unknown>;
	timestamp: number;
	receivedAt?: string;
}
