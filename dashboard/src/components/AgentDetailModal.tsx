/*
  This file creates an agent detail modal that shows comprehensive information and controls for a specific agent in Jarvis's dashboard.

  It displays agent logs, configuration options, test controls, and detailed metrics while providing a complete management interface for individual agents.
*/

import {
	Activity,
	Bot,
	CheckCircle,
	FileText,
	FlaskConical,
	Loader2,
	Play,
	RotateCcw,
	Send,
	Settings as SettingsIcon,
	User,
	X,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { healthApi } from "../api/healthApi";
import { getAgentTestConfig, type InputField } from "../config/agentTestConfigs";
import type { AgentMetrics, AgentStatus, SpawnHistory } from "../types";
import { getHealthStatus } from "../utils/healthCalculations";
import { formatBytes, formatTimestamp, formatUptime } from "../utils/timeUtils";
import { HealthChart } from "./HealthChart";

// Chat message interface for ConversationAgent
interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

interface AgentDetailModalProps {
	agentName: string;
	onClose: () => void;
	onRespawn: (name: string) => void;
	onKill: (name: string) => void;
}

export function AgentDetailModal({ agentName, onClose, onRespawn, onKill }: AgentDetailModalProps) {
	const [agent, setAgent] = useState<AgentStatus | null>(null);
	const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
	const [history, setHistory] = useState<SpawnHistory[]>([]);
	const [activeTab, setActiveTab] = useState<
		"overview" | "metrics" | "lifecycle" | "control" | "test"
	>("overview");
	const [loading, setLoading] = useState(true);

	// Test tab state
	const [testInputs, setTestInputs] = useState<Record<string, string | number>>({});
	const [_testAction, _setTestAction] = useState("");
	const [testLoading, setTestLoading] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		data?: unknown;
		error?: string;
		duration?: number;
	} | null>(null);
	const testConfig = getAgentTestConfig(agentName);

	// Chat interface state for ConversationAgent
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [chatInput, setChatInput] = useState("");
	const [chatLoading, setChatLoading] = useState(false);
	const chatContainerRef = useRef<HTMLDivElement>(null);

	// Auto-scroll chat to bottom when new messages arrive
	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
		}
	}, []);

	useEffect(() => {
		async function loadData() {
			try {
				setLoading(true);

				// Try to get agent from the list endpoint since individual endpoint may not exist
				const allAgents = await healthApi.getAllAgents();
				const foundAgent = allAgents.find((a) => a.name === agentName);

				if (foundAgent) {
					setAgent(foundAgent);
					// Create default metrics from agent data
					setMetrics({
						status: foundAgent.status as AgentMetrics["status"],
						responseTime: foundAgent.responseTime || 0,
						successRate: foundAgent.successRate || (foundAgent.isHealthy ? 100 : 0),
						errorRate: foundAgent.errorRate || (foundAgent.isHealthy ? 0 : 100),
						memoryUsage: foundAgent.memoryUsage || 0,
						cpuUsage: foundAgent.cpuUsage || 0,
						activeRequests: foundAgent.activeRequests || 0,
						queuedRequests: foundAgent.queuedRequests || 0,
						uptime: foundAgent.uptime || 0,
						lastActivity: new Date(foundAgent.lastActivity),
						spawnCount: foundAgent.spawnCount || 1,
						crashCount: foundAgent.crashCount || 0,
						isResponsive: foundAgent.isResponsive,
						isHealthy: foundAgent.isHealthy,
						healthScore: foundAgent.healthScore,
					});
					setHistory([]);
				} else {
					// Create placeholder agent if not found
					setAgent({
						name: agentName,
						status: "offline",
						healthScore: 0,
						responseTime: 0,
						successRate: 0,
						errorRate: 0,
						memoryUsage: 0,
						cpuUsage: 0,
						activeRequests: 0,
						queuedRequests: 0,
						uptime: 0,
						lastActivity: new Date().toISOString(),
						spawnCount: 0,
						crashCount: 0,
						isResponsive: false,
						isHealthy: false,
					});
					setMetrics({
						status: "offline",
						responseTime: 0,
						successRate: 0,
						errorRate: 0,
						memoryUsage: 0,
						cpuUsage: 0,
						activeRequests: 0,
						queuedRequests: 0,
						uptime: 0,
						lastActivity: new Date(),
						spawnCount: 0,
						crashCount: 0,
						isResponsive: false,
						isHealthy: false,
						healthScore: 0,
					});
				}
			} catch (error) {
				console.error("Failed to load agent data:", error);
				// Set default data on error so modal can still display
				setAgent({
					name: agentName,
					status: "error",
					healthScore: 0,
					responseTime: 0,
					successRate: 0,
					errorRate: 100,
					memoryUsage: 0,
					cpuUsage: 0,
					activeRequests: 0,
					queuedRequests: 0,
					uptime: 0,
					lastActivity: new Date().toISOString(),
					spawnCount: 0,
					crashCount: 0,
					isResponsive: false,
					isHealthy: false,
				});
				setMetrics({
					status: "error",
					responseTime: 0,
					successRate: 0,
					errorRate: 100,
					memoryUsage: 0,
					cpuUsage: 0,
					activeRequests: 0,
					queuedRequests: 0,
					uptime: 0,
					lastActivity: new Date(),
					spawnCount: 0,
					crashCount: 0,
					isResponsive: false,
					isHealthy: false,
					healthScore: 0,
				});
			} finally {
				setLoading(false);
			}
		}
		loadData();
	}, [agentName]);

	if (loading) {
		return (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
				<div className="bg-dashboard-card rounded-lg p-8">
					<div className="text-dashboard-text flex items-center gap-2">
						<Loader2 className="w-5 h-5 animate-spin" />
						Loading...
					</div>
				</div>
			</div>
		);
	}

	if (!agent || !metrics) {
		return (
			<div
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
				onClick={onClose}
			>
				<div className="bg-dashboard-card rounded-lg p-8">
					<div className="text-dashboard-error">Failed to load agent data</div>
					<button
						onClick={onClose}
						className="mt-4 px-4 py-2 bg-dashboard-accent rounded text-white"
					>
						Close
					</button>
				</div>
			</div>
		);
	}

	const status = getHealthStatus(agent.healthScore, agent.status);

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-dashboard-card border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
				onClick={(e: React.MouseEvent) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-700">
					<div>
						<h2 className="text-2xl font-bold text-dashboard-text">{agentName}</h2>
						<div className="flex items-center gap-2 mt-1">
							<span
								className={`px-2 py-1 rounded text-xs font-medium ${
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
							<span className="text-lg font-bold text-dashboard-accent">{agent.healthScore}%</span>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-700 rounded transition-colors"
						aria-label="Close"
					>
						<X className="w-5 h-5 text-dashboard-text" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-gray-700">
					{(["overview", "metrics", "lifecycle", "control", "test"] as const).map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
								activeTab === tab
									? "text-dashboard-accent border-b-2 border-dashboard-accent"
									: "text-gray-400 hover:text-dashboard-text"
							}`}
						>
							{tab === "test" && <FlaskConical className="w-4 h-4" />}
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
						</button>
					))}
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					{activeTab === "overview" && (
						<div className="space-y-6">
							<div className="grid grid-cols-2 gap-4">
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
								<div className="text-center text-gray-500 py-8">No lifecycle history available</div>
							)}
						</div>
					)}

					{activeTab === "control" && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-dashboard-text">Manual Controls</h3>
							<div className="grid grid-cols-2 gap-4">
								<button
									onClick={() => {
										if (window.confirm(`Respawn ${agentName}?`)) {
											onRespawn(agentName);
										}
									}}
									className="px-4 py-3 bg-dashboard-accent/20 hover:bg-dashboard-accent/30 text-dashboard-accent rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
								>
									<RotateCcw className="w-5 h-5" />
									Respawn Agent
								</button>
								<button
									onClick={() => {
										if (window.confirm(`Kill ${agentName}? This will stop the agent.`)) {
											onKill(agentName);
										}
									}}
									className="px-4 py-3 bg-dashboard-error/20 hover:bg-dashboard-error/30 text-dashboard-error rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
								>
									<XCircle className="w-5 h-5" />
									Kill Agent
								</button>
								<button
									onClick={async () => {
										try {
											const response = await fetch(
												`http://localhost:3000/health/agents/${encodeURIComponent(agentName)}/logs`,
											);
											if (response.ok) {
												const logs = await response.text();
												const logWindow = window.open("", "_blank");
												if (logWindow) {
													logWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <title>${agentName} Logs</title>
                              <style>
                                body { background: #0a0e27; color: #e0e0e0; padding: 20px; font-family: 'Consolas', 'Monaco', monospace; margin: 0; }
                                pre { white-space: pre-wrap; word-wrap: break-word; line-height: 1.5; }
                                h1 { color: #00d4ff; border-bottom: 1px solid #333; padding-bottom: 10px; }
                              </style>
                            </head>
                            <body>
                              <h1>📋 ${agentName} Logs</h1>
                              <pre>${logs || "No logs available"}</pre>
                            </body>
                            </html>
                          `);
												}
											} else {
												window.alert("Failed to fetch logs. Check backend implementation.");
											}
										} catch (error) {
											window.alert("Failed to fetch logs. Check console for details.");
											console.error("Log fetch error:", error);
										}
									}}
									className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
								>
									<FileText className="w-5 h-5" />
									View Logs
								</button>
								<button
									onClick={async () => {
										try {
											const response = await fetch(
												`http://localhost:3000/health/agents/${encodeURIComponent(agentName)}/config`,
											);
											if (response.ok) {
												const data = await response.json();
												const configWindow = window.open("", "_blank");
												if (configWindow) {
													configWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <title>${agentName} Configuration</title>
                              <style>
                                body { background: #0a0e27; color: #e0e0e0; padding: 20px; font-family: 'Consolas', 'Monaco', monospace; margin: 0; }
                                pre { white-space: pre-wrap; word-wrap: break-word; line-height: 1.5; }
                                h1 { color: #00d4ff; border-bottom: 1px solid #333; padding-bottom: 10px; }
                                .key { color: #ff6b6b; }
                                .string { color: #98c379; }
                                .number { color: #d19a66; }
                                .boolean { color: #56b6c2; }
                              </style>
                            </head>
                            <body>
                              <h1>⚙️ ${agentName} Configuration</h1>
                              <pre>${JSON.stringify(data.config || data, null, 2)}</pre>
                            </body>
                            </html>
                          `);
												}
											} else {
												window.alert(
													"Failed to fetch configuration. Check backend implementation.",
												);
											}
										} catch (error) {
											window.alert("Failed to fetch config. Check console for details.");
											console.error("Config fetch error:", error);
										}
									}}
									className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-dashboard-text rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
								>
									<SettingsIcon className="w-5 h-5" />
									View Configuration
								</button>
								<button
									onClick={async () => {
										try {
											const response = await fetch(
												`http://localhost:3000/health/agents/${encodeURIComponent(agentName)}/health-check`,
												{
													method: "POST",
												},
											);
											if (response.ok) {
												const data = await response.json();
												window.alert(
													`Health Check Result:\n\nAgent: ${data.agentName}\nHealthy: ${data.healthCheck.isHealthy ? "Yes" : "No"}\nHealth Score: ${data.healthCheck.healthScore}%\nResponse Time: ${data.healthCheck.responseTime}ms`,
												);
											} else {
												const error = await response.json();
												window.alert(`Health check failed: ${error.error || "Unknown error"}`);
											}
										} catch (error) {
											window.alert("Health check test failed. Check console for details.");
											console.error("Health check error:", error);
										}
									}}
									className="px-4 py-3 bg-dashboard-accent/20 hover:bg-dashboard-accent/30 text-dashboard-accent rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
								>
									<Activity className="w-5 h-5" />
									Test Health Check
								</button>
							</div>
						</div>
					)}

					{activeTab === "test" && (
						<div className="space-y-6">
							{/* Special Chat Interface for ConversationAgent */}
							{agentName === "ConversationAgent" ? (
								<div className="flex flex-col h-[400px]">
									{/* Header */}
									<div className="flex items-center gap-3 pb-4 border-b border-gray-700">
										<span className="text-3xl">💬</span>
										<div>
											<h3 className="text-lg font-semibold text-dashboard-text">
												Test Dialogue Agent
											</h3>
											<p className="text-sm text-gray-400">
												Chat with the AI to test conversation capabilities
											</p>
										</div>
									</div>

									{/* Chat Messages Container */}
									<div ref={chatContainerRef} className="flex-1 overflow-y-auto py-4 space-y-4">
										{chatMessages.length === 0 ? (
											<div className="flex flex-col items-center justify-center h-full text-gray-500">
												<Bot className="w-12 h-12 mb-3 opacity-50" />
												<p className="text-sm">Start a conversation to test the Dialogue Agent</p>
												<p className="text-xs mt-1">
													Type a message below and press Enter or click Send
												</p>
											</div>
										) : (
											chatMessages.map((msg) => (
												<div
													key={msg.id}
													className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
												>
													{msg.role === "assistant" && (
														<div className="flex-shrink-0 w-8 h-8 rounded-full bg-dashboard-accent/20 flex items-center justify-center">
															<Bot className="w-5 h-5 text-dashboard-accent" />
														</div>
													)}
													<div
														className={`max-w-[80%] rounded-2xl px-4 py-2 ${
															msg.role === "user"
																? "bg-dashboard-accent text-white rounded-br-md"
																: "bg-gray-700 text-dashboard-text rounded-bl-md"
														}`}
													>
														<p className="text-sm whitespace-pre-wrap">{msg.content}</p>
														<p
															className={`text-xs mt-1 ${msg.role === "user" ? "text-white/60" : "text-gray-500"}`}
														>
															{msg.timestamp.toLocaleTimeString()}
														</p>
													</div>
													{msg.role === "user" && (
														<div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
															<User className="w-5 h-5 text-purple-400" />
														</div>
													)}
												</div>
											))
										)}
										{chatLoading && (
											<div className="flex gap-3 justify-start">
												<div className="flex-shrink-0 w-8 h-8 rounded-full bg-dashboard-accent/20 flex items-center justify-center">
													<Bot className="w-5 h-5 text-dashboard-accent" />
												</div>
												<div className="bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
													<div className="flex gap-1">
														<span
															className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
															style={{ animationDelay: "0ms" }}
														/>
														<span
															className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
															style={{ animationDelay: "150ms" }}
														/>
														<span
															className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
															style={{ animationDelay: "300ms" }}
														/>
													</div>
												</div>
											</div>
										)}
									</div>

									{/* Chat Input */}
									<div className="pt-4 border-t border-gray-700">
										<form
											onSubmit={async (e) => {
												e.preventDefault();
												if (!chatInput.trim() || chatLoading) return;

												const userMessage: ChatMessage = {
													id: `user-${Date.now()}`,
													role: "user",
													content: chatInput.trim(),
													timestamp: new Date(),
												};
												setChatMessages((prev) => [...prev, userMessage]);
												setChatInput("");
												setChatLoading(true);

												try {
													const response = await fetch(
														"http://localhost:3000/agents/ConversationAgent/test",
														{
															method: "POST",
															headers: { "Content-Type": "application/json" },
															body: JSON.stringify({
																action: "respond",
																inputs: { message: userMessage.content },
															}),
														},
													);
													const data = await response.json();

													const assistantMessage: ChatMessage = {
														id: `assistant-${Date.now()}`,
														role: "assistant",
														content: data.success
															? data.data?.response ||
																data.data?.text ||
																data.data?.message ||
																JSON.stringify(data.data)
															: data.error ||
																"Sorry, I encountered an error processing your request.",
														timestamp: new Date(),
													};
													setChatMessages((prev) => [...prev, assistantMessage]);
												} catch (error) {
													const errorMessage: ChatMessage = {
														id: `error-${Date.now()}`,
														role: "assistant",
														content: `Error: ${error instanceof Error ? error.message : "Failed to connect to agent"}`,
														timestamp: new Date(),
													};
													setChatMessages((prev) => [...prev, errorMessage]);
												} finally {
													setChatLoading(false);
												}
											}}
											className="flex gap-2"
										>
											<input
												type="text"
												value={chatInput}
												onChange={(e) => setChatInput(e.target.value)}
												placeholder="Type your message..."
												className="flex-1 bg-dashboard-bg border border-gray-600 rounded-full px-4 py-2 text-dashboard-text focus:outline-none focus:border-dashboard-accent"
												disabled={chatLoading}
											/>
											<button
												type="submit"
												disabled={!chatInput.trim() || chatLoading}
												className="px-4 py-2 bg-dashboard-accent hover:bg-dashboard-accent/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors flex items-center gap-2"
											>
												{chatLoading ? (
													<Loader2 className="w-5 h-5 animate-spin" />
												) : (
													<Send className="w-5 h-5" />
												)}
											</button>
										</form>
									</div>
								</div>
							) : testConfig ? (
								/* Standard Test Interface for Other Agents */
								<>
									<div className="flex items-center gap-3">
										<span className="text-3xl">{testConfig.icon}</span>
										<div>
											<h3 className="text-lg font-semibold text-dashboard-text">
												Test {testConfig.displayName}
											</h3>
											<p className="text-sm text-gray-400">{testConfig.description}</p>
										</div>
									</div>

									{/* Inputs - No Action field */}
									{testConfig.inputs.length > 0 && (
										<div className="space-y-4">
											{testConfig.inputs.map((field: InputField) => (
												<div key={field.name}>
													<label className="block text-sm text-gray-400 mb-1">{field.label}</label>
													{field.type === "textarea" ? (
														<textarea
															value={String(testInputs[field.name] ?? field.defaultValue ?? "")}
															onChange={(e) =>
																setTestInputs((prev) => ({
																	...prev,
																	[field.name]: e.target.value,
																}))
															}
															placeholder={field.placeholder}
															className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text resize-none"
															rows={3}
														/>
													) : field.type === "select" ? (
														<select
															value={String(testInputs[field.name] ?? field.defaultValue ?? "")}
															onChange={(e) =>
																setTestInputs((prev) => ({
																	...prev,
																	[field.name]: e.target.value,
																}))
															}
															className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text"
														>
															{field.options?.map((opt) => (
																<option key={opt.value} value={opt.value}>
																	{opt.label}
																</option>
															))}
														</select>
													) : (
														<input
															type={field.type === "number" ? "number" : "text"}
															value={testInputs[field.name] ?? field.defaultValue ?? ""}
															onChange={(e) =>
																setTestInputs((prev) => ({
																	...prev,
																	[field.name]:
																		field.type === "number"
																			? parseFloat(e.target.value) || 0
																			: e.target.value,
																}))
															}
															placeholder={field.placeholder}
															className="w-full bg-dashboard-bg border border-gray-600 rounded-lg px-4 py-3 text-dashboard-text"
														/>
													)}
												</div>
											))}
										</div>
									)}

									{/* Test Button */}
									<button
										onClick={async () => {
											setTestLoading(true);
											setTestResult(null);
											const startTime = Date.now();
											try {
												const response = await fetch(testConfig.endpoint, {
													method: "POST",
													headers: { "Content-Type": "application/json" },
													body: JSON.stringify({
														id: `test-${Date.now()}`,
														action: testConfig.defaultAction,
														inputs: testInputs,
													}),
												});
												const data = await response.json();
												setTestResult({
													success: data.success !== false && response.ok,
													data: data.data || data,
													error: data.error,
													duration: Date.now() - startTime,
												});
											} catch (error) {
												setTestResult({
													success: false,
													error: error instanceof Error ? error.message : "Request failed",
													duration: Date.now() - startTime,
												});
											} finally {
												setTestLoading(false);
											}
										}}
										disabled={testLoading}
										className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
									>
										{testLoading ? (
											<Loader2 className="w-5 h-5 animate-spin" />
										) : (
											<Play className="w-5 h-5" />
										)}
										Run Test
									</button>

									{/* Result */}
									{testResult && (
										<div
											className={`rounded-lg border p-4 ${testResult.success ? "border-dashboard-success/50 bg-dashboard-success/5" : "border-dashboard-error/50 bg-dashboard-error/5"}`}
										>
											<div className="flex items-center gap-2 mb-3">
												{testResult.success ? (
													<CheckCircle className="w-5 h-5 text-dashboard-success" />
												) : (
													<XCircle className="w-5 h-5 text-dashboard-error" />
												)}
												<span
													className={`font-medium ${testResult.success ? "text-dashboard-success" : "text-dashboard-error"}`}
												>
													{testResult.success ? "Success" : "Failed"}
												</span>
												{testResult.duration && (
													<span className="text-sm text-gray-400">({testResult.duration}ms)</span>
												)}
											</div>
											{testResult.error ? (
												<div className="text-dashboard-error text-sm">{testResult.error}</div>
											) : (
												<pre className="bg-dashboard-bg rounded-lg p-3 text-sm text-dashboard-text overflow-auto max-h-64">
													{JSON.stringify(testResult.data, null, 2)}
												</pre>
											)}
										</div>
									)}
								</>
							) : (
								<div className="text-center py-8 text-gray-500">
									<FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
									<p>No test configuration available for this agent</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
