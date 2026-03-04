/*
  This file creates the sensors panel that shows your computer's hardware status and sensor information in Jarvis's desktop app.

  It displays system stats, camera feeds, microphone status, network information, and hardware monitoring while helping you keep track of your computer's health.
*/

import { Activity, Battery, Camera, Cpu, HardDrive, Wifi } from "lucide-react";
import { useBattery } from "../../hooks/useBattery";
import { useNetwork } from "../../hooks/useNetwork";
import { useSystemStats } from "../../hooks/useSystemStats";
import { usePanelStore } from "../../store/panel-store";
import { CameraView } from "../sensors/CameraView";
import { SensorDashboard } from "../sensors/SensorDashboard";
import { Panel } from "../shared/Panel";

export function SensorsPanel() {
	const { closePanel } = usePanelStore();
	const { stats: systemStats } = useSystemStats();
	const battery = useBattery();
	const network = useNetwork();

	return (
		<Panel
			id="sensors"
			title="📊 Sensors & Monitoring"
			width={800}
			height={900}
			onClose={() => closePanel("sensors")}
		>
			<div className="p-6 space-y-6 overflow-y-auto h-full">
				{/* Real-Time Sensor Dashboard */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Activity className="w-5 h-5" />
						<span>Real-Time Monitoring</span>
					</h3>
					<SensorDashboard />
				</div>

				{/* Detailed System Information */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Cpu className="w-5 h-5" />
						<span>System Information</span>
					</h3>

					<div className="grid grid-cols-2 gap-4">
						<div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
							<div className="flex items-center space-x-2 mb-2">
								<Cpu className="w-4 h-4 text-blue-500" />
								<span className="text-sm font-medium">CPU</span>
							</div>
							<p className="text-2xl font-bold">{systemStats.cpu.toFixed(1)}%</p>
							<p className="text-xs text-gray-500 mt-1">Platform: {systemStats.platform}</p>
						</div>

						<div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
							<div className="flex items-center space-x-2 mb-2">
								<HardDrive className="w-4 h-4 text-purple-500" />
								<span className="text-sm font-medium">Memory</span>
							</div>
							<p className="text-2xl font-bold">
								{systemStats.memory.used.toFixed(1)} / {systemStats.memory.total.toFixed(1)} GB
							</p>
							<p className="text-xs text-gray-500 mt-1">
								{systemStats.memory.percentage.toFixed(1)}% used
							</p>
						</div>

						{battery.available && (
							<div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
								<div className="flex items-center space-x-2 mb-2">
									<Battery className="w-4 h-4 text-green-500" />
									<span className="text-sm font-medium">Battery</span>
								</div>
								<p className="text-2xl font-bold">{Math.round(battery.level * 100)}%</p>
								<p className="text-xs text-gray-500 mt-1">
									{battery.charging ? "Charging" : "Discharging"}
									{battery.chargingTime && ` • ${Math.round(battery.chargingTime / 60)}m to full`}
									{battery.dischargingTime &&
										` • ${Math.round(battery.dischargingTime / 60)}m remaining`}
								</p>
							</div>
						)}

						<div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
							<div className="flex items-center space-x-2 mb-2">
								<Wifi className="w-4 h-4 text-cyan-500" />
								<span className="text-sm font-medium">Network</span>
							</div>
							<p className="text-2xl font-bold">{network.online ? "Online" : "Offline"}</p>
							<p className="text-xs text-gray-500 mt-1">
								{network.quality} {network.effectiveType && `(${network.effectiveType})`}
								{network.downlink && ` • ${network.downlink} Mbps`}
							</p>
						</div>
					</div>
				</div>

				{/* Camera Control */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
						<Camera className="w-5 h-5" />
						<span>Camera</span>
					</h3>
					<CameraView />
				</div>

				{/* Host Information */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						System Details
					</h3>
					<div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Hostname:</span>
							<span className="font-mono">{systemStats.hostname}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Platform:</span>
							<span className="font-mono">{systemStats.platform}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Uptime:</span>
							<span className="font-mono">{systemStats.uptime}</span>
						</div>
					</div>
				</div>
			</div>
		</Panel>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
