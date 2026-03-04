import {
	Activity,
	Brain,
	Calendar,
	Code,
	DollarSign,
	Globe,
	Mail,
	Music,
	Settings,
	User,
} from "lucide-react";
import { useAgentStatus } from "../../hooks/useAgentStatus";
import { usePanelStore } from "../../store/panel-store";

const menuItems = [
	{ id: "email", icon: Mail, label: "Email" },
	{ id: "calendar", icon: Calendar, label: "Calendar" },
	{ id: "finance", icon: DollarSign, label: "Finance" },
	{ id: "music", icon: Music, label: "Music" },
	{ id: "media", icon: Brain, label: "Media" },
	{ id: "code", icon: Code, label: "Code" },
	{ id: "web", icon: Globe, label: "Web" },
	{ id: "sensors", icon: Activity, label: "Sensors" },
	{ id: "settings", icon: Settings, label: "Settings" },
	{ id: "profile", icon: User, label: "Profile" },
];

export function MenuBar() {
	const { togglePanel, openPanels } = usePanelStore();
	const { badges } = useAgentStatus();

	const getIconGradient = (id: string) => {
		const gradients: Record<string, string> = {
			email: "from-blue-500 to-cyan-500",
			calendar: "from-green-500 to-emerald-500",
			finance: "from-purple-500 to-violet-500",
			music: "from-pink-500 to-rose-500",
			media: "from-orange-500 to-amber-500",
			code: "from-indigo-500 to-blue-500",
			web: "from-cyan-500 to-teal-500",
			sensors: "from-emerald-500 to-teal-500",
			settings: "from-slate-500 to-gray-600",
			profile: "from-blue-500 to-purple-600",
		};
		return gradients[id] || "from-blue-500 to-purple-600";
	};

	return (
		<div className="h-16 flex items-center justify-center space-x-2 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50">
			{menuItems.map((item) => {
				const Icon = item.icon;
				const isActive = openPanels.includes(item.id);

				// Map menu item IDs to badge properties
				const getBadgeValue = () => {
					switch (item.id) {
						case "email":
							return badges.emailCount > 0 ? badges.emailCount : null;
						case "calendar":
							return badges.eventCount > 0 ? badges.eventCount : null;
						case "finance":
							return badges.balance > 0 ? null : null; // Could show balance indicator
						case "music":
							return badges.musicPlaying ? "♪" : null;
						case "media":
							return badges.mediaCount > 0 ? badges.mediaCount : null;
						default:
							return null;
					}
				};

				const badgeValue = getBadgeValue();
				const gradient = getIconGradient(item.id);

				return (
					<button
						key={item.id}
						onClick={() => togglePanel(item.id)}
						className={`
              relative flex items-center space-x-2 px-5 py-2.5 rounded-xl
              transition-all duration-200 font-medium text-sm
              ${
								isActive
									? `bg-gradient-to-r ${gradient} text-white shadow-lg scale-105`
									: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:scale-105"
							}
            `}
					>
						<Icon className="w-5 h-5" />
						<span>{item.label}</span>

						{/* Vibrant Badge */}
						{badgeValue && (
							<span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
								{badgeValue}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
