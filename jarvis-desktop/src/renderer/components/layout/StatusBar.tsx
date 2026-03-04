import { useAgentStatus } from "../../hooks/useAgentStatus";
import { useBattery } from "../../hooks/useBattery";
import { useNetwork } from "../../hooks/useNetwork";

export function StatusBar() {
	const { agentStatus, systemStats, primaryAI } = useAgentStatus();
	const battery = useBattery();
	const network = useNetwork();

	return (
		<div className="h-10 min-h-[2.5rem] flex-shrink-0 flex items-center justify-between px-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl border-t border-gray-200/50 dark:border-slate-700/50 text-xs font-medium">
			<div className="flex items-center space-x-6">
				<span className="flex items-center space-x-2">
					{agentStatus.online > 0 ? (
						<>
							<span className="relative flex h-2.5 w-2.5">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
							</span>
							<span className="text-gray-700 dark:text-gray-300 font-semibold">
								All systems operational
							</span>
						</>
					) : (
						<>
							<span className="relative flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
							<span className="text-amber-700 dark:text-amber-400 font-semibold">
								Backend offline — start Jarvis on port 3000 for chat & agents
							</span>
						</>
					)}
				</span>

				<span
					className={`px-3 py-1 rounded-full font-bold shadow-sm ${
						agentStatus.online > 0
							? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
							: "bg-amber-500/20 text-amber-800 dark:text-amber-200"
					}`}
				>
					{agentStatus.online}/{agentStatus.total} agents online
				</span>
				<span
					className={`px-2 py-1 rounded-full text-xs font-medium ${
						primaryAI.providerLabel
							? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
							: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
					}`}
				>
					LLM: {primaryAI.providerLabel ?? (agentStatus.online > 0 ? "…" : "Offline")}
				</span>
			</div>

			<div className="flex items-center space-x-6 text-gray-600 dark:text-gray-400">
				<span className="flex items-center space-x-1">
					<span className="font-semibold text-blue-600 dark:text-blue-400">CPU:</span>
					<span>{systemStats.cpu.toFixed(1)}%</span>
				</span>
				<span className="flex items-center space-x-1">
					<span className="font-semibold text-purple-600 dark:text-purple-400">RAM:</span>
					<span>{systemStats.memory.toFixed(1)}GB</span>
				</span>
				<span className="flex items-center space-x-1">
					<span className="font-semibold text-pink-600 dark:text-pink-400">Uptime:</span>
					<span>{systemStats.uptime}</span>
				</span>
				{battery.available && (
					<span className="flex items-center space-x-1">
						<span className="font-semibold text-green-600 dark:text-green-400">Battery:</span>
						<span>{Math.round(battery.level * 100)}%</span>
						{battery.charging && <span className="text-xs">⚡</span>}
					</span>
				)}
				<span className="flex items-center space-x-1">
					<span
						className={`font-semibold ${
							network.online
								? "text-green-600 dark:text-green-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						Network:
					</span>
					<span className={network.online ? "text-green-600" : "text-red-600"}>
						{network.online ? "●" : "○"} {network.quality}
					</span>
				</span>
			</div>
		</div>
	);
}
