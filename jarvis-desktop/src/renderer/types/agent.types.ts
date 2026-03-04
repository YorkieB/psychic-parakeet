export interface Agent {
	id: string;
	name: string;
	status: "online" | "offline";
	capabilities: string[];
	port: number;
}

export interface AgentCapabilities {
	[agentId: string]: string[];
}
