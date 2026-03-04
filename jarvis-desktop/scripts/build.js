const { execSync } = require("node:child_process");
const _fs = require("node:fs");
const _path = require("node:path");

console.log("🔨 Building Jarvis Desktop...\n");

// Build React
console.log("📦 Building React frontend...");
execSync("npm run build:react", { stdio: "inherit" });

// Build Electron
console.log("\n⚡ Building Electron main process...");
execSync("npm run build:electron", { stdio: "inherit" });

console.log("\n✅ Build complete!");
console.log("📁 Output: dist/");
