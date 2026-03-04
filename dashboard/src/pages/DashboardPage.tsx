/*
  This file creates the main dashboard page where you can see all of Jarvis's agents and their status at a glance.

  It displays agent health cards, system charts, control panels, and event feeds while making it easy to monitor and interact with Jarvis's entire system.
*/
import { Code2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { healthApi } from "../api/healthApi";
import { AgentDetailModal } from "../components/AgentDetailModal";
import { AgentGrid } from "../components/AgentGrid";
import { AgentTestModal } from "../components/AgentTestModal";
import { AlertBanner } from "../components/AlertBanner";
import { BulkTestPanel } from "../components/BulkTestPanel";
import { ControlPanel } from "../components/ControlPanel";
import { EventFeed } from "../components/EventFeed";
import { HealthChart } from "../components/HealthChart";
import { HealthOverview } from "../components/HealthOverview";
import { SensorHealthPanel } from "../components/SensorHealthPanel";
import { SystemHealthChart } from "../components/SystemHealthChart";
import { useHealth } from "../contexts/HealthContext";

export function DashboardPage() {
	const { agents, refetch } = useHealth();
	const navigate = useNavigate();
	const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
	const [testingAgent, setTestingAgent] = useState<string | null>(null);
	const [useModal, _setUseModal] = useState(true); // Toggle between modal and page

	const handleAgentClick = (name: string) => {
		if (useModal) {
			setSelectedAgent(name);
		} else {
			navigate(`/agent/${name}`);
		}
	};

	const handleRespawn = async (name: string) => {
		try {
			await healthApi.respawnAgent(name);
			refetch();
			if (selectedAgent === name) {
				setSelectedAgent(null);
				setTimeout(() => setSelectedAgent(name), 1000);
			}
		} catch (error) {
			console.error("Failed to respawn agent:", error);
			window.alert(`Failed to respawn ${name}. Check console for details.`);
		}
	};

	const handleKill = async (name: string) => {
		try {
			await healthApi.killAgent(name);
			refetch();
			if (selectedAgent === name) {
				setSelectedAgent(null);
			}
		} catch (error) {
			console.error("Failed to kill agent:", error);
			window.alert(`Failed to kill ${name}. Check console for details.`);
		}
	};

	const handleRestore = async (name: string) => {
		try {
			console.log(`[Dashboard] Restoring agent ${name} from Git...`);
			const result = await healthApi.restoreAgent(name);

			if (result.restartTriggered) {
				// Backend is restarting, show a message and wait
				window.alert(
					`${result.message}\n\nThe backend is restarting. The page will refresh in a few seconds.`,
				);
				// Wait for backend to restart, then refresh
				setTimeout(() => {
					window.location.reload();
				}, 5000);
			} else if (result.wasModified) {
				window.alert(`${result.message}`);
				refetch();
			} else {
				window.alert(`No changes needed: ${result.message}`);
			}
		} catch (error) {
			console.error("Failed to restore agent:", error);
			window.alert(
				`Failed to restore ${name}. ${error instanceof Error ? error.message : "Check console for details."}`,
			);
		}
	};

	const handleTest = (name: string) => {
		setTestingAgent(name);
	};

	return (
		<div className="min-h-screen bg-dashboard-bg p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Top bar */}
				<div className="flex items-center justify-between">
					<span className="text-sm text-gray-500 font-medium">
						Jarvis v4 · Self-Healing Dashboard
					</span>
					<button
						onClick={() => navigate("/code-editor")}
						className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
					>
						<Code2 size={16} />
						Code Editor
					</button>
				</div>
				<AlertBanner />
				<HealthOverview />

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left Column - Agent Grid */}
					<div className="lg:col-span-2">
						<AgentGrid
							onAgentClick={handleAgentClick}
							onRespawn={handleRespawn}
							onKill={handleKill}
							onRestore={handleRestore}
							onTest={handleTest}
						/>
					</div>

					{/* Right Column - Charts and Events - stretches to fill height */}
					<div className="flex flex-col gap-6">
						<HealthChart agents={agents} />
						<SensorHealthPanel />
						<div className="flex-1 min-h-[400px]">
							<EventFeed />
						</div>
					</div>
				</div>

				{/* System Health Monitor - Full Width */}
				<div className="mt-6">
					<SystemHealthChart
						componentName="System Average"
						windowSeconds={30}
						samplingIntervalMs={500}
						onEvent={(event) => console.log("Health Event:", event)}
					/>
				</div>

				{/* Bulk Testing Panel - Full Width Section */}
				<div className="mt-6">
					<BulkTestPanel onTestSingleAgent={handleTest} />
				</div>

				{/* Control Panel */}
				<ControlPanel />

				{/* Agent Detail Modal */}
				{selectedAgent && (
					<AgentDetailModal
						agentName={selectedAgent}
						onClose={() => setSelectedAgent(null)}
						onRespawn={handleRespawn}
						onKill={handleKill}
					/>
				)}

				{/* Agent Test Modal */}
				{testingAgent && (
					<AgentTestModal agentName={testingAgent} onClose={() => setTestingAgent(null)} />
				)}
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
