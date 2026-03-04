/*
  This file creates a repair history component that displays system repair events and maintenance logs in Jarvis's dashboard.

  It shows repair timelines, success rates, agent repair details, and filtering options while providing comprehensive system maintenance tracking and analysis.
*/

import { ChevronDown, ChevronRight, Download } from "lucide-react";
import React, { useState } from "react";
import { useRepairHistory } from "../hooks/useRepairHistory";
import type { RepairEvent } from "../types";
import { formatTimestamp } from "../utils/timeUtils";

export function RepairHistory() {
	const { repairs, loading } = useRepairHistory();
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
	const [sortBy, setSortBy] = useState<"time" | "agent" | "success">("time");
	const [filter, setFilter] = useState<string>("all");

	const toggleRow = (id: string) => {
		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		setExpandedRows(newExpanded);
	};

	const filteredAndSorted = repairs
		.filter(
			(repair: RepairEvent) =>
				filter === "all" ||
				(filter === "success" && repair.success) ||
				(filter === "failed" && !repair.success),
		)
		.sort((a: RepairEvent, b: RepairEvent) => {
			switch (sortBy) {
				case "time":
					return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
				case "agent":
					return a.agentName.localeCompare(b.agentName);
				case "success":
					return (b.success ? 1 : 0) - (a.success ? 1 : 0);
				default:
					return 0;
			}
		});

	const successRate =
		repairs.length > 0
			? ((repairs.filter((r: RepairEvent) => r.success).length / repairs.length) * 100).toFixed(1)
			: "0";

	// Calculate MTTR (Mean Time To Repair)
	const successfulRepairs = repairs.filter((r: RepairEvent) => r.success && r.downtime);
	const mttr =
		successfulRepairs.length > 0
			? (
					successfulRepairs.reduce((sum: number, r: RepairEvent) => sum + (r.downtime || 0), 0) /
					successfulRepairs.length /
					1000
				).toFixed(2)
			: "0";

	const handleExport = () => {
		const dataStr = JSON.stringify(filteredAndSorted, null, 2);
		const dataBlob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `jarvis-repair-history-${new Date().toISOString()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	if (loading) {
		return (
			<div className="bg-dashboard-card border border-gray-700 rounded-lg p-6">
				<div className="text-center text-gray-400">Loading repair history...</div>
			</div>
		);
	}

	return (
		<div className="bg-dashboard-card border border-gray-700 rounded-lg p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-lg font-semibold text-dashboard-text">Repair History</h2>
					<div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
						<span>
							Success Rate:{" "}
							<span className="text-dashboard-success font-medium">{successRate}%</span>
						</span>
						<span>
							MTTR: <span className="text-dashboard-accent font-medium">{mttr}s</span>
						</span>
					</div>
				</div>
				<div className="flex gap-2">
					<select
						value={filter}
						onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
						className="px-3 py-1.5 bg-dashboard-bg border border-gray-700 rounded text-dashboard-text text-sm focus:outline-none focus:border-dashboard-accent"
					>
						<option value="all">All Repairs</option>
						<option value="success">Successful</option>
						<option value="failed">Failed</option>
					</select>
					<select
						value={sortBy}
						onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
							setSortBy(e.target.value as "time" | "agent" | "success")
						}
						className="px-3 py-1.5 bg-dashboard-bg border border-gray-700 rounded text-dashboard-text text-sm focus:outline-none focus:border-dashboard-accent"
					>
						<option value="time">Sort by Time</option>
						<option value="agent">Sort by Agent</option>
						<option value="success">Sort by Success</option>
					</select>
					<button
						onClick={handleExport}
						className="p-1.5 hover:bg-gray-700 rounded transition-colors"
						aria-label="Export repair history"
					>
						<Download className="w-4 h-4 text-dashboard-text" />
					</button>
				</div>
			</div>

			{filteredAndSorted.length === 0 ? (
				<div className="text-center text-gray-500 py-8">No repair history available</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-700">
								<th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Time</th>
								<th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Agent</th>
								<th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Issue</th>
								<th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Strategy</th>
								<th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Downtime</th>
								<th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Success</th>
								<th className="text-left py-3 px-4 text-sm font-medium text-gray-400"></th>
							</tr>
						</thead>
						<tbody>
							{filteredAndSorted.map((repair: RepairEvent) => (
								<React.Fragment key={repair.id}>
									<tr
										className="border-b border-gray-700 hover:bg-dashboard-bg/50 cursor-pointer"
										onClick={() => toggleRow(repair.id)}
									>
										<td className="py-3 px-4 text-sm text-dashboard-text">
											{formatTimestamp(repair.timestamp)}
										</td>
										<td className="py-3 px-4 text-sm text-dashboard-text">{repair.agentName}</td>
										<td className="py-3 px-4 text-sm text-dashboard-text">
											{repair.issue || "N/A"}
										</td>
										<td className="py-3 px-4 text-sm text-dashboard-text">
											{repair.strategy || "N/A"}
										</td>
										<td className="py-3 px-4 text-sm text-dashboard-text">
											{repair.downtime ? `${(repair.downtime / 1000).toFixed(2)}s` : "N/A"}
										</td>
										<td className="py-3 px-4">
											<span
												className={`px-2 py-1 rounded text-xs font-medium ${
													repair.success
														? "bg-dashboard-success/20 text-dashboard-success"
														: "bg-dashboard-error/20 text-dashboard-error"
												}`}
											>
												{repair.success ? "Yes" : "No"}
											</span>
										</td>
										<td className="py-3 px-4">
											{expandedRows.has(repair.id) ? (
												<ChevronDown className="w-4 h-4 text-gray-400" />
											) : (
												<ChevronRight className="w-4 h-4 text-gray-400" />
											)}
										</td>
									</tr>
									{expandedRows.has(repair.id) && (
										<tr>
											<td colSpan={7} className="py-4 px-4 bg-dashboard-bg">
												<div className="space-y-2">
													{repair.rootCause && (
														<div>
															<div className="text-xs font-medium text-gray-400 mb-1">
																Root Cause:
															</div>
															<div className="text-sm text-dashboard-text">{repair.rootCause}</div>
														</div>
													)}
													{repair.details && Object.keys(repair.details).length > 0 && (
														<div>
															<div className="text-xs font-medium text-gray-400 mb-1">Details:</div>
															<pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto">
																{JSON.stringify(repair.details, null, 2)}
															</pre>
														</div>
													)}
												</div>
											</td>
										</tr>
									)}
								</React.Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
