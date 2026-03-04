import { useCallback, useEffect, useState } from "react";
import type { HealthDataPoint, HealthTimeSeries } from "../types";

export function useHealthHistory(agentName: string, timeRange: "6h" | "24h" | "7d" | "30d" = "6h") {
	const [history, setHistory] = useState<HealthTimeSeries[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchHistory = useCallback(async () => {
		try {
			setError(null);
			// TODO: Implement actual API endpoint for historical data
			// For now, generate mock data
			const now = new Date();
			const data: HealthDataPoint[] = [];
			const hours =
				timeRange === "6h" ? 6 : timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 720;

			for (let i = hours; i >= 0; i--) {
				data.push({
					timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
					healthScore: 85 + Math.random() * 15,
					agentName,
				});
			}

			setHistory([
				{
					agentName,
					data,
					color: "#00d4ff",
				},
			]);
			setLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch history");
			setLoading(false);
		}
	}, [agentName, timeRange]);

	useEffect(() => {
		fetchHistory();
	}, [fetchHistory]);

	return {
		history,
		loading,
		error,
		refetch: fetchHistory,
	};
}
