export interface AgentResponse {
	success: boolean;
	data?: any;
	error?: string;
	metadata?: {
		duration: number;
		retryCount: number;
	};
}

export interface AgentStatus {
	id: string;
	name: string;
	status: "online" | "offline" | "error";
	health: boolean;
	lastSeen?: Date;
}

export interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	attachments?: Attachment[];
}

export interface Attachment {
	type: "music" | "image" | "video" | "file";
	url: string;
	title?: string;
	thumbnail?: string;
}
