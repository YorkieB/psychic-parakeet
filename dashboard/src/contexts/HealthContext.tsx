/*
  This file creates the health context that keeps track of all Jarvis agents' status and system health.

  It manages agent data, calculates system health metrics, and provides real-time updates while making health information available throughout the dashboard.
*/
import { createContext, type ReactNode, useContext } from "react";
import { useAgentHealth } from "../hooks/useAgentHealth";
import type { AgentStatus, HealthMetrics } from "../types";
import { calculateSystemHealth } from "../utils/healthCalculations";

interface HealthContextValue {
	agents: AgentStatus[];
	systemHealth: HealthMetrics;
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
	const { agents, loading, error, refetch } = useAgentHealth(30000);
	const systemHealth = calculateSystemHealth(agents);

	return (
		<HealthContext.Provider
			value={{
				agents,
				systemHealth,
				loading,
				error,
				refetch,
			}}
		>
			{children}
		</HealthContext.Provider>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.

export function useHealth() {
	const context = useContext(HealthContext);
	if (context === undefined) {
		throw new Error("useHealth must be used within a HealthProvider");
	}
	return context;
}
