const { execSync } = require("node:child_process");

console.log("📦 Packaging Jarvis Desktop...\n");

// Build first
console.log("🔨 Building application...");
execSync("npm run build", { stdio: "inherit" });

// Package
console.log("\n📦 Creating distributable package...");
execSync("npm run package", { stdio: "inherit" });

console.log("\n✅ Packaging complete!");
console.log("📁 Output: release/");
