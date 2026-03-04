/**
 * Real-time System Stats Hook
 * Uses actual system monitoring, not mocked data
 */

import { useEffect, useState } from "react";

interface SystemStats {
	cpu: number;
	memory: {
		used: number;
		total: number;
		free: number;
		percentage: number;
	};
	uptime: string;
	platform: string;
	hostname: string;
}

export function useSystemStats() {
	const [stats, setStats] = useState<SystemStats>({
		cpu: 0,
		memory: { used: 0, total: 0, free: 0, percentage: 0 },
		uptime: "0h 0m",
		platform: "unknown",
		hostname: "unknown",
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const api = (window as any).jarvisAPI;

		// Start sensor health reporting when component mounts (Electron only)
		const startReporting = async () => {
			try {
				if (api?.startSensorHealthReporting) {
					await api.startSensorHealthReporting(30000); // Report every 30 seconds
				}
			} catch (_error) {
				// Silently fail if not available
			}
		};
		startReporting();

		const fetchStats = async () => {
			try {
				if (!api?.getSystemStats) {
					setLoading(false);
					return;
				}
				const systemStats = await api.getSystemStats();
				setStats(systemStats);
				setLoading(false);
			} catch (error: any) {
				console.error("Failed to fetch system stats:", error);
				setLoading(false);
			}
		};

		// Fetch immediately
		fetchStats();

		// Update every 2 seconds for real-time monitoring (only if API exists)
		const interval = api?.getSystemStats ? setInterval(fetchStats, 2000) : undefined;

		return () => (interval !== undefined ? clearInterval(interval) : undefined);
	}, []);

	return { stats, loading };
}
