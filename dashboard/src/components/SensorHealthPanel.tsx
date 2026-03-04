/*
  This file creates a sensor health panel component that displays hardware sensor status and metrics in Jarvis's dashboard.

  It shows sensor connectivity, health indicators, performance metrics, and system monitoring while providing comprehensive hardware health tracking and alerts.
*/
import { Activity, AlertTriangle, CheckCircle2, CircleOff, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { useSensorHealth } from "../hooks/useSensorHealth";
import type { SensorHealthReport } from "../types";

function getStatusBadgeClass(status: SensorHealthReport["status"]): string {
	if (status === "healthy") {
		return "bg-dashboard-success/20 text-dashboard-success border-dashboard-success/40";
	}
	if (status === "degraded") {
		return "bg-dashboard-warning/20 text-dashboard-warning border-dashboard-warning/40";
	}
	if (status === "error") {
		return "bg-dashboard-error/20 text-dashboard-error border-dashboard-error/40";
	}
	return "bg-gray-600/20 text-gray-300 border-gray-600/40";
}

function getStatusLabel(status: SensorHealthReport["status"]): string {
	if (status === "healthy") return "Healthy";
	if (status === "degraded") return "Degraded";
	if (status === "error") return "Error";
	return "Unavailable";
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString();
}

export function SensorHealthPanel() {
	const { sensors, loading, error, lastUpdated, refetch } = useSensorHealth(2000);
	const { events } = useWebSocketContext();

	let content: JSX.Element;
	if (loading && sensors.length === 0) {
		content = <div className="text-xs text-gray-400">Loading sensor data...</div>;
	} else if (sensors.length === 0) {
		content = (
			<div className="flex items-center gap-2 text-xs text-gray-400">
				<CircleOff className="w-4 h-4" />
				<span>No sensor reports received yet.</span>
			</div>
		);
	} else {
		content = (
			<div className="space-y-2 max-h-72 overflow-auto pr-1">
				{sensors.map((sensor) => (
					<div
						key={sensor.sensorName}
						className="rounded-lg border border-gray-700 bg-dashboard-bg/60 p-3"
					>
						<div className="flex items-start justify-between gap-2 mb-2">
							<div className="min-w-0">
								<div
									className="text-sm font-medium text-dashboard-text truncate"
									title={sensor.sensorName}
								>
									{sensor.sensorName}
								</div>
								<div className="text-xs text-gray-400">Updated {formatTime(sensor.timestamp)}</div>
							</div>
							<span
								className={`text-[11px] px-2 py-0.5 border rounded-full ${getStatusBadgeClass(sensor.status)}`}
							>
								{getStatusLabel(sensor.status)}
							</span>
						</div>

						<div className="text-xs text-gray-300 break-words">{sensor.message}</div>

						{sensor.status === "degraded" && (
							<div className="mt-2 flex items-center gap-1 text-xs text-dashboard-warning">
								<AlertTriangle className="w-3 h-3" />
								<span>Performance degraded</span>
							</div>
						)}

						{sensor.status === "healthy" && (
							<div className="mt-2 flex items-center gap-1 text-xs text-dashboard-success">
								<CheckCircle2 className="w-3 h-3" />
								<span>Operating normally</span>
							</div>
						)}
					</div>
				))}
			</div>
		);
	}

	useEffect(() => {
		if (events.length === 0) return;

		const timeout = setTimeout(() => {
			refetch();
		}, 300);

		return () => clearTimeout(timeout);
	}, [events.length, refetch]);

	return (
		<div className="bg-dashboard-card border border-gray-700/60 rounded-xl p-4 shadow-glow-sm">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Activity className="w-4 h-4 text-dashboard-accent" />
					<h3 className="text-sm font-semibold text-dashboard-text">Sensor Health (Real-Time)</h3>
				</div>
				<button
					onClick={refetch}
					className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
					title="Refresh sensors"
					aria-label="Refresh sensors"
				>
					<RefreshCw className="w-4 h-4 text-gray-300" />
				</button>
			</div>

			{error && (
				<div className="mb-3 text-xs text-dashboard-error bg-dashboard-error/10 border border-dashboard-error/30 rounded-md p-2">
					{error}
				</div>
			)}

			{content}

			<div className="mt-3 pt-2 border-t border-gray-700 text-[11px] text-gray-500">
				Last refresh: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
