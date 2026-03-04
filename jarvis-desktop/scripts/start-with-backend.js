const { spawn } = require("node:child_process");
const axios = require("axios");
const path = require("node:path");

const BACKEND_URL = "http://localhost:3000";
const MAX_WAIT_TIME = 30000; // 30 seconds max
const CHECK_INTERVAL = 500; // Check every 500ms

async function checkBackendReady() {
	try {
		const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 1000 });
		return response.status === 200;
	} catch (_err) {
		return false;
	}
}

async function waitForBackend() {
	console.log("⏳ Waiting for backend to be ready...");
	const startTime = Date.now();

	while (Date.now() - startTime < MAX_WAIT_TIME) {
		if (await checkBackendReady()) {
			console.log("✅ Backend is ready!");
			return true;
		}

		process.stdout.write(".");
		await new Promise((r) => setTimeout(r, CHECK_INTERVAL));
	}

	console.log("\n❌ Backend failed to start within 30 seconds");
	return false;
}

async function startElectron() {
	const electronPath = require("electron");
	const appPath = path.join(__dirname, "..");

	const electron = spawn(electronPath, [appPath], {
		stdio: "inherit",
		shell: true,
	});

	electron.on("close", (code) => {
		process.exit(code);
	});

	return electron;
}

async function main() {
	console.log("🚀 Starting Jarvis Desktop App...\n");

	// Check if backend is already running
	if (await checkBackendReady()) {
		console.log("✅ Backend is already running\n");
	} else {
		console.log("⚠️  Backend not detected. Please start it first:");
		console.log("   cd .. && npm start\n");

		// Optionally wait for it
		const shouldWait = process.argv.includes("--wait");
		if (shouldWait) {
			const ready = await waitForBackend();
			if (!ready) {
				console.error("❌ Cannot start desktop app without backend");
				process.exit(1);
			}
		}
	}

	// Start Electron
	await startElectron();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
