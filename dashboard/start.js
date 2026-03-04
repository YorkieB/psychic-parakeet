// Dashboard startup script for PM2
import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use npm run dev which handles all the path issues
const vite = spawn("npm", ["run", "dev"], {
	cwd: __dirname,
	stdio: "inherit",
	shell: true,
	env: {
		...process.env,
		NODE_ENV: "development",
		PORT: "5173",
	},
});

vite.on("error", (error) => {
	console.error("Failed to start Vite:", error);
	process.exit(1);
});

vite.on("exit", (code) => {
	process.exit(code || 0);
});

process.on("SIGTERM", () => {
	vite.kill("SIGTERM");
});

process.on("SIGINT", () => {
	vite.kill("SIGINT");
});
