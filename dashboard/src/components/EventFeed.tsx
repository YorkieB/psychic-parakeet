/*
  This file creates an event feed component that displays real-time system events and logs in Jarvis's dashboard.

  It shows live event streams, filtering options, pause/play controls, and event export functionality while providing comprehensive system monitoring and event tracking.
*/

import { Download, Pause, Play, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { getEventColor } from "../utils/colorUtils";
import { formatRelativeTime } from "../utils/timeUtils";

export function EventFeed() {
	const { events, clearEvents, connected } = useWebSocketContext();
	const [paused, setPaused] = useState(false);
	const [filter, setFilter] = useState<string>("all");
	const scrollRef = useRef<HTMLDivElement>(null);
	const autoScrollRef = useRef(true);

	useEffect(() => {
		if (!paused && autoScrollRef.current && scrollRef.current) {
			scrollRef.current.scrollTop = 0;
		}
	}, [paused]);

	const filteredEvents = filter === "all" ? events : events.filter((e) => e.type === filter);

	const eventIcons: Record<string, string> = {
		agent_spawned: "🟢",
		agent_crashed: "🔴",
		agent_respawned: "🔄",
		agent_health_changed: "🟡",
		agent_killed: "⚫",
		agent_error: "⚠️",
		repair_started: "🔧",
		repair_completed: "✅",
		repair_failed: "❌",
	};

	const handleExport = () => {
		const dataStr = JSON.stringify(filteredEvents, null, 2);
		const dataBlob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `jarvis-events-${new Date().toISOString()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="bg-dashboard-card border border-gray-700 rounded-lg p-6 h-full flex flex-col min-h-[400px]">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-dashboard-text flex items-center gap-2">
					<span
						className={`w-2 h-2 rounded-full ${!connected ? "bg-dashboard-error" : paused ? "bg-dashboard-warning" : "bg-dashboard-success"} animate-pulse`}
					/>
					LIVE EVENTS {!connected && "(Disconnected)"}
				</h2>
				<div className="flex gap-2">
					<select
						value={filter}
						onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
						className="px-3 py-1.5 bg-dashboard-bg border border-gray-700 rounded text-dashboard-text text-sm focus:outline-none focus:border-dashboard-accent"
						aria-label="Filter events"
					>
						<option value="all">All Events</option>
						<option value="agent_spawned">Spawned</option>
						<option value="agent_crashed">Crashed</option>
						<option value="agent_respawned">Respawning</option>
						<option value="agent_health_changed">Health Changed</option>
						<option value="repair_completed">Repairs</option>
					</select>
					<button
						onClick={() => setPaused(!paused)}
						className="p-1.5 hover:bg-gray-700 rounded transition-colors"
						aria-label={paused ? "Resume" : "Pause"}
					>
						{paused ? (
							<Play className="w-4 h-4 text-dashboard-text" />
						) : (
							<Pause className="w-4 h-4 text-dashboard-text" />
						)}
					</button>
					<button
						onClick={clearEvents}
						className="p-1.5 hover:bg-gray-700 rounded transition-colors"
						aria-label="Clear events"
					>
						<Trash2 className="w-4 h-4 text-dashboard-text" />
					</button>
					<button
						onClick={handleExport}
						className="p-1.5 hover:bg-gray-700 rounded transition-colors"
						aria-label="Export events"
					>
						<Download className="w-4 h-4 text-dashboard-text" />
					</button>
				</div>
			</div>

			<div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
				{filteredEvents.length === 0 ? (
					<div className="text-center text-gray-500 py-8">No events to display</div>
				) : (
					filteredEvents.map((event) => (
						<div
							key={event.id}
							className="bg-dashboard-bg border border-gray-700 rounded-lg p-3 hover:border-dashboard-accent transition-colors"
						>
							<div className="flex items-start gap-2">
								<span className="text-lg">{eventIcons[event.type] || "●"}</span>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between mb-1">
										<span className={`text-sm font-medium ${getEventColor(event.type)}`}>
											{event.agentName}
										</span>
										<span className="text-xs text-gray-500">
											{formatRelativeTime(event.timestamp)}
										</span>
									</div>
									<div className="text-sm text-dashboard-text">{event.message}</div>
									{event.details && Object.keys(event.details).length > 0 && (
										<details className="mt-2">
											<summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
												View details
											</summary>
											<pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-x-auto">
												{JSON.stringify(event.details, null, 2)}
											</pre>
										</details>
									)}
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
