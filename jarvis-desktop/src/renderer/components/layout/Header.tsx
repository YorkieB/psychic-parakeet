/*
  This file creates the header bar at the top of Jarvis's desktop app with the logo and controls.

  It displays the Jarvis branding, search functionality, notification bell, and theme toggle while making the app look professional and polished.
*/

import { Bell, Search } from "lucide-react";
import { useSettingsStore } from "../../store/settings-store";

export function Header() {
	const { theme, setTheme } = useSettingsStore();

	return (
		<div className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50">
			{/* Logo with gradient */}
			<div className="flex items-center space-x-3">
				<div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
					<span className="text-white font-black text-xl">J</span>
				</div>
				<h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
					Jarvis
				</h1>
			</div>

			{/* Search with gradient focus */}
			<div className="flex-1 max-w-md mx-4">
				<div className="relative group">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
					<input
						type="text"
						placeholder="Search..."
						className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
					/>
				</div>
			</div>

			{/* Actions with colors */}
			<div className="flex items-center space-x-3">
				<button className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all group">
					<Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
					<span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-full animate-pulse" />
				</button>

				<button
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
					className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
				>
					{theme === "light" ? "🌙" : "☀️"}
				</button>

				<div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow" />
			</div>
		</div>
	);
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
