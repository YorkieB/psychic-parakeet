const { spawn } = require("node:child_process");

console.log("🚀 Starting Jarvis Desktop in development mode...\n");

// Start React dev server
const react = spawn("npm", ["run", "dev:react"], {
	stdio: "inherit",
	shell: true,
});

// Start Electron after React is ready
setTimeout(() => {
	const electron = spawn("npm", ["run", "dev:electron"], {
		stdio: "inherit",
		shell: true,
	});

	electron.on("close", () => {
		react.kill();
		process.exit(0);
	});
}, 5000);

react.on("close", () => {
	process.exit(0);
});
