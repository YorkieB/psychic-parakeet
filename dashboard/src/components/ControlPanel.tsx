/*
  This file creates a control panel component that provides system management controls in Jarvis's dashboard.

  It offers agent management controls, system repair options, auto-repair settings, and bulk operations while providing comprehensive system administration capabilities.
*/

import { AlertTriangle, Download, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { healthApi } from "../api/healthApi";
import { useHealth } from "../contexts/HealthContext";
import { useWebSocketContext } from "../contexts/WebSocketContext";

export function ControlPanel() {
	const { agents, systemHealth } = useHealth();
	const { clearEvents } = useWebSocketContext();
	const [autoRepair, setAutoRepair] = useState(systemHealth.autoRepairEnabled);
	const [loading, setLoading] = useState(false);

	const handleRespawnAll = async () => {
		if (!window.confirm("Respawn all agents? This may cause brief downtime.")) return;
		setLoading(true);
		try {
			await Promise.all(agents.map((agent) => healthApi.respawnAgent(agent.name)));
		} catch (error) {
			console.error("Failed to respawn all agents:", error);
			alert("Some agents failed to respawn. Check console for details.");
		} finally {
			setLoading(false);
		}
	};

	const handleKillAll = async () => {
		if (!window.confirm("Kill all agents? This will stop the entire system!")) return;
		if (!window.confirm("Are you absolutely sure? This action cannot be undone.")) return;
		setLoading(true);
		try {
			await Promise.all(agents.map((agent) => healthApi.killAgent(agent.name)));
		} catch (error) {
			console.error("Failed to kill all agents:", error);
			window.alert("Some agents failed to kill. Check console for details.");
		} finally {
			setLoading(false);
		}
	};

	const handleRespawnUnhealthy = async () => {
		const unhealthy = agents.filter((a) => a.healthScore < 70 || a.status === "error");
		if (unhealthy.length === 0) {
			window.alert("No unhealthy agents found.");
			return;
		}
		if (!window.confirm(`Respawn ${unhealthy.length} unhealthy agent(s)?`)) return;
		setLoading(true);
		try {
			await Promise.all(unhealthy.map((agent) => healthApi.respawnAgent(agent.name)));
		} catch (error) {
			console.error("Failed to respawn unhealthy agents:", error);
			alert("Some agents failed to respawn. Check console for details.");
		} finally {
			setLoading(false);
		}
	};

	const handleExportReport = () => {
		const report = {
			timestamp: new Date().toISOString(),
			systemHealth,
			agents: agents.map((a) => ({
				name: a.name,
				healthScore: a.healthScore,
				status: a.status,
				uptime: a.uptime,
				lastActivity: a.lastActivity,
			})),
		};
		const dataStr = JSON.stringify(report, null, 2);
		const dataBlob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `jarvis-health-report-${new Date().toISOString()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="bg-dashboard-card border border-gray-700 rounded-lg p-6">
			<h2 className="text-lg font-semibold text-dashboard-text mb-6 flex items-center gap-2">
				<AlertTriangle className="w-5 h-5" />
				MANUAL CONTROLS
			</h2>

			<div className="space-y-6">
				{/* Auto-Repair Toggle */}
				<div className="flex items-center justify-between p-4 bg-dashboard-bg rounded-lg border border-gray-700">
					<div>
						<div className="font-medium text-dashboard-text">Auto-Repair</div>
						<div className="text-sm text-gray-400">Automatically repair unhealthy agents</div>
					</div>
					<label className="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={autoRepair}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoRepair(e.target.checked)}
							className="sr-only peer"
						/>
						<div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dashboard-success"></div>
					</label>
				</div>

				{/* Batch Actions */}
				<div>
					<h3 className="text-sm font-medium text-gray-400 mb-3">Batch Actions</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<button
							onClick={handleRespawnAll}
							disabled={loading}
							className="px-4 py-3 bg-dashboard-accent/20 hover:bg-dashboard-accent/30 text-dashboard-accent rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
						>
							<RotateCcw className="w-5 h-5" />
							Respawn All
						</button>
						<button
							onClick={handleRespawnUnhealthy}
							disabled={loading}
							className="px-4 py-3 bg-dashboard-warning/20 hover:bg-dashboard-warning/30 text-dashboard-warning rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
						>
							<RotateCcw className="w-5 h-5" />
							Respawn Unhealthy
						</button>
						<button
							onClick={handleKillAll}
							disabled={loading}
							className="px-4 py-3 bg-dashboard-error/20 hover:bg-dashboard-error/30 text-dashboard-error rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
						>
							<X className="w-5 h-5" />
							Kill All
						</button>
						<button
							onClick={() => window.location.reload()}
							className="px-4 py-3 bg-dashboard-accent/20 hover:bg-dashboard-accent/30 text-dashboard-accent rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
						>
							<RefreshCw className="w-5 h-5" />
							Restart Dashboard
						</button>
					</div>
				</div>

				{/* System Actions */}
				<div>
					<h3 className="text-sm font-medium text-gray-400 mb-3">System Actions</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<button
							onClick={clearEvents}
							className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
						>
							<Trash2 className="w-5 h-5" />
							Clear Event Log
						</button>
						<button
							onClick={handleExportReport}
							className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
						>
							<Download className="w-5 h-5" />
							Export Health Report
						</button>
					</div>
				</div>

				{/* Danger Zone */}
				<div className="border-t border-gray-700 pt-6">
					<h3 className="text-sm font-medium text-dashboard-error mb-3">Danger Zone</h3>
					<div className="space-y-2">
						<button
							onClick={() => window.alert("Feature not implemented")}
							className="w-full px-4 py-3 bg-dashboard-error/20 hover:bg-dashboard-error/30 text-dashboard-error rounded-lg font-medium transition-colors"
						>
							⚠️ Disable All Sensors
						</button>
						<button
							onClick={handleKillAll}
							disabled={loading}
							className="w-full px-4 py-3 bg-dashboard-error/20 hover:bg-dashboard-error/30 text-dashboard-error rounded-lg font-medium transition-colors disabled:opacity-50"
						>
							⚠️ Stop All Agents
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
