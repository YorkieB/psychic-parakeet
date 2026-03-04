import { useCallback, useEffect, useState } from "react";
import { healthApi } from "../api/healthApi";
import type { SensorHealthReport } from "../types";

export function useSensorHealth(refreshInterval = 2000) {
	const [sensors, setSensors] = useState<SensorHealthReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);

	const fetchSensors = useCallback(async () => {
		try {
			setError(null);
			const reports = await healthApi.getSensorReports();
			setSensors(reports);
			setLastUpdated(Date.now());
			setLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch sensor health");
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSensors();
		const interval = setInterval(fetchSensors, refreshInterval);
		return () => clearInterval(interval);
	}, [fetchSensors, refreshInterval]);

	return {
		sensors,
		loading,
		error,
		lastUpdated,
		refetch: fetchSensors,
	};
}
