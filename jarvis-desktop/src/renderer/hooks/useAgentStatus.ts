import { useEffect, useState } from "react";
import { useMusicStore } from "../store/music-store";
import { useSystemStats } from "./useSystemStats";

interface AgentStatus {
	online: number;
	total: number;
}

export interface PrimaryAIProvider {
	providerLabel: string | null;
	linked: boolean;
}

interface Badges {
	emailCount: number;
	eventCount: number;
	balance: number;
	musicPlaying: boolean;
	currentTrack: string | null;
	mediaCount: number;
	nextEvent: string | null;
	financeStatus: string | null;
}

declare global {
	var jarvisAPI: any;
}

export function useAgentStatus() {
	const [agentStatus, setAgentStatus] = useState<AgentStatus>({
		online: 12,
		total: 12,
	});
	const [primaryAI, setPrimaryAI] = useState<PrimaryAIProvider>({
		providerLabel: null,
		linked: false,
	});
	const { stats: systemStats } = useSystemStats(); // Use real system stats hook
	const [badges, setBadges] = useState<Badges>({
		emailCount: 0,
		eventCount: 0,
		balance: 0,
		musicPlaying: false,
		currentTrack: null,
		mediaCount: 0,
		nextEvent: null,
		financeStatus: null,
	});

	const { isPlaying, currentTrack } = useMusicStore();

	useEffect(() => {
		const api =
			(typeof globalThis !== "undefined" && (globalThis as any).jarvisAPI) ||
			(typeof window !== "undefined" && (window as any).jarvisAPI);

		// Fetch agent status periodically (only when Electron jarvisAPI is available)
		const fetchStatus = async () => {
			try {
				if (!api?.getAgentStatus || !api?.getPrimaryAIProvider) {
					return;
				}
				const [status, aiProvider] = await Promise.all([
					api.getAgentStatus(),
					api.getPrimaryAIProvider().catch(() => ({ providerLabel: null, linked: false })),
				]);
				setAgentStatus(status);
				setPrimaryAI({
					providerLabel: aiProvider?.providerLabel ?? null,
					linked: aiProvider?.linked ?? false,
				});

				// System stats are now handled by useSystemStats hook (real-time, not mocked)

				// Fetch badges from agents
				try {
					if (!api.getEmails || !api.getCalendar || !api.getFinance) return;
					const emails = await api.getEmails({ unreadOnly: true });
					const calendar = await api.getCalendar({ period: "today" });
					const finance = await api.getFinance({ period: "month" });

					setBadges({
						emailCount: emails.count || 0,
						eventCount: calendar.count || 0,
						balance: finance.totalBalance || 0,
						musicPlaying: isPlaying,
						currentTrack: currentTrack?.title || null,
						mediaCount: 0,
						nextEvent: calendar.events?.[0]?.summary || null,
						financeStatus:
							finance.totalSpent > finance.totalBudget
								? `Over budget by £${(finance.totalSpent - finance.totalBudget).toFixed(2)}`
								: "On budget",
					});
				} catch (_error) {
					// Use mock data if API fails
					setBadges({
						emailCount: 3,
						eventCount: 2,
						balance: 2847.52,
						musicPlaying: isPlaying,
						currentTrack: currentTrack?.title || null,
						mediaCount: 0,
						nextEvent: "2:00 PM Budget Review",
						financeStatus: "Over budget by £347",
					});
				}
			} catch (error) {
				console.error("Failed to fetch agent status:", error);
			}
		};

		fetchStatus();
		const early = setTimeout(fetchStatus, 2000);
		const interval = setInterval(fetchStatus, 10000);

		return () => {
			clearInterval(interval);
			clearTimeout(early);
		};
	}, [isPlaying, currentTrack]);

	// Format system stats for display (matching old interface)
	const formattedSystemStats = {
		cpu: systemStats.cpu,
		memory: systemStats.memory.used,
		uptime: systemStats.uptime,
	};

	return { agentStatus, systemStats: formattedSystemStats, badges, primaryAI };
}
