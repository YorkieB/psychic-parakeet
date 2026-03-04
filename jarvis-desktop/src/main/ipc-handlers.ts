import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { type BrowserWindow, ipcMain, Notification } from "electron";
import { sensorHealthReporter } from "./sensor-health-reporter";
import { systemMonitor } from "./system-monitor";

// Backend API URL: set VITE_JARVIS_API_URL when starting the app to use a different host/port
const JARVIS_API_BASE = process.env.VITE_JARVIS_API_URL || "http://localhost:3000";

export function setupIPCHandlers(mainWindow: BrowserWindow) {
	// Send message to Jarvis backend
	ipcMain.handle("jarvis:send-message", async (_event: any, message: string) => {
		try {
			const response = await axios.post(
				`${JARVIS_API_BASE}/chat`,
				{
					message,
					userId: "desktop-user",
				},
				{
					// Prevent the renderer from hanging indefinitely if the backend stalls
					timeout: 30000,
				},
			);
			return response.data;
		} catch (error: any) {
			const code = error?.code || error?.cause?.code;
			const msg = error?.message || String(error);
			if (code === "ECONNABORTED") {
				console.error("Failed to send message (timeout):", msg);
				throw new Error("Chat request timed out. Please try again.");
			}
			console.error("Failed to send message:", msg);
			throw new Error(msg);
		}
	});

	// Get agent status
	ipcMain.handle("jarvis:get-agent-status", async () => {
		try {
			const response = await axios.get(`${JARVIS_API_BASE}/agents/status`);
			return response.data;
		} catch (error: any) {
			const code = error?.code || error?.cause?.code;
			if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
				// Backend not running – UI shows "Backend offline"; avoid log spam
				return { agents: [], online: 0, total: 12 };
			}
			console.error("Failed to get agent status:", error?.message || error);
			return { agents: [], online: 0, total: 12 };
		}
	});

	// Get primary AI provider (Vertex AI / Claude) for status bar
	ipcMain.handle("jarvis:get-primary-ai-provider", async () => {
		try {
			const response = await axios.get(`${JARVIS_API_BASE}/api/health/ai-provider`, {
				timeout: 5000,
			});
			const data = response.data?.data ?? response.data;
			return {
				primary: data?.primary ?? "claude-sonnet",
				providerLabel: data?.providerLabel ?? "Claude",
				model: data?.model ?? "",
				linked: data?.linked ?? false,
			};
		} catch (_error: any) {
			return { primary: null, providerLabel: null, model: null, linked: false };
		}
	});

	// Voice input
	ipcMain.handle("jarvis:voice-input", async (_event: any, audioData: Buffer) => {
		try {
			const response = await axios.post(`${JARVIS_API_BASE}/voice/transcribe`, audioData, {
				headers: { "Content-Type": "audio/wav" },
				timeout: 60000,
			});
			return response.data.text;
		} catch (error: any) {
			console.error("Voice transcription failed:", error);
			throw new Error(error.message);
		}
	});

	// Get emails
	ipcMain.handle("jarvis:get-emails", async (_event: any, options: any) => {
		try {
			const response = await axios.get(`${JARVIS_API_BASE}/agents/email/list`, {
				params: options,
			});
			return response.data;
		} catch (_error: any) {
			return { emails: [], count: 0 };
		}
	});

	// Get calendar events
	ipcMain.handle("jarvis:get-calendar", async (_event: any, options: any) => {
		try {
			const response = await axios.get(`${JARVIS_API_BASE}/agents/calendar/list`, {
				params: options,
			});
			return response.data;
		} catch (_error: any) {
			return { events: [], count: 0 };
		}
	});

	// Get finance data
	ipcMain.handle("jarvis:get-finance", async (_event: any, options: any) => {
		try {
			const response = await axios.get(`${JARVIS_API_BASE}/agents/finance/analyze`, {
				params: options,
			});
			return response.data;
		} catch (_error: any) {
			return { totalSpent: 0, categories: [] };
		}
	});

	// Window controls
	ipcMain.on("window:minimize", () => {
		mainWindow.minimize();
	});

	ipcMain.on("window:maximize", () => {
		if (mainWindow.isMaximized()) {
			mainWindow.unmaximize();
		} else {
			mainWindow.maximize();
		}
	});

	ipcMain.on("window:close", () => {
		mainWindow.close();
	});

	// Notifications
	ipcMain.handle("notification:show", (_event: any, options: any) => {
		const notification = new Notification({
			title: options.title,
			body: options.body,
			icon: options.icon,
		});
		notification.show();
	});

	// ============================================
	// REAL SYSTEM MONITORING (Not Mocked)
	// ============================================

	// Get real system stats (CPU, Memory, Uptime)
	ipcMain.handle("system:get-stats", () => {
		return systemMonitor.getSystemStats();
	});

	// Get real memory usage
	ipcMain.handle("system:get-memory", () => {
		return systemMonitor.getMemoryUsage();
	});

	// Get real CPU usage
	ipcMain.handle("system:get-cpu", () => {
		return systemMonitor.getCPUUsage();
	});

	// Get real system uptime
	ipcMain.handle("system:get-uptime", () => {
		return systemMonitor.getUptime();
	});

	// Get network information
	ipcMain.handle("system:get-network", () => {
		return systemMonitor.getNetworkInfo();
	});

	ipcMain.handle("jarvis:get-light-browser-url", () => {
		const repoRoot = path.resolve(__dirname, "../../..");
		const candidates = [
			path.join(repoRoot, "WebX", "LightBrowser", "src", "index.html"),
			path.join(repoRoot, "WebX", "LightBrowser", "dist", "index.html"),
		];
		const found = candidates.find((candidate) => fs.existsSync(candidate));
		if (!found) {
			return "";
		}
		return `file://${found.replace(/\\/g, "/")}`;
	});

	// ============================================
	// CAMERA ACCESS
	// ============================================

	// Request camera access (permission handled by renderer)
	ipcMain.handle("camera:request-access", async () => {
		// Camera access is handled via navigator.mediaDevices in renderer
		// This handler can be used for logging or additional checks
		return { granted: true, message: "Camera access handled by renderer" };
	});

	// ============================================
	// BATTERY STATUS (via renderer)
	// ============================================

	// Battery info is accessed via navigator.getBattery in renderer
	// This handler can be used for additional processing if needed
	ipcMain.handle("battery:get-info", async () => {
		return await systemMonitor.getBatteryInfo();
	});

	// ============================================
	// SENSOR HEALTH REPORTING
	// ============================================

	// Report sensor health from renderer
	ipcMain.handle(
		"sensors:report-health",
		async (_event: any, sensorName: string, status: string, message: string, details?: any) => {
			await sensorHealthReporter.reportSensorHealth(
				sensorName,
				status as "healthy" | "degraded" | "error" | "unavailable",
				message,
				details,
			);
			return { success: true };
		},
	);

	// Get all sensor health reports
	ipcMain.handle("sensors:get-health-reports", () => {
		return sensorHealthReporter.getAllReports();
	});

	// Get specific sensor health report
	ipcMain.handle("sensors:get-health-report", (_event: any, sensorName: string) => {
		return sensorHealthReporter.getReport(sensorName);
	});

	// Start periodic health reporting
	ipcMain.handle("sensors:start-reporting", (_event: any, intervalMs: number = 30000) => {
		sensorHealthReporter.startPeriodicReporting(intervalMs);
		return {
			success: true,
			message: "Periodic sensor health reporting started",
		};
	});

	// ============================================
	// TTS (Local XTTS Voice Cloning)
	// ============================================

	const TTS_URL = process.env.LOCAL_TTS_URL || "http://localhost:8020";
	const SPEAKER_PATH =
		process.env.SPEAKER_AUDIO_PATH ||
		"C:\\Users\\conta\\OneDrive\\Voice Library\\Male\\New Jarvis.mp3";

	ipcMain.handle("jarvis:tts", async (_event: any, text: string) => {
		try {
			const response = await axios.post(
				`${TTS_URL}/tts`,
				{
					text,
					speaker_audio_path: SPEAKER_PATH,
					language: "en",
				},
				{
					responseType: "arraybuffer",
					timeout: 120000,
				},
			);
			// Return base64-encoded WAV so renderer can play it
			const base64 = Buffer.from(response.data).toString("base64");
			return { success: true, audio: base64 };
		} catch (error: any) {
			console.error("TTS failed:", error?.message || error);
			return { success: false, error: error?.message || "TTS unavailable" };
		}
	});
}
