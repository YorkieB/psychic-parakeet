/**
 * Real-time Network Status Hook
 * Monitors network connectivity and quality
 */

import { useEffect, useState } from "react";

interface NetworkInfo {
	online: boolean;
	type: string;
	downlink: number | null;
	effectiveType: string | null;
	rtt: number | null;
	quality: "excellent" | "good" | "fair" | "poor" | "offline";
}

// Helper to report network health via IPC
const reportNetworkHealth = async (
	status: "healthy" | "degraded" | "error" | "unavailable",
	message: string,
	details?: any,
) => {
	try {
		if (typeof window !== "undefined" && (window as any).jarvisAPI?.reportSensorHealth) {
			await (window as any).jarvisAPI.reportSensorHealth("Network", status, message, details);
		}
	} catch (_error) {
		// Silently fail if IPC not available
	}
};

export function useNetwork() {
	const [network, setNetwork] = useState<NetworkInfo>({
		online: navigator.onLine,
		type: "unknown",
		downlink: null,
		effectiveType: null,
		rtt: null,
		quality: navigator.onLine ? "good" : "offline",
	});

	useEffect(() => {
		const updateNetwork = async () => {
			const online = navigator.onLine;

			// Get connection info if available (Chrome/Edge)
			const connection =
				(navigator as any).connection ||
				(navigator as any).mozConnection ||
				(navigator as any).webkitConnection;

			let networkInfo: NetworkInfo = {
				online,
				type: connection?.type || "unknown",
				downlink: connection?.downlink || null,
				effectiveType: connection?.effectiveType || null,
				rtt: connection?.rtt || null,
				quality: "good",
			};

			// Determine quality based on effectiveType
			if (connection?.effectiveType) {
				switch (connection.effectiveType) {
					case "4g":
						networkInfo.quality = "excellent";
						break;
					case "3g":
						networkInfo.quality = "good";
						break;
					case "2g":
						networkInfo.quality = "fair";
						break;
					case "slow-2g":
						networkInfo.quality = "poor";
						break;
					default:
						networkInfo.quality = "good";
				}
			} else if (!online) {
				networkInfo.quality = "offline";
			}

			// Try to get network info from Electron main process (only when jarvisAPI exists)
			try {
				const api = (window as any).jarvisAPI;
				if (api?.getNetwork) {
					const electronNetwork = await api.getNetwork();
					networkInfo = { ...networkInfo, ...electronNetwork };
				}
			} catch (_error) {
				// Fallback to browser API
			}

			setNetwork(networkInfo);

			// Report to Health API via IPC
			const reportStatus = networkInfo.online
				? networkInfo.quality === "poor"
					? "degraded"
					: "healthy"
				: "error";

			const reportMessage = networkInfo.online
				? `Network connection active. Quality: ${networkInfo.quality}${networkInfo.effectiveType ? ` (${networkInfo.effectiveType})` : ""}.`
				: "No network connection. Check your internet connection and network cables.";

			reportNetworkHealth(reportStatus, reportMessage, networkInfo);
		};

		// Initial update
		updateNetwork();

		// Listen for online/offline events
		window.addEventListener("online", updateNetwork);
		window.addEventListener("offline", updateNetwork);

		// Listen for connection changes (if available)
		const connection =
			(navigator as any).connection ||
			(navigator as any).mozConnection ||
			(navigator as any).webkitConnection;

		if (connection) {
			connection.addEventListener("change", updateNetwork);
		}

		// Update every 5 seconds
		const interval = setInterval(updateNetwork, 5000);

		return () => {
			window.removeEventListener("online", updateNetwork);
			window.removeEventListener("offline", updateNetwork);
			if (connection) {
				connection.removeEventListener("change", updateNetwork);
			}
			clearInterval(interval);
		};
	}, []);

	return network;
}
