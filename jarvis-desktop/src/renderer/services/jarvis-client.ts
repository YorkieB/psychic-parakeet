/// <reference types="vite/client" />
import axios from "axios";

const API_BASE = import.meta.env.VITE_JARVIS_API_URL || "http://localhost:3000";

export class JarvisClient {
	private baseURL: string;

	constructor(baseURL: string = API_BASE) {
		this.baseURL = baseURL;
	}

	async sendMessage(message: string, userId: string = "desktop-user") {
		const response = await axios.post(`${this.baseURL}/chat`, {
			message,
			userId,
		});
		return response.data;
	}

	async getAgentStatus() {
		const response = await axios.get(`${this.baseURL}/agents/status`);
		return response.data;
	}

	async getEmails(options: any = {}) {
		const response = await axios.get(`${this.baseURL}/agents/email/list`, {
			params: options,
		});
		return response.data;
	}

	async getCalendar(options: any = {}) {
		const response = await axios.get(`${this.baseURL}/agents/calendar/list`, {
			params: options,
		});
		return response.data;
	}

	async getFinance(options: any = {}) {
		const response = await axios.get(`${this.baseURL}/agents/finance/analyze`, {
			params: options,
		});
		return response.data;
	}

	async voiceTranscribe(audioData: Buffer) {
		const response = await axios.post(`${this.baseURL}/voice/transcribe`, audioData, {
			headers: { "Content-Type": "audio/wav" },
		});
		return response.data;
	}
}

export const jarvisClient = new JarvisClient();
