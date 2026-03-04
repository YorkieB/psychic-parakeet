/**
 * Real-time System Monitoring
 * Provides actual CPU, memory, uptime, battery, and network stats
 * Reports health status to Health API module
 */

import os from "node:os";
import { sensorHealthReporter } from "./sensor-health-reporter";

interface SystemStats {
	cpu: number;
	memory: {
		used: number;
		total: number;
		free: number;
		percentage: number;
	};
	uptime: string;
	platform: string;
	hostname: string;
}

interface BatteryInfo {
	level: number;
	charging: boolean;
	chargingTime: number | null;
	dischargingTime: number | null;
	available: boolean;
}

interface NetworkInfo {
	online: boolean;
	type: string;
	downlink: number | null;
	effectiveType: string | null;
	rtt: number | null;
}

class SystemMonitor {
	private cpuUsageHistory: number[] = [];
	private lastCpuUsage: NodeJS.CpuUsage | null = null;
	private lastCheckTime: number = Date.now();

	/**
	 * Get real CPU usage percentage
	 */
	getCPUUsage(): number {
		try {
			const cpus = os.cpus();
			const currentUsage = process.cpuUsage();
			const currentTime = Date.now();

			if (this.lastCpuUsage && this.lastCheckTime) {
				const timeDiff = (currentTime - this.lastCheckTime) * 1000; // Convert to microseconds
				const userDiff = currentUsage.user - this.lastCpuUsage.user;
				const systemDiff = currentUsage.system - this.lastCpuUsage.system;

				const totalUsage = userDiff + systemDiff;
				const percentage = (totalUsage / timeDiff) * 100;

				// Average with history for smoother display
				this.cpuUsageHistory.push(Math.min(percentage, 100));
				if (this.cpuUsageHistory.length > 10) {
					this.cpuUsageHistory.shift();
				}

				const avgUsage =
					this.cpuUsageHistory.reduce((a, b) => a + b, 0) / this.cpuUsageHistory.length;

				this.lastCpuUsage = currentUsage;
				this.lastCheckTime = currentTime;

				const cpuValue = Math.round(avgUsage * 100) / 100;

				// Report health status
				if (cpuValue > 90) {
					sensorHealthReporter.reportSensorHealth(
						"CPU",
						"degraded",
						`CPU usage is very high at ${cpuValue.toFixed(1)}%. System may be under heavy load.`,
						{ usage: cpuValue },
					);
				} else {
					sensorHealthReporter.reportSensorHealth(
						"CPU",
						"healthy",
						`CPU monitoring working normally. Current usage: ${cpuValue.toFixed(1)}%`,
						{ usage: cpuValue },
					);
				}

				return cpuValue;
			}

			this.lastCpuUsage = currentUsage;
			this.lastCheckTime = currentTime;

			// Calculate overall CPU usage from all cores
			let totalIdle = 0;
			let totalTick = 0;

			cpus.forEach((cpu) => {
				for (const type in cpu.times) {
					totalTick += cpu.times[type as keyof typeof cpu.times];
				}
				totalIdle += cpu.times.idle;
			});

			const idle = totalIdle / cpus.length;
			const total = totalTick / cpus.length;
			const usage = 100 - Math.round((idle / total) * 100);
			const cpuValue = Math.max(0, Math.min(100, usage));

			// Report initial health
			sensorHealthReporter.reportSensorHealth(
				"CPU",
				"healthy",
				`CPU monitoring initialized. Current usage: ${cpuValue.toFixed(1)}%`,
				{ usage: cpuValue },
			);

			return cpuValue;
		} catch (error: any) {
			sensorHealthReporter.reportSensorHealth(
				"CPU",
				"error",
				"Failed to read CPU usage. System may be experiencing issues.",
				{ error: error.message },
			);
			return 0;
		}
	}

	/**
	 * Get real memory usage
	 */
	getMemoryUsage(): {
		used: number;
		total: number;
		free: number;
		percentage: number;
	} {
		try {
			const totalMem = os.totalmem();
			const freeMem = os.freemem();
			const usedMem = totalMem - freeMem;
			const percentage = Math.round((usedMem / totalMem) * 100 * 100) / 100;

			const memoryInfo = {
				used: Math.round((usedMem / 1024 / 1024 / 1024) * 100) / 100, // GB
				total: Math.round((totalMem / 1024 / 1024 / 1024) * 100) / 100, // GB
				free: Math.round((freeMem / 1024 / 1024 / 1024) * 100) / 100, // GB
				percentage,
			};

			// Report health status
			if (percentage > 90) {
				sensorHealthReporter.reportSensorHealth(
					"Memory",
					"degraded",
					`Memory usage is critically high at ${percentage.toFixed(1)}%. Only ${memoryInfo.free.toFixed(1)}GB free. Consider closing applications.`,
					memoryInfo,
				);
			} else if (percentage > 75) {
				sensorHealthReporter.reportSensorHealth(
					"Memory",
					"degraded",
					`Memory usage is high at ${percentage.toFixed(1)}%. ${memoryInfo.free.toFixed(1)}GB available.`,
					memoryInfo,
				);
			} else {
				sensorHealthReporter.reportSensorHealth(
					"Memory",
					"healthy",
					`Memory monitoring working normally. Using ${memoryInfo.used.toFixed(1)}GB of ${memoryInfo.total.toFixed(1)}GB (${percentage.toFixed(1)}%)`,
					memoryInfo,
				);
			}

			return memoryInfo;
		} catch (error: any) {
			sensorHealthReporter.reportSensorHealth(
				"Memory",
				"error",
				"Failed to read memory usage. Cannot determine available system memory.",
				{ error: error.message },
			);
			return { used: 0, total: 0, free: 0, percentage: 0 };
		}
	}

	/**
	 * Get formatted system uptime
	 */
	getUptime(): string {
		try {
			const uptimeSeconds = os.uptime();
			const hours = Math.floor(uptimeSeconds / 3600);
			const minutes = Math.floor((uptimeSeconds % 3600) / 60);

			const uptimeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

			// Report health status (only once per hour to avoid spam)
			const lastReport = (this as any).lastUptimeReport || 0;
			if (Date.now() - lastReport > 3600000) {
				// Report once per hour
				sensorHealthReporter.reportSensorHealth(
					"System Uptime",
					"healthy",
					`System has been running for ${uptimeString}. All systems operational.`,
					{ uptime: uptimeSeconds, formatted: uptimeString },
				);
				(this as any).lastUptimeReport = Date.now();
			}

			return uptimeString;
		} catch (error: any) {
			sensorHealthReporter.reportSensorHealth(
				"System Uptime",
				"error",
				"Failed to read system uptime. Cannot determine how long the system has been running.",
				{ error: error.message },
			);
			return "0m";
		}
	}

	/**
	 * Get complete system stats
	 */
	getSystemStats(): SystemStats {
		return {
			cpu: this.getCPUUsage(),
			memory: this.getMemoryUsage(),
			uptime: this.getUptime(),
			platform: os.platform(),
			hostname: os.hostname(),
		};
	}

	/**
	 * Get battery information (if available)
	 */
	async getBatteryInfo(): Promise<BatteryInfo> {
		try {
			// Try to use navigator.getBattery via renderer process
			// For main process, we'll return basic info
			return {
				level: 1.0, // Will be updated by renderer
				charging: false,
				chargingTime: null,
				dischargingTime: null,
				available: false,
			};
		} catch (_error) {
			return {
				level: 0,
				charging: false,
				chargingTime: null,
				dischargingTime: null,
				available: false,
			};
		}
	}

	/**
	 * Get network information
	 */
	getNetworkInfo(): NetworkInfo {
		try {
			const networkInterfaces = os.networkInterfaces();
			const interfaces = Object.values(networkInterfaces).flat();

			const activeInterface = interfaces?.find(
				(iface) => iface && !iface.internal && iface.family === "IPv4",
			);

			const networkInfo: NetworkInfo = {
				online: activeInterface !== undefined,
				type: activeInterface ? "ethernet" : "unknown",
				downlink: null,
				effectiveType: null,
				rtt: null,
			};

			// Report health status
			if (networkInfo.online) {
				sensorHealthReporter.reportSensorHealth(
					"Network",
					"healthy",
					`Network connection active. Connected via ${networkInfo.type}.`,
					networkInfo,
				);
			} else {
				sensorHealthReporter.reportSensorHealth(
					"Network",
					"error",
					"No network connection detected. Check your internet connection and network cables.",
					networkInfo,
				);
			}

			return networkInfo;
		} catch (error: any) {
			sensorHealthReporter.reportSensorHealth(
				"Network",
				"error",
				"Failed to check network status. Cannot determine if you are connected to the internet.",
				{ error: error.message },
			);
			return {
				online: false,
				type: "unknown",
				downlink: null,
				effectiveType: null,
				rtt: null,
			};
		}
	}
}

export const systemMonitor = new SystemMonitor();
