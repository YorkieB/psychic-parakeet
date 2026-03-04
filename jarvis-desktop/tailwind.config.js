/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/renderer/**/*.{js,jsx,ts,tsx}", "./index.html"],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				primary: {
					50: "#EFF6FF",
					100: "#DBEAFE",
					500: "#3B82F6",
					600: "#2563EB",
					700: "#1D4ED8",
				},
				secondary: {
					500: "#8B5CF6",
					600: "#7C3AED",
				},
			},
			animation: {
				spin: "spin 1s linear infinite",
				pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
				bounce: "bounce 1s infinite",
			},
		},
	},
	plugins: [],
};
