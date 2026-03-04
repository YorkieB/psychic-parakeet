export type EventType =
	| "agent_spawned"
	| "agent_crashed"
	| "agent_respawned"
	| "agent_health_changed"
	| "agent_killed"
	| "agent_error"
	| "repair_started"
	| "repair_completed"
	| "repair_failed";

export interface HealthEvent {
	id: string;
	type: EventType;
	agentName: string;
	timestamp: Date;
	message: string;
	details?: Record<string, any>;
	severity?: "info" | "warning" | "error" | "success";
}

export interface RepairEvent extends HealthEvent {
	issue: string;
	rootCause?: string;
	strategy: string;
	downtime?: number;
	success: boolean;
}

export interface WebSocketEvent {
	type: EventType;
	data: Record<string, any>;
	timestamp: string;
}
