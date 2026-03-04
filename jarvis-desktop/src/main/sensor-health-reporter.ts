/**
 * Sensor Health Reporter
 * Reports sensor status to the main Health API module
 * Provides clear, understandable error messages in logs
 */

import axios from "axios";

const HEALTH_API_BASE = process.env.VITE_JARVIS_API_URL || "http://localhost:3000";

interface SensorHealthReport {
	sensorName: string;
	status: "healthy" | "degraded" | "error" | "unavailable";
	message: string;
	details?: any;
	timestamp: number;
}

class SensorHealthReporter {
	private reports: Map<string, SensorHealthReport> = new Map();
	private reportInterval: NodeJS.Timeout | null = null;
	private lastBackendDownLog = 0;
	private readonly BACKEND_DOWN_LOG_INTERVAL_MS = 60_000;

	/**
	 * Report sensor health status to Health API
	 */
	async reportSensorHealth(
		sensorName: string,
		status: "healthy" | "degraded" | "error" | "unavailable",
		message: string,
		details?: any,
	): Promise<void> {
		const report: SensorHealthReport = {
			sensorName,
			status,
			message,
			details,
			timestamp: Date.now(),
		};

		this.reports.set(sensorName, report);

		// Log with appropriate color/level
		this.logSensorStatus(sensorName, status, message, details);

		// Send to Health API
		try {
			await axios.post(`${HEALTH_API_BASE}/health/sensors/report`, report, {
				timeout: 5000,
			});
		} catch (error: any) {
			const code = error?.code || error?.cause?.code;
			const isUnreachable = code === "ECONNREFUSED" || code === "ENOTFOUND";
			const now = Date.now();
			if (isUnreachable) {
				if (now - this.lastBackendDownLog >= this.BACKEND_DOWN_LOG_INTERVAL_MS) {
					this.lastBackendDownLog = now;
					console.warn(
						"[Sensor Health] Jarvis backend unreachable. Start backend on port 3000 for health reporting.",
					);
				}
			} else {
				console.warn(
					`[Sensor Health] Could not send report to Health API: ${error?.message || error}`,
				);
			}
		}
	}

	/**
	 * Log sensor status with clear, understandable messages
	 */
	private logSensorStatus(
		sensorName: string,
		status: string,
		message: string,
		details?: any,
	): void {
		const timestamp = new Date().toISOString();
		const sensorDisplay = `[${sensorName}]`;

		switch (status) {
			case "healthy":
				// Green - everything working
				console.log(`\x1b[32m✓ ${timestamp} ${sensorDisplay} ${message}\x1b[0m`);
				break;

			case "degraded":
				// Yellow - working but with issues
				console.log(`\x1b[33m⚠ ${timestamp} ${sensorDisplay} ${message}\x1b[0m`);
				if (details) {
					console.log(`\x1b[33m   Details: ${JSON.stringify(details)}\x1b[0m`);
				}
				break;

			case "error":
				// Red - error occurred
				console.error(`\x1b[31m✗ ${timestamp} ${sensorDisplay} ERROR: ${message}\x1b[0m`);
				if (details) {
					console.error(`\x1b[31m   Problem: ${this.formatErrorDetails(details)}\x1b[0m`);
				}
				break;

			case "unavailable":
				// Gray - sensor not available (not an error)
				console.log(`\x1b[90m○ ${timestamp} ${sensorDisplay} ${message}\x1b[0m`);
				break;

			default:
				console.log(`${timestamp} ${sensorDisplay} ${message}`);
		}
	}

	/**
	 * Format error details into plain language
	 */
	private formatErrorDetails(details: any): string {
		if (typeof details === "string") {
			return details;
		}

		if (details?.error) {
			return this.translateError(details.error);
		}

		if (details?.message) {
			return this.translateError(details.message);
		}

		if (details?.code) {
			return this.translateErrorCode(details.code);
		}

		return JSON.stringify(details);
	}

	/**
	 * Translate technical error messages to plain language
	 */
	private translateError(error: string | Error): string {
		const errorMsg = typeof error === "string" ? error : error.message;
		const lowerError = errorMsg.toLowerCase();

		// Common error translations
		if (lowerError.includes("permission denied") || lowerError.includes("not allowed")) {
			return "Permission denied. Please grant access to this sensor in your system settings.";
		}

		if (lowerError.includes("not found") || lowerError.includes("not available")) {
			return "This sensor is not available on your device.";
		}

		if (lowerError.includes("timeout")) {
			return "The sensor took too long to respond. It may be busy or disconnected.";
		}

		if (lowerError.includes("network") || lowerError.includes("connection")) {
			return "Network connection problem. Check your internet connection.";
		}

		if (lowerError.includes("camera") && lowerError.includes("busy")) {
			return "Camera is already in use by another application. Close other apps using the camera.";
		}

		if (lowerError.includes("microphone") && lowerError.includes("busy")) {
			return "Microphone is already in use by another application. Close other apps using the microphone.";
		}

		if (lowerError.includes("battery")) {
			return "Battery information is not available on this device.";
		}

		if (lowerError.includes("enotfound") || lowerError.includes("econnrefused")) {
			return "Cannot connect to the health monitoring system. The backend may not be running.";
		}

		// Return original if no translation found
		return errorMsg;
	}

	/**
	 * Translate error codes to plain language
	 */
	private translateErrorCode(code: string): string {
		const codeMap: Record<string, string> = {
			ENOENT: "Sensor device not found. It may not be connected.",
			EACCES: "Permission denied. Please grant access to this sensor.",
			EBUSY: "Sensor is busy. Another application may be using it.",
			ETIMEDOUT: "Sensor timed out. It may be disconnected or not responding.",
			ECONNREFUSED: "Cannot connect to health monitoring. Backend may not be running.",
			ENETUNREACH: "Network unreachable. Check your connection.",
		};

		return codeMap[code] || `Error code: ${code}`;
	}

	/**
	 * Get all sensor reports
	 */
	getAllReports(): SensorHealthReport[] {
		return Array.from(this.reports.values());
	}

	/**
	 * Get report for specific sensor
	 */
	getReport(sensorName: string): SensorHealthReport | undefined {
		return this.reports.get(sensorName);
	}

	/**
	 * Start periodic health reporting
	 */
	startPeriodicReporting(intervalMs: number = 30000): void {
		if (this.reportInterval) {
			clearInterval(this.reportInterval);
		}

		this.reportInterval = setInterval(() => {
			// Send all current reports to Health API
			const reports = this.getAllReports();
			if (reports.length > 0) {
				axios
					.post(
						`${HEALTH_API_BASE}/health/sensors/batch`,
						{ reports },
						{
							timeout: 5000,
						},
					)
					.catch(() => {
						// Silently fail if Health API unavailable
					});
			}
		}, intervalMs);
	}

	/**
	 * Stop periodic reporting
	 */
	stopPeriodicReporting(): void {
		if (this.reportInterval) {
			clearInterval(this.reportInterval);
			this.reportInterval = null;
		}
	}
}

export const sensorHealthReporter = new SensorHealthReporter();
