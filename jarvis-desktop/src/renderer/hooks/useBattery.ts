/**
 * Real-time Battery Status Hook
 * Uses navigator.getBattery API for real battery information
 */

import { useEffect, useState } from "react";

// Helper to report battery health via IPC
const reportBatteryHealth = async (
	status: "healthy" | "degraded" | "error" | "unavailable",
	message: string,
	details?: any,
) => {
	try {
		if (typeof window !== "undefined" && (window as any).jarvisAPI?.reportSensorHealth) {
			await (window as any).jarvisAPI.reportSensorHealth("Battery", status, message, details);
		}
	} catch (_error) {
		// Silently fail if IPC not available
	}
};

interface BatteryInfo {
	level: number;
	charging: boolean;
	chargingTime: number | null;
	dischargingTime: number | null;
	available: boolean;
}

export function useBattery() {
	const [battery, setBattery] = useState<BatteryInfo>({
		level: 1.0,
		charging: false,
		chargingTime: null,
		dischargingTime: null,
		available: false,
	});

	useEffect(() => {
		// Check if Battery API is available
		if ("getBattery" in navigator) {
			(navigator as any)
				.getBattery()
				.then((batteryManager: any) => {
					const updateBattery = () => {
						const batteryData = {
							level: batteryManager.level,
							charging: batteryManager.charging,
							chargingTime: batteryManager.chargingTime,
							dischargingTime: batteryManager.dischargingTime,
							available: true,
						};

						setBattery(batteryData);

						// Report to Health API via IPC
						const levelPercent = Math.round(batteryData.level * 100);
						if (levelPercent < 10) {
							reportBatteryHealth(
								"error",
								`Battery is critically low at ${levelPercent}%. Please connect to power immediately.`,
								batteryData,
							);
						} else if (levelPercent < 20) {
							reportBatteryHealth(
								"degraded",
								`Battery is low at ${levelPercent}%. Consider connecting to power soon.`,
								batteryData,
							);
						} else {
							reportBatteryHealth(
								"healthy",
								`Battery level: ${levelPercent}%. ${batteryData.charging ? "Charging" : "Discharging"}.`,
								batteryData,
							);
						}
					};

					// Initial update
					updateBattery();

					// Listen for battery events
					batteryManager.addEventListener("chargingchange", updateBattery);
					batteryManager.addEventListener("levelchange", updateBattery);
					batteryManager.addEventListener("chargingtimechange", updateBattery);
					batteryManager.addEventListener("dischargingtimechange", updateBattery);

					return () => {
						batteryManager.removeEventListener("chargingchange", updateBattery);
						batteryManager.removeEventListener("levelchange", updateBattery);
						batteryManager.removeEventListener("chargingtimechange", updateBattery);
						batteryManager.removeEventListener("dischargingtimechange", updateBattery);
					};
				})
				.catch((error: any) => {
					console.warn("Battery API not available:", error);
					setBattery({
						level: 0,
						charging: false,
						chargingTime: null,
						dischargingTime: null,
						available: false,
					});

					// Report to Health API via IPC
					reportBatteryHealth(
						"unavailable",
						"Battery information is not available on this device. This is normal for desktop computers.",
						{ error: error.message },
					);
				});
		} else {
			// Battery API not supported
			setBattery({
				level: 0,
				charging: false,
				chargingTime: null,
				dischargingTime: null,
				available: false,
			});

			// Report to Health API via IPC
			reportBatteryHealth(
				"unavailable",
				"Battery information is not supported on this device. This is normal for desktop computers.",
				{},
			);
		}
	}, []);

	return battery;
}
