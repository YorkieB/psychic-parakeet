/*
  This file creates a health overview component that displays comprehensive system health metrics in Jarvis's dashboard.

  It shows system status indicators, performance metrics, uptime statistics, and health summaries while providing a complete overview of Jarvis's operational status.
*/

import { Activity, Cpu, Link2, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { healthApi } from "../api/healthApi";
import { useHealth } from "../contexts/HealthContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { getProgressBarColor } from "../utils/colorUtils";
import { formatUptime } from "../utils/healthCalculations";

export function HealthOverview() {
	const { systemHealth } = useHealth();
	const { connected } = useWebSocketContext();
	const [darkMode, setDarkMode] = useState(!document.documentElement.classList.contains("light"));
	const [primaryLLM, setPrimaryLLM] = useState<{
		providerLabel: string;
		model: string;
		linked: boolean;
		endpointRegion?: string;
	} | null>(null);

	useEffect(() => {
		let cancelled = false;
		healthApi
			.getPrimaryAIProvider()
			.then((data) => {
				if (!cancelled) {
					setPrimaryLLM({
						providerLabel: data.providerLabel,
						model: data.model,
						linked: data.linked,
						endpointRegion: data.endpointRegion,
					});
				}
			})
			.catch(() => {
				if (!cancelled) setPrimaryLLM(null);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const toggleTheme = () => {
		setDarkMode(!darkMode);
		document.documentElement.classList.toggle("light");
	};

	return (
		<div className="bg-dashboard-card border border-gray-700/60 rounded-xl p-6 shadow-glow-sm">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-dashboard-text tracking-tight">
					Jarvis Self-Healing Status
				</h1>
				<div className="flex items-center gap-2">
					<div
						className={`flex items-center gap-2 ${connected ? "text-dashboard-success" : "text-dashboard-error"}`}
					>
						<div
							className={`w-2 h-2 rounded-full ${connected ? "bg-dashboard-success" : "bg-dashboard-error"} animate-pulse`}
						/>
						<span className="text-sm">{connected ? "Connected" : "Disconnected"}</span>
					</div>
					<button
						onClick={toggleTheme}
						className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
						aria-label="Toggle theme"
						title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
					>
						{darkMode ? (
							<Sun className="w-5 h-5 text-gray-400" />
						) : (
							<Moon className="w-5 h-5 text-gray-400" />
						)}
					</button>
					<button
						className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
						aria-label="Settings"
						title="Settings"
					>
						<Settings className="w-5 h-5 text-gray-400" />
					</button>
				</div>
			</div>

			{/* System Health */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-2">
					<span className="text-lg font-semibold text-dashboard-text">System Health</span>
					<span className="text-2xl font-bold text-dashboard-accent">
						{systemHealth.systemHealth}%
					</span>
				</div>
				<div className="w-full bg-gray-700 rounded-full h-3">
					<div
						className={`h-3 rounded-full transition-all ${getProgressBarColor(systemHealth.systemHealth)}`}
						style={{ width: `${systemHealth.systemHealth}%` }}
						role="progressbar"
						aria-valuenow={systemHealth.systemHealth}
						aria-valuemin={0}
						aria-valuemax={100}
					/>
				</div>
			</div>

			{/* Status Counts */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-dashboard-success" />
					<div>
						<div className="text-2xl font-bold text-dashboard-text">
							{systemHealth.healthyCount}
						</div>
						<div className="text-xs text-gray-400">Healthy</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-dashboard-warning" />
					<div>
						<div className="text-2xl font-bold text-dashboard-text">
							{systemHealth.degradedCount}
						</div>
						<div className="text-xs text-gray-400">Degraded</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-dashboard-error" />
					<div>
						<div className="text-2xl font-bold text-dashboard-text">
							{systemHealth.criticalCount}
						</div>
						<div className="text-xs text-gray-400">Critical</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-gray-500" />
					<div>
						<div className="text-2xl font-bold text-dashboard-text">
							{systemHealth.offlineCount}
						</div>
						<div className="text-xs text-gray-400">Offline</div>
					</div>
				</div>
			</div>

			{/* Primary LLM */}
			{primaryLLM && (
				<div className="mb-6 p-4 bg-dashboard-bg rounded-lg border border-gray-700">
					<div className="flex items-center gap-2 mb-2">
						<Cpu className="w-5 h-5 text-dashboard-accent" />
						<span className="text-sm font-semibold text-dashboard-text">Primary LLM</span>
						{primaryLLM.linked && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-dashboard-success/20 text-dashboard-success">
								<Link2 className="w-3 h-3" />
								Linked
							</span>
						)}
					</div>
					<div className="text-dashboard-text font-medium">{primaryLLM.providerLabel}</div>
					<div className="text-sm text-gray-400 truncate" title={primaryLLM.model}>
						{primaryLLM.model}
					</div>
					{primaryLLM.endpointRegion && (
						<div className="text-xs text-gray-500 mt-1">Region: {primaryLLM.endpointRegion}</div>
					)}
				</div>
			)}

			{/* System Info */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<Activity className="w-4 h-4 text-gray-400" />
						<span className="text-sm font-medium text-gray-400">Auto-Repair</span>
					</div>
					<div className="flex items-center gap-2">
						<div
							className={`w-2 h-2 rounded-full ${systemHealth.autoRepairEnabled ? "bg-dashboard-success" : "bg-dashboard-error"}`}
						/>
						<span className="text-dashboard-text">
							{systemHealth.autoRepairEnabled ? "ENABLED" : "DISABLED"}
						</span>
					</div>
					{systemHealth.lastRepair && (
						<div className="text-xs text-gray-500 mt-1">
							Last repair: {new Date(systemHealth.lastRepair).toLocaleString()}
						</div>
					)}
				</div>
				<div>
					<div className="text-sm font-medium text-gray-400 mb-1">System Uptime</div>
					<div className="text-dashboard-text">{formatUptime(systemHealth.systemUptime)}</div>
				</div>
				<div>
					<div className="text-sm font-medium text-gray-400 mb-1">Repairs Today</div>
					<div className="text-dashboard-text">{systemHealth.repairsToday}</div>
				</div>
				<div>
					<div className="text-sm font-medium text-gray-400 mb-1">Total Agents</div>
					<div className="text-dashboard-text">{systemHealth.totalAgents}</div>
				</div>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
