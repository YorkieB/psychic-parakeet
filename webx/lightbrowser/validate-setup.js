#!/usr/bin/env node  // [NRS-1503] Node.js executable
/** [NRS-1503]
 * Quick validation script for Claude API integration [NRS-1503]
 * Run: node validate-setup.js [NRS-1503]
 */ // [NRS-1503]

const fs = require("node:fs"); // [NRS-1503] File system module
const path = require("node:path"); // [NRS-1503] Path utilities

// [NRS-1001] Load .env file if it exists
try {
	// [NRS-1001] Attempt to load dotenv for local envs
	require("dotenv").config(); // [NRS-1503] Load environment variables
} catch (e) {
	// [NRS-1001] Handle missing dotenv
	if (e.code === "MODULE_NOT_FOUND") {
		// [NRS-1001] Check if module is missing
		console.log("   ℹ️  dotenv not available, using system environment variables"); // [NRS-1001] Log the exception handling
	} else {
		// [NRS-1001] Re-throw unexpected errors
		throw e; // [NRS-1001] Re-throw non-module errors
	}
}

// [NRS-1001] Validate Claude API integration setup
console.log("🔍 Validating Claude API Integration Setup...\n"); // [NRS-1001] Display header

let allGood = true; // [NRS-1001] Validation result flag

// [NRS-1001] Check 1: Environment variable
console.log("1. Environment Setup"); // [NRS-1001] Check header
const hasApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY; // [NRS-1001] Get API key
if (hasApiKey) {
	// [NRS-1001] Validate key exists
	console.log("   ✅ API key configured\n"); // [NRS-1001] Success message
} else {
	// [NRS-1001] Handle missing API key
	console.log("   ⚠️  No API key found. Set CLAUDE_API_KEY environment variable"); // [NRS-1001] Warning
	console.log('   Run: $env:CLAUDE_API_KEY = "your-key-here"\n'); // [NRS-1001] Setup instruction
	allGood = false; // [NRS-1001] Mark validation failed
}

// [NRS-1001] Check 2: Package installations
console.log("2. Dependencies"); // [NRS-1001] Check header
try {
	// [NRS-1001] Validate Claude SDK install
	require("@anthropic-ai/sdk"); // [NRS-1001] Check Claude SDK
	console.log("   ✅ @anthropic-ai/sdk installed"); // [NRS-1001] Success message
} catch (e) {
	// [NRS-1001] Module missing handler
	if (e.code === "MODULE_NOT_FOUND") {
		// [NRS-1001] Check if module is missing
		console.log("   ❌ @anthropic-ai/sdk not found. Run: npm install"); // [NRS-1001] Error message
		allGood = false; // [NRS-1001] Mark validation failed
	} else {
		// [NRS-1001] Re-throw unexpected errors
		throw e; // [NRS-1001] Re-throw non-module errors
	}
}

try {
	// [NRS-1001] Validate debug module install
	require("debug"); // [NRS-1001] Check debug module
	console.log("   ✅ debug installed"); // [NRS-1001] Success message
} catch (e) {
	// [NRS-1001] Module missing handler
	if (e.code === "MODULE_NOT_FOUND") {
		// [NRS-1001] Check if module is missing
		console.log("   ❌ debug not found. Run: npm install"); // [NRS-1001] Error message
		allGood = false; // [NRS-1001] Mark validation failed
	} else {
		// [NRS-1001] Re-throw unexpected errors
		throw e; // [NRS-1001] Re-throw non-module errors
	}
}

try {
	// [NRS-1001] Validate dotenv module install
	require("dotenv"); // [NRS-1001] Check dotenv module
	console.log("   ✅ dotenv installed\n"); // [NRS-1001] Success message
} catch (e) {
	// [NRS-1001] Module missing handler
	if (e.code === "MODULE_NOT_FOUND") {
		// [NRS-1001] Check if module is missing
		console.log("   ❌ dotenv not found. Run: npm install\n"); // [NRS-1001] Error message
		allGood = false; // [NRS-1001] Mark validation failed
	} else {
		// [NRS-1001] Re-throw unexpected errors
		throw e; // [NRS-1001] Re-throw non-module errors
	}
}

// [NRS-1001] Check 3: Key files exist
console.log("3. Core Files"); // [NRS-1001] Check header
const files = [
	// [NRS-1001] File list
	"./agents/browser-use-agent.js", // [NRS-1102] Browser agent file
	"./agents/example-claude-usage.js", // [NRS-1001] Example file
	"./browser-automation-manager.js", // [NRS-1102] Automation manager
	"./src/automation-ui.js", // [NRS-1301] UI component
];

files.forEach((file) => {
	// [NRS-1001] Check each file
	if (fs.existsSync(file)) {
		// [NRS-1001] File exists check
		console.log(`   ✅ ${file}`); // [NRS-1001] Success message
	} else {
		// [NRS-1001] Missing doc file
		console.log(`   ❌ ${file} (missing)`); // [NRS-1001] Missing file message
		allGood = false; // [NRS-1001] Mark validation failed
	}
});
console.log(); // [NRS-1001] Print newline

// [NRS-1001] Check 4: Documentation
console.log("4. Documentation"); // [NRS-1001] Check header
const docs = [
	// [NRS-1001] Documentation list
	"./CLAUDE_SETUP.md", // [NRS-1001] Setup documentation
	"./QUICK_REFERENCE.md", // [NRS-1001] Reference documentation
	"./CLAUDE_INTEGRATION_SUMMARY.md", // [NRS-1001] Integration summary
	"./SETUP_STATUS.md", // [NRS-1001] Status documentation
];

docs.forEach((doc) => {
	// [NRS-1001] Check each doc
	if (fs.existsSync(doc)) {
		// [NRS-1001] File exists check
		console.log(`   ✅ ${doc}`); // [NRS-1001] Success message
	} else {
		// [NRS-1001] Missing agent file
		console.log(`   ⚠️  ${doc} (optional)`); // [NRS-1001] Optional warning
	}
});
console.log(); // [NRS-1001] Print newline

// [NRS-1001] Check 5: Try to load BrowserUseAgent
console.log("5. Module Loading"); // [NRS-1001] Check header
try {
	// [NRS-1001] Try loading agent module
	const BrowserUseAgent = require("./agents/browser-use-agent"); // [NRS-1102] Load agent module
	console.log("   ✅ BrowserUseAgent loads successfully"); // [NRS-1001] Success message
	try {
		// [NRS-1001] Try instantiation
		new BrowserUseAgent(); // [NRS-1102] Create agent instance
		if (hasApiKey) {
			// [NRS-1001] Check API key present
			console.log("   ✅ BrowserUseAgent instantiates with API key\n"); // [NRS-1001] Success message
		} else {
			// [NRS-1001] No API key
			console.log("   ⚠️  BrowserUseAgent created but API key missing\n"); // [NRS-1001] Warning message
		}
	} catch (e) {
		// [NRS-1001] Catch instantiation error
		console.log(`   ❌ Cannot instantiate: ${e.message}\n`); // [NRS-1001] Error message
		allGood = false; // [NRS-1001] Mark validation failed
	}
} catch (e) {
	// [NRS-1001] Catch load error
	console.log(`   ❌ Cannot load BrowserUseAgent: ${e.message}\n`); // [NRS-1001] Error message
	allGood = false; // [NRS-1001] Mark validation failed
}

// [NRS-1001] Summary section
console.log("═".repeat(50)); // [NRS-1001] Print separator line
if (allGood && hasApiKey) {
	// [NRS-1001] Check all conditions
	console.log("\n✅ All checks passed! Ready to use Claude API.\n"); // [NRS-1001] Success message
	console.log("Next steps:"); // [NRS-1001] Instructions header
	console.log("1. Run: node agents/example-claude-usage.js"); // [NRS-1001] Step 1
	console.log("2. Integrate into your Electron app (see CLAUDE_SETUP.md)"); // [NRS-1001] Step 2
	console.log("3. Set custom prompts for your use cases\n"); // [NRS-1001] Step 3
} else if (allGood) {
	// [NRS-1001] Checks passed but no API key
	console.log("\n⚠️  Setup complete but API key not configured.\n"); // [NRS-1001] Warning message
	console.log("To test:"); // [NRS-1001] Instructions header
	console.log('1. Set API key: $env:CLAUDE_API_KEY = "your-key"'); // [NRS-1001] Step 1
	console.log("2. Run: node agents/example-claude-usage.js\n"); // [NRS-1001] Step 2
} else {
	// [NRS-1001] Some checks failed
	console.log("\n❌ Setup incomplete. Address the issues above.\n"); // [NRS-1001] Error message
	console.log("Common fixes:"); // [NRS-1001] Fixes header
	console.log("1. Run: npm install"); // [NRS-1001] Fix 1
	console.log('2. Set API key: $env:CLAUDE_API_KEY = "your-key"'); // [NRS-1001] Fix 2
	console.log("3. Check file paths are correct\n"); // [NRS-1001] Fix 3
}

process.exit(allGood && hasApiKey ? 0 : 1); // [NRS-1001] Exit with appropriate code
