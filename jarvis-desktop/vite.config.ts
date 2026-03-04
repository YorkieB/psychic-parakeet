import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	base: "./",
	build: {
		outDir: "dist/renderer",
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/renderer"),
		},
	},
	server: {
		port: Number(process.env.VITE_DEV_PORT) || 5173,
		strictPort: true,
	},
});
