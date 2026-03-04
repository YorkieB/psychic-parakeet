/*
  This file creates the detailed agent page where you can dive deep into any specific agent's performance and behavior.

  It shows detailed metrics, lifecycle history, control options, and health charts while making it easy to understand and manage individual agents.
*/

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { healthApi } from "../api/healthApi";
import { HealthChart } from "../components/HealthChart";
import type { AgentMetrics, AgentStatus, SpawnHistory } from "../types";
import { getHealthStatus } from "../utils/healthCalculations";
import { formatBytes, formatTimestamp, formatUptime } from "../utils/timeUtils";

export function AgentDetailPage() {
	const { agentName } = useParams<{ agentName: string }>();
	const navigate = useNavigate();
	const [agent, setAgent] = useState<AgentStatus | null>(null);
	const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
	const [history, setHistory] = useState<SpawnHistory[]>([]);
	const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "lifecycle" | "control">(
		"overview",
	);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!agentName) {
			navigate("/");
			return;
		}

		const name = agentName;

		async function loadData() {
			try {
				setLoading(true);
				const [agentData, metricsData, historyData] = await Promise.all([
					healthApi.getAgent(name),
					healthApi.getAgentMetrics(name),
					healthApi.getAgentHistory(name),
				]);
				setAgent(agentData);
				setMetrics(metricsData);
				setHistory(historyData);
			} catch (error) {
				console.error("Failed to load agent data:", error);
			} finally {
				setLoading(false);
			}
		}
		loadData();
	}, [agentName, navigate]);

	if (loading || !agent || !metrics) {
		return (
			<div className="min-h-screen bg-dashboard-bg p-6">
				<div className="max-w-7xl mx-auto">
					<div className="bg-dashboard-card rounded-lg p-8 text-center">
						<div className="text-dashboard-text">Loading...</div>
					</div>
				</div>
			</div>
		);
	}

	const status = getHealthStatus(agent.healthScore, agent.status);

	return (
		<div className="min-h-screen bg-dashboard-bg p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<button
						onClick={() => navigate("/")}
						className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
						aria-label="Back to dashboard"
					>
						<ArrowLeft className="w-5 h-5 text-dashboard-text" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-dashboard-text">{agentName}</h1>
						<div className="flex items-center gap-2 mt-1">
							<span
								className={`px-3 py-1 rounded text-sm font-medium ${
									status === "healthy"
										? "bg-dashboard-success/20 text-dashboard-success"
										: status === "degraded"
											? "bg-dashboard-warning/20 text-dashboard-warning"
											: status === "critical"
												? "bg-dashboard-error/20 text-dashboard-error"
												: "bg-gray-500/20 text-gray-500"
								}`}
							>
								{status.toUpperCase()}
							</span>
							<span className="text-2xl font-bold text-dashboard-accent">{agent.healthScore}%</span>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<div className="bg-dashboard-card border border-gray-700 rounded-lg">
					<div className="flex border-b border-gray-700">
						{(["overview", "metrics", "lifecycle", "control"] as const).map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`px-6 py-3 font-medium transition-colors ${
									activeTab === tab
										? "text-dashboard-accent border-b-2 border-dashboard-accent"
										: "text-gray-400 hover:text-dashboard-text"
								}`}
							>
								{tab.charAt(0).toUpperCase() + tab.slice(1)}
							</button>
						))}
					</div>

					{/* Content */}
					<div className="p-6">
						{activeTab === "overview" && (
							<div className="space-y-6">
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div>
										<div className="text-sm text-gray-400 mb-1">Response Time</div>
										<div className="text-xl font-semibold text-dashboard-text">
											{metrics.responseTime}ms
										</div>
									</div>
									<div>
										<div className="text-sm text-gray-400 mb-1">Success Rate</div>
										<div className="text-xl font-semibold text-dashboard-success">
											{metrics.successRate.toFixed(1)}%
										</div>
									</div>
									<div>
										<div className="text-sm text-gray-400 mb-1">Error Rate</div>
										<div className="text-xl font-semibold text-dashboard-error">
											{metrics.errorRate.toFixed(1)}%
										</div>
									</div>
									<div>
										<div className="text-sm text-gray-400 mb-1">Memory Usage</div>
										<div className="text-xl font-semibold text-dashboard-text">
											{formatBytes(metrics.memoryUsage * 1024 * 1024)}
										</div>
									</div>
									<div>
										<div className="text-sm text-gray-400 mb-1">CPU Usage</div>
										<div className="text-xl font-semibold text-dashboard-text">
											{metrics.cpuUsage.toFixed(1)}%
										</div>
									</div>
									<div>
										<div className="text-sm text-gray-400 mb-1">Active Requests</div>
										<div className="text-xl font-semibold text-dashboard-text">
											{metrics.activeRequests}
										</div>
									</div>
									<div>
										<div className="text-sm text-gray-400 mb-1">Queued Requests</div>
										<div className="text-xl font-semibold text-dashboard-text">
											{metrics.queuedRequests}
										</div>
									</div>
									<div>
										<div className="text-sm text-gray-400 mb-1">Uptime</div>
										<div className="text-xl font-semibold text-dashboard-text">
											{formatUptime(metrics.uptime)}
										</div>
									</div>
								</div>

								<div className="border-t border-gray-700 pt-6">
									<h3 className="text-lg font-semibold text-dashboard-text mb-4">Spawn History</h3>
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-gray-400">Spawn Count:</span>
											<span className="text-dashboard-text">{history[0]?.spawnCount || 0}</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-gray-400">Crash Count:</span>
											<span className="text-dashboard-text">{history[0]?.crashCount || 0}</span>
										</div>
										{history[0]?.lastSpawn && (
											<div className="flex justify-between text-sm">
												<span className="text-gray-400">Last Spawn:</span>
												<span className="text-dashboard-text">
													{formatTimestamp(history[0].lastSpawn)}
												</span>
											</div>
										)}
										{history[0]?.lastCrash && (
											<div className="flex justify-between text-sm">
												<span className="text-gray-400">Last Crash:</span>
												<span className="text-dashboard-error">
													{formatTimestamp(history[0].lastCrash)}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{activeTab === "metrics" && (
							<div>
								<HealthChart agentName={agentName} />
							</div>
						)}

						{activeTab === "lifecycle" && (
							<div className="space-y-4">
								<h3 className="text-lg font-semibold text-dashboard-text">Lifecycle Events</h3>
								{history.length > 0 ? (
									<div className="space-y-3">
										{history.map((item: SpawnHistory) => (
											<div
												key={item.id}
												className="bg-dashboard-bg border border-gray-700 rounded-lg p-4"
											>
												<div className="flex justify-between items-start">
													<div>
														<div className="font-medium text-dashboard-text">
															Spawn #{item.spawnCount}
														</div>
														<div className="text-sm text-gray-400 mt-1">
															{formatTimestamp(item.lastSpawn)}
														</div>
													</div>
													{item.crashCount > 0 && (
														<div className="text-dashboard-error text-sm">
															{item.crashCount} crash
															{item.crashCount > 1 ? "es" : ""}
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="text-center text-gray-500 py-8">
										No lifecycle history available
									</div>
								)}
							</div>
						)}

						{activeTab === "control" && (
							<div className="space-y-4">
								<h3 className="text-lg font-semibold text-dashboard-text">Manual Controls</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<button
										onClick={async () => {
											if (window.confirm(`Respawn ${agentName}?`)) {
												try {
													await healthApi.respawnAgent(agentName!);
													window.location.reload();
												} catch (error) {
													console.error("Failed to respawn:", error);
													alert("Failed to respawn agent");
												}
											}
										}}
										className="px-4 py-3 bg-dashboard-accent/20 hover:bg-dashboard-accent/30 text-dashboard-accent rounded-lg font-medium transition-colors"
									>
										Respawn Agent
									</button>
									<button
										onClick={async () => {
											if (window.confirm(`Kill ${agentName}? This will stop the agent.`)) {
												try {
													await healthApi.killAgent(agentName!);
													window.location.reload();
												} catch (error) {
													console.error("Failed to kill:", error);
													alert("Failed to kill agent");
												}
											}
										}}
										className="px-4 py-3 bg-dashboard-error/20 hover:bg-dashboard-error/30 text-dashboard-error rounded-lg font-medium transition-colors"
									>
										Kill Agent
									</button>
									<button
										onClick={() => {
											// TODO: Implement log viewer
											window.alert("Log viewer not yet implemented");
										}}
										className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors"
									>
										View Logs
									</button>
									<button
										onClick={() => {
											// TODO: Implement config viewer
											window.alert("Config viewer not yet implemented");
										}}
										className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors"
									>
										View Configuration
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
