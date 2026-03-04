import { useCallback, useEffect, useState } from "react";
import { healthApi } from "../api/healthApi";
import type { AgentStatus } from "../types";

export function useAgentHealth(refreshInterval = 30000) {
	const [agents, setAgents] = useState<AgentStatus[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchAgents = useCallback(async () => {
		try {
			setError(null);
			const data = await healthApi.getAllAgents();
			setAgents(data);
			setLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch agents");
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchAgents();
		const interval = setInterval(fetchAgents, refreshInterval);
		return () => clearInterval(interval);
	}, [fetchAgents, refreshInterval]);

	const updateAgent = useCallback((agentName: string, updates: Partial<AgentStatus>) => {
		setAgents((prev: AgentStatus[]) =>
			prev.map((agent: AgentStatus) =>
				agent.name === agentName ? { ...agent, ...updates } : agent,
			),
		);
	}, []);

	return {
		agents,
		loading,
		error,
		refetch: fetchAgents,
		updateAgent,
	};
}
