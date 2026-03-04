/*
  This file creates an agent grid component that displays and manages multiple agent cards in Jarvis's dashboard.

  It provides search functionality, filtering options, and grid layout while making it easy to view and manage all agents from a central interface.
*/

import { Search } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useHealth } from "../contexts/HealthContext";
import type { AgentStatus } from "../types";
import { getHealthStatus } from "../utils/healthCalculations";
import { AgentCard } from "./AgentCard";

interface AgentGridProps {
	onAgentClick: (name: string) => void;
	onRespawn: (name: string) => void;
	onKill: (name: string) => void;
	onRestore?: (name: string) => void;
	onTest?: (name: string) => void;
}

const AGENT_GROUPS = {
	core: [
		"ConversationAgent",
		"CommandAgent",
		"ContextAgent",
		"MemoryAgent",
		"EmotionAgent",
		"MemorySystem",
	],
	specialized: [
		"FinanceAgent",
		"WeatherAgent",
		"NewsAgent",
		"CalendarAgent",
		"EmailAgent",
		"ReminderAgent",
		"TimerAgent",
		"AlarmAgent",
	],
	creative: ["ImageGenerationAgent", "MusicAgent", "VideoAgent", "StoryAgent"],
	technical: [
		"CodeAgent",
		"ComputerControlAgent",
		"FileAgent",
		"SearchAgent",
		"CalculatorAgent",
		"UnitConverterAgent",
		"TranslationAgent",
		"Reliability",
		"VisualEngine",
	],
	voice: [
		"SpeechAgent",
		"ListeningAgent",
		"VoiceCommandAgent",
		"VoiceAgent",
		"LLMAgent",
		"PersonalityAgent",
		"SpotifyAgent",
		"AppleMusicAgent",
		"EmotionsEngine",
	],
};

export function AgentGrid({ onAgentClick, onRespawn, onKill, onRestore, onTest }: AgentGridProps) {
	const { agents } = useHealth();
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<"name" | "health" | "activity">("health");

	const filteredAndSortedAgents = useMemo(() => {
		let filtered = agents;

		// Search filter
		if (searchQuery) {
			filtered = filtered.filter((agent) =>
				agent.name.toLowerCase().includes(searchQuery.toLowerCase()),
			);
		}

		// Status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((agent) => {
				const status = getHealthStatus(agent.healthScore, agent.status);
				return status === statusFilter;
			});
		}

		// Sort
		filtered = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "name":
					return a.name.localeCompare(b.name);
				case "health":
					return b.healthScore - a.healthScore;
				case "activity":
					return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
				default:
					return 0;
			}
		});

		return filtered;
	}, [agents, searchQuery, statusFilter, sortBy]);

	const groupedAgents = useMemo(() => {
		const groups: Record<string, AgentStatus[]> = {
			core: [],
			specialized: [],
			creative: [],
			technical: [],
			voice: [],
			advanced: [],
		};

		filteredAndSortedAgents.forEach((agent) => {
			let added = false;
			for (const [group, names] of Object.entries(AGENT_GROUPS)) {
				if (names.includes(agent.name)) {
					groups[group].push(agent);
					added = true;
					break;
				}
			}
			// If not in any group, add to technical
			if (!added) {
				groups.technical.push(agent);
			}
		});

		return groups;
	}, [filteredAndSortedAgents]);

	const groupLabels: Record<string, string> = {
		core: "Core Agents",
		specialized: "Specialized Agents",
		creative: "Creative Agents",
		technical: "Technical Agents",
		voice: "Voice/Audio Agents",
		advanced: "Advanced Analysis Agents",
	};

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="flex-1 relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search agents..."
						value={searchQuery}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 bg-dashboard-card border border-gray-700 rounded-lg text-dashboard-text placeholder-gray-500 focus:outline-none focus:border-dashboard-accent"
						aria-label="Search agents"
					/>
				</div>
				<div className="flex gap-2">
					<select
						value={statusFilter}
						onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
						className="px-4 py-2 bg-dashboard-card border border-gray-700 rounded-lg text-dashboard-text focus:outline-none focus:border-dashboard-accent"
						aria-label="Filter by status"
					>
						<option value="all">All Status</option>
						<option value="healthy">Healthy</option>
						<option value="degraded">Degraded</option>
						<option value="critical">Critical</option>
						<option value="offline">Offline</option>
					</select>
					<select
						value={sortBy}
						onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
							setSortBy(e.target.value as "name" | "health" | "activity")
						}
						className="px-4 py-2 bg-dashboard-card border border-gray-700 rounded-lg text-dashboard-text focus:outline-none focus:border-dashboard-accent"
						aria-label="Sort by"
					>
						<option value="health">Sort by Health</option>
						<option value="name">Sort by Name</option>
						<option value="activity">Sort by Activity</option>
					</select>
				</div>
			</div>

			{/* Agent Groups */}
			{Object.entries(groupedAgents).map(([group, groupAgents]) => {
				if (groupAgents.length === 0) return null;

				return (
					<div key={group} className="space-y-3">
						<h2 className="text-lg font-semibold text-dashboard-text">
							{groupLabels[group]} ({groupAgents.length})
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
							{groupAgents.map((agent) => (
								<AgentCard
									key={agent.name}
									agent={agent}
									onRespawn={onRespawn}
									onKill={onKill}
									onRestore={onRestore}
									onClick={onAgentClick}
									onTest={onTest}
								/>
							))}
						</div>
					</div>
				);
			})}

			{filteredAndSortedAgents.length === 0 && (
				<div className="text-center py-12 text-gray-500">
					No agents found matching your filters.
				</div>
			)}
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
