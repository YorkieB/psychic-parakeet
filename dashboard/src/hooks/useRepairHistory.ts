import { useCallback, useEffect, useState } from "react";
import type { RepairEvent } from "../types";

export function useRepairHistory(agentName?: string) {
	const [repairs, setRepairs] = useState<RepairEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchRepairs = useCallback(async () => {
		try {
			setError(null);
			// TODO: Implement actual API endpoint for repair history
			// For now, return empty array
			setRepairs([]);
			setLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch repairs");
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchRepairs();
	}, [fetchRepairs]);

	return {
		repairs: agentName ? repairs.filter((r: RepairEvent) => r.agentName === agentName) : repairs,
		loading,
		error,
		refetch: fetchRepairs,
	};
}
