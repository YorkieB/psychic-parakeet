import { contextBridge, ipcRenderer } from "electron";

const lightBrowserUrlPromise = (async () => {
	try {
		const url = await ipcRenderer.invoke("jarvis:get-light-browser-url");
		return typeof url === "string" ? url : "";
	} catch {
		return "";
	}
})();

// Expose protected methods to renderer
contextBridge.exposeInMainWorld("jarvisAPI", {
	// Messaging
	sendMessage: (message: string) => ipcRenderer.invoke("jarvis:send-message", message),

	// Agent status
	getAgentStatus: () => ipcRenderer.invoke("jarvis:get-agent-status"),
	getPrimaryAIProvider: () => ipcRenderer.invoke("jarvis:get-primary-ai-provider"),

	// Voice
	voiceInput: (audioData: Buffer) => ipcRenderer.invoke("jarvis:voice-input", audioData),
	onVoiceActivate: (callback: () => void) => {
		ipcRenderer.on("activate-voice", callback);
	},

	// Agents
	getEmails: (options: any) => ipcRenderer.invoke("jarvis:get-emails", options),
	getCalendar: (options: any) => ipcRenderer.invoke("jarvis:get-calendar", options),
	getFinance: (options: any) => ipcRenderer.invoke("jarvis:get-finance", options),

	// Window controls
	minimizeWindow: () => ipcRenderer.send("window:minimize"),
	maximizeWindow: () => ipcRenderer.send("window:maximize"),
	closeWindow: () => ipcRenderer.send("window:close"),

	// Notifications
	showNotification: (options: any) => ipcRenderer.invoke("notification:show", options),

	// System Monitoring (Real-time, not mocked)
	getSystemStats: () => ipcRenderer.invoke("system:get-stats"),
	getMemory: () => ipcRenderer.invoke("system:get-memory"),
	getCPU: () => ipcRenderer.invoke("system:get-cpu"),
	getUptime: () => ipcRenderer.invoke("system:get-uptime"),
	getNetwork: () => ipcRenderer.invoke("system:get-network"),

	// Camera
	requestCameraAccess: () => ipcRenderer.invoke("camera:request-access"),

	// Battery
	getBatteryInfo: () => ipcRenderer.invoke("battery:get-info"),

	// Sensor Health Reporting
	reportSensorHealth: (sensorName: string, status: string, message: string, details?: any) =>
		ipcRenderer.invoke("sensors:report-health", sensorName, status, message, details),
	getSensorHealthReports: () => ipcRenderer.invoke("sensors:get-health-reports"),
	getSensorHealthReport: (sensorName: string) =>
		ipcRenderer.invoke("sensors:get-health-report", sensorName),
	startSensorHealthReporting: (intervalMs?: number) =>
		ipcRenderer.invoke("sensors:start-reporting", intervalMs),

	// TTS (Local XTTS Voice Cloning)
	tts: (text: string) => ipcRenderer.invoke("jarvis:tts", text),

	// Web / LightBrowser integration
	getLightBrowserUrl: () => lightBrowserUrlPromise,
});

// TypeScript declaration
declare global {
	interface Window {
		jarvisAPI: {
			sendMessage: (message: string) => Promise<any>;
			getAgentStatus: () => Promise<any>;
			getPrimaryAIProvider: () => Promise<{
				primary: string | null;
				providerLabel: string | null;
				model: string | null;
				linked: boolean;
			}>;
			voiceInput: (audioData: Buffer) => Promise<string>;
			onVoiceActivate: (callback: () => void) => void;
			getEmails: (options: any) => Promise<any>;
			getCalendar: (options: any) => Promise<any>;
			getFinance: (options: any) => Promise<any>;
			minimizeWindow: () => void;
			maximizeWindow: () => void;
			closeWindow: () => void;
			showNotification: (options: any) => Promise<void>;
			getSystemStats: () => Promise<any>;
			getMemory: () => Promise<any>;
			getCPU: () => Promise<number>;
			getUptime: () => Promise<string>;
			getNetwork: () => Promise<any>;
			requestCameraAccess: () => Promise<any>;
			getBatteryInfo: () => Promise<any>;
			reportSensorHealth: (
				sensorName: string,
				status: string,
				message: string,
				details?: any,
			) => Promise<any>;
			getSensorHealthReports: () => Promise<any>;
			getSensorHealthReport: (sensorName: string) => Promise<any>;
			startSensorHealthReporting: (intervalMs?: number) => Promise<any>;
			tts: (text: string) => Promise<{ success: boolean; audio?: string; error?: string }>;
			getLightBrowserUrl: () => Promise<string>;
		};
	}
}
