/*
  This file creates an alert banner component that displays system warnings and critical agent status in Jarvis's dashboard.

  It shows critical agent alerts, offline notifications, and system health warnings while providing dismissible alerts for important system information.
*/

import { AlertCircle, X } from "lucide-react";
import React from "react";
import { useHealth } from "../contexts/HealthContext";

export function AlertBanner() {
	const { agents } = useHealth();
	const [dismissed, setDismissed] = React.useState(false);

	const criticalAgents = agents.filter((a) => a.healthScore < 70 && a.status !== "offline");
	const offlineAgents = agents.filter((a) => a.status === "offline" || a.status === "killed");

	if (dismissed || (criticalAgents.length === 0 && offlineAgents.length === 0)) {
		return null;
	}

	return (
		<div className="bg-dashboard-error/20 border-l-4 border-dashboard-error p-4 mb-6 rounded-r-lg">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-dashboard-error flex-shrink-0 mt-0.5" />
					<div>
						<h3 className="font-semibold text-dashboard-error mb-1">System Alerts</h3>
						{criticalAgents.length > 0 && (
							<p className="text-sm text-dashboard-text mb-1">
								{criticalAgents.length} agent(s) in critical state:{" "}
								{criticalAgents.map((a) => a.name).join(", ")}
							</p>
						)}
						{offlineAgents.length > 0 && (
							<p className="text-sm text-dashboard-text">
								{offlineAgents.length} agent(s) offline:{" "}
								{offlineAgents.map((a) => a.name).join(", ")}
							</p>
						)}
					</div>
				</div>
				<button
					onClick={() => setDismissed(true)}
					className="p-1 hover:bg-dashboard-error/20 rounded transition-colors"
					aria-label="Dismiss alert"
				>
					<X className="w-4 h-4 text-dashboard-error" />
				</button>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
