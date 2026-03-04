import type { LucideIcon } from "lucide-react";

interface StatusCardProps {
	icon: LucideIcon;
	title: string;
	value: string;
	subtitle: string;
	color: string;
	onClick: () => void;
}

export function StatusCard({
	icon: Icon,
	title,
	value,
	subtitle,
	color,
	onClick,
}: StatusCardProps) {
	const gradients = {
		"bg-blue-500": "from-blue-500 to-blue-600",
		"bg-green-500": "from-green-500 to-emerald-600",
		"bg-purple-500": "from-purple-500 to-purple-600",
		"bg-pink-500": "from-pink-500 to-rose-600",
		"bg-orange-500": "from-orange-500 to-red-600",
	};

	const gradient = gradients[color as keyof typeof gradients] || "from-blue-500 to-purple-600";

	return (
		<button
			onClick={onClick}
			className="glass-card-vibrant rounded-2xl p-5 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 text-left border-0 group"
		>
			<div className="flex items-center space-x-3 mb-3">
				<div
					className={`bg-gradient-to-br ${gradient} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
				>
					<Icon className="w-6 h-6 text-white" />
				</div>
				<h4 className="font-bold text-gray-900 dark:text-white text-lg">{title}</h4>
			</div>

			<p
				className={`text-3xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-2`}
			>
				{value}
			</p>
			<p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-3">{subtitle}</p>

			<div className="flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
				<span>View details</span>
				<span className="ml-1 transform group-hover:translate-x-1 transition-transform">→</span>
			</div>
		</button>
	);
}
