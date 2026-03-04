/**
 * Sensor Dashboard Component
 * Displays all real-time sensor data
 */

import { Battery, Camera, Clock, Cpu, HardDrive, Mic, Wifi } from "lucide-react";
import { useBattery } from "../../hooks/useBattery";
import { useCamera } from "../../hooks/useCamera";
import { useNetwork } from "../../hooks/useNetwork";
import { useSystemStats } from "../../hooks/useSystemStats";
import { useVoice } from "../../hooks/useVoice";

export function SensorDashboard() {
	const { stats: systemStats, loading: systemLoading } = useSystemStats();
	const battery = useBattery();
	const network = useNetwork();
	const { camera } = useCamera();
	const { isListening } = useVoice();

	const getNetworkColor = () => {
		switch (network.quality) {
			case "excellent":
				return "text-green-500";
			case "good":
				return "text-blue-500";
			case "fair":
				return "text-yellow-500";
			case "poor":
				return "text-orange-500";
			case "offline":
				return "text-red-500";
			default:
				return "text-gray-500";
		}
	};

	const getBatteryColor = () => {
		if (!battery.available) return "text-gray-500";
		if (battery.level > 0.5) return "text-green-500";
		if (battery.level > 0.2) return "text-yellow-500";
		return "text-red-500";
	};

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			{/* CPU */}
			<div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl border border-blue-500/20">
				<div className="flex items-center justify-between mb-2">
					<Cpu className="w-5 h-5 text-blue-500" />
					<span className="text-2xl font-bold text-blue-600">
						{systemLoading ? "..." : `${systemStats.cpu.toFixed(1)}%`}
					</span>
				</div>
				<p className="text-xs text-gray-600 dark:text-gray-400">CPU Usage</p>
				<div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
					<div
						className="h-full bg-blue-500 transition-all duration-300"
						style={{ width: `${systemStats.cpu}%` }}
					/>
				</div>
			</div>

			{/* Memory */}
			<div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl border border-purple-500/20">
				<div className="flex items-center justify-between mb-2">
					<HardDrive className="w-5 h-5 text-purple-500" />
					<span className="text-2xl font-bold text-purple-600">
						{systemLoading ? "..." : `${systemStats.memory.used.toFixed(1)}GB`}
					</span>
				</div>
				<p className="text-xs text-gray-600 dark:text-gray-400">
					{systemStats.memory.percentage.toFixed(1)}% of {systemStats.memory.total.toFixed(1)}GB
				</p>
				<div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
					<div
						className="h-full bg-purple-500 transition-all duration-300"
						style={{ width: `${systemStats.memory.percentage}%` }}
					/>
				</div>
			</div>

			{/* Uptime */}
			<div className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-600/10 rounded-xl border border-pink-500/20">
				<div className="flex items-center justify-between mb-2">
					<Clock className="w-5 h-5 text-pink-500" />
					<span className="text-2xl font-bold text-pink-600">
						{systemLoading ? "..." : systemStats.uptime}
					</span>
				</div>
				<p className="text-xs text-gray-600 dark:text-gray-400">System Uptime</p>
			</div>

			{/* Battery */}
			{battery.available && (
				<div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl border border-green-500/20">
					<div className="flex items-center justify-between mb-2">
						<Battery className={`w-5 h-5 ${getBatteryColor()}`} />
						<span className={`text-2xl font-bold ${getBatteryColor()}`}>
							{Math.round(battery.level * 100)}%
						</span>
					</div>
					<p className="text-xs text-gray-600 dark:text-gray-400">
						{battery.charging ? "Charging" : "Discharging"}
					</p>
					<div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
						<div
							className={`h-full transition-all duration-300 ${
								battery.level > 0.5
									? "bg-green-500"
									: battery.level > 0.2
										? "bg-yellow-500"
										: "bg-red-500"
							}`}
							style={{ width: `${battery.level * 100}%` }}
						/>
					</div>
				</div>
			)}

			{/* Network */}
			<div className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-xl border border-cyan-500/20">
				<div className="flex items-center justify-between mb-2">
					<Wifi className={`w-5 h-5 ${getNetworkColor()}`} />
					<span className={`text-2xl font-bold ${getNetworkColor()}`}>
						{network.online ? "●" : "○"}
					</span>
				</div>
				<p className="text-xs text-gray-600 dark:text-gray-400">
					{network.quality} {network.effectiveType && `(${network.effectiveType})`}
				</p>
				{network.downlink && <p className="text-xs text-gray-500 mt-1">{network.downlink} Mbps</p>}
			</div>

			{/* Camera */}
			<div className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl border border-orange-500/20">
				<div className="flex items-center justify-between mb-2">
					<Camera className="w-5 h-5 text-orange-500" />
					<span
						className={`text-2xl font-bold ${camera.active ? "text-green-500" : "text-gray-400"}`}
					>
						{camera.active ? "●" : "○"}
					</span>
				</div>
				<p className="text-xs text-gray-600 dark:text-gray-400">
					{camera.active ? "Active" : camera.available ? "Available" : "Not Available"}
				</p>
			</div>

			{/* Microphone */}
			<div className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-xl border border-red-500/20">
				<div className="flex items-center justify-between mb-2">
					<Mic className="w-5 h-5 text-red-500" />
					<span className={`text-2xl font-bold ${isListening ? "text-red-500" : "text-gray-400"}`}>
						{isListening ? "●" : "○"}
					</span>
				</div>
				<p className="text-xs text-gray-600 dark:text-gray-400">
					{isListening ? "Listening" : "Ready"}
				</p>
			</div>
		</div>
	);
}
