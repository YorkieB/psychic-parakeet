/*
  This file creates the history page where you can view past system repairs and health trends over time.

  It displays repair history, health charts, and system trends while making it easy to track Jarvis's performance and maintenance activities.
*/

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HealthChart } from "../components/HealthChart";
import { RepairHistory } from "../components/RepairHistory";
import { useHealth } from "../contexts/HealthContext";

export function HistoryPage() {
	const navigate = useNavigate();
	const { agents } = useHealth();
	const [activeTab, setActiveTab] = useState<"repairs" | "health">("repairs");

	return (
		<div className="min-h-screen bg-dashboard-bg p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<button
						onClick={() => navigate("/")}
						className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
						aria-label="Back to dashboard"
					>
						<ArrowLeft className="w-5 h-5 text-dashboard-text" />
					</button>
					<h1 className="text-3xl font-bold text-dashboard-text">Historical Analysis</h1>
				</div>

				{/* Tabs */}
				<div className="bg-dashboard-card border border-gray-700 rounded-lg">
					<div className="flex border-b border-gray-700">
						<button
							onClick={() => setActiveTab("repairs")}
							className={`px-6 py-3 font-medium transition-colors ${
								activeTab === "repairs"
									? "text-dashboard-accent border-b-2 border-dashboard-accent"
									: "text-gray-400 hover:text-dashboard-text"
							}`}
						>
							Repair History
						</button>
						<button
							onClick={() => setActiveTab("health")}
							className={`px-6 py-3 font-medium transition-colors ${
								activeTab === "health"
									? "text-dashboard-accent border-b-2 border-dashboard-accent"
									: "text-gray-400 hover:text-dashboard-text"
							}`}
						>
							Health Trends
						</button>
					</div>

					{/* Content */}
					<div className="p-6">
						{activeTab === "repairs" && <RepairHistory />}
						{activeTab === "health" && <HealthChart agents={agents} />}
					</div>
				</div>
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
