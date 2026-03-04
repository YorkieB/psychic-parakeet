/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
			},
			colors: {
				dashboard: {
					bg: "#0a0e27",
					card: "#141b2d",
					text: "#e0e0e0",
					accent: "#00d4ff",
					success: "#00ff88",
					warning: "#ffaa00",
					error: "#ff4444",
				},
			},
			boxShadow: {
				glow: "0 0 20px -5px rgba(0, 212, 255, 0.25)",
				"glow-sm": "0 0 12px -4px rgba(0, 212, 255, 0.2)",
			},
			animation: {
				"pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
				flash: "flash 0.5s ease-in-out",
			},
			keyframes: {
				flash: {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.5" },
				},
			},
		},
	},
	plugins: [],
};
