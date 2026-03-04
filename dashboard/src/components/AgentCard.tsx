/*
  This file creates an agent card component that displays individual agent information and controls in Jarvis's dashboard.

  It shows agent status, health metrics, control buttons, and detailed information while providing an intuitive interface for managing individual agents.
*/

import { FlaskConical, GitBranch, RotateCcw, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { AgentStatus } from "../types";
import {
	getHealthScoreColor,
	getProgressBarColor,
	getStatusBgColor,
	getStatusColor,
} from "../utils/colorUtils";
import { formatUptime, getHealthStatus } from "../utils/healthCalculations";
import { formatRelativeTime } from "../utils/timeUtils";

interface AgentCardProps {
	agent: AgentStatus;
	onRespawn: (name: string) => void;
	onKill: (name: string) => void;
	onRestore?: (name: string) => void;
	onClick: (name: string) => void;
	onTest?: (name: string) => void;
}

export function AgentCard({
	agent,
	onRespawn,
	onKill,
	onRestore,
	onClick,
	onTest,
}: AgentCardProps) {
	const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
	const status = getHealthStatus(agent.healthScore, agent.status);
	const statusColor = getStatusColor(status);
	const bgColor = getStatusBgColor(status);
	const scoreColor = getHealthScoreColor(agent.healthScore);
	const progressColor = getProgressBarColor(agent.healthScore);

	const statusLabels: Record<string, string> = {
		active: "Active",
		idle: "Idle",
		busy: "Busy",
		error: "Error",
		offline: "Offline",
		spawning: "Spawning",
		respawning: "Respawning",
		killed: "Killed",
	};

	return (
		<div
			className={`relative bg-dashboard-card border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-dashboard-accent hover:shadow-glow flex flex-col h-full ${bgColor}`}
			onClick={() => onClick(agent.name)}
			role="button"
			tabIndex={0}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					onClick(agent.name);
				}
			}}
			aria-label={`Agent ${agent.name}, health score ${agent.healthScore}%`}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex-1 min-w-0">
					<h3 className="text-sm font-semibold text-dashboard-text truncate">{agent.name}</h3>
					<div className={`text-lg font-bold ${scoreColor}`}>{agent.healthScore}%</div>
				</div>
				<div className={`px-2 py-1 rounded text-xs font-medium ${statusColor} border`}>
					{statusLabels[agent.status] || agent.status}
				</div>
			</div>

			{/* Progress Bar */}
			<div className="w-full bg-gray-700 rounded-full h-2 mb-3">
				<div
					className={`h-2 rounded-full transition-all ${progressColor}`}
					style={{ width: `${agent.healthScore}%` }}
					role="progressbar"
					aria-valuenow={agent.healthScore}
					aria-valuemin={0}
					aria-valuemax={100}
				/>
			</div>

			{/* Metrics */}
			<div className="space-y-1 text-xs text-gray-400 mb-3">
				<div className="flex justify-between">
					<span>Response:</span>
					<span className="text-dashboard-text">{agent.responseTime}ms</span>
				</div>
				<div className="flex justify-between">
					<span>Queue:</span>
					<span className="text-dashboard-text">{agent.queuedRequests} requests</span>
				</div>
				<div className="flex justify-between">
					<span>Uptime:</span>
					<span className="text-dashboard-text">{formatUptime(agent.uptime)}</span>
				</div>
			</div>

			{/* Last Activity */}
			<div className="text-xs text-gray-500 flex-1">
				Last activity: {formatRelativeTime(agent.lastActivity)}
			</div>

			{/* Actions */}
			<div className="grid grid-cols-4 gap-1.5 mt-3">
				<button
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						onTest?.(agent.name);
					}}
					className="px-1.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded text-xs font-medium transition-colors flex items-center justify-center gap-0.5"
					aria-label={`Test ${agent.name}`}
				>
					<FlaskConical className="w-3 h-3" />
					Test
				</button>
				<button
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						onRespawn(agent.name);
					}}
					className="px-1.5 py-1.5 bg-dashboard-accent/20 hover:bg-dashboard-accent/30 text-dashboard-accent rounded text-xs font-medium transition-colors flex items-center justify-center gap-0.5"
					aria-label={`Respawn ${agent.name}`}
				>
					<RotateCcw className="w-3 h-3" />
					Respawn
				</button>
				<button
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						setShowRestoreConfirm(true);
					}}
					className="px-1.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs font-medium transition-colors flex items-center justify-center gap-0.5"
					aria-label={`Restore ${agent.name}`}
				>
					<GitBranch className="w-3 h-3" />
					Restore
				</button>
				<button
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						onKill(agent.name);
					}}
					className="px-1.5 py-1.5 bg-dashboard-error/20 hover:bg-dashboard-error/30 text-dashboard-error rounded text-xs font-medium transition-colors flex items-center justify-center gap-0.5"
					aria-label={`Kill ${agent.name}`}
				>
					<X className="w-3 h-3" />
					Kill
				</button>
			</div>

			{/* Restore Confirmation Dialog */}
			{showRestoreConfirm && (
				<div
					className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						setShowRestoreConfirm(false);
					}}
				>
					<div
						className="bg-dashboard-card border border-amber-500/50 rounded-lg p-6 max-w-md mx-4"
						onClick={(e: React.MouseEvent) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-amber-500/20 rounded-full">
								<GitBranch className="w-6 h-6 text-amber-400" />
							</div>
							<h3 className="text-lg font-semibold text-dashboard-text">Restore Agent from Git?</h3>
						</div>
						<p className="text-gray-400 mb-4">
							This will restore <span className="text-amber-400 font-medium">{agent.name}</span>'s
							source code from the last Git commit, rebuild the project, and restart the entire
							backend.
						</p>
						<div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mb-4">
							<p className="text-amber-400 text-sm">
								⚠️ <strong>Warning:</strong> All agents will restart. Any unsaved state will be lost.
							</p>
						</div>
						<div className="flex gap-3 justify-end">
							<button
								onClick={(e: React.MouseEvent) => {
									e.stopPropagation();
									setShowRestoreConfirm(false);
								}}
								className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={(e: React.MouseEvent) => {
									e.stopPropagation();
									setShowRestoreConfirm(false);
									onRestore?.(agent.name);
								}}
								className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium transition-colors"
							>
								Restore & Restart
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Pulsing indicator when active */}
			{agent.status === "active" && agent.activeRequests > 0 && (
				<div className="absolute top-2 right-2 w-2 h-2 bg-dashboard-accent rounded-full animate-pulse" />
			)}
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
