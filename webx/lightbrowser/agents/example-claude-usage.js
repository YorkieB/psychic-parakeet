/** // [NRS-1001]
 * Example usage of BrowserUseAgent with Claude API // [NRS-1001]
 * Demonstrates how to use Claude for intelligent browser automation // [NRS-1001]
 */ // [NRS-1001]

// [NRS-1001] Load environment variables from .env file
require("dotenv").config(); // [NRS-1001] Load .env configuration

const BrowserUseAgent = require("./browser-use-agent"); // [NRS-1102] Import browser agent

// [NRS-1001] You'll need to set the environment variable:
// [NRS-1001] set CLAUDE_API_KEY=your_api_key_here
// [NRS-1001] Or add it to the .env file

async function exampleBasicNavigation() {
	// [NRS-1102] Basic navigation example
	console.log("=== Example 1: Basic Navigation with Claude ===\n"); // [NRS-1001] Display header

	const agent = new BrowserUseAgent(); // [NRS-1102] Create agent instance

	try {
		// [NRS-1001]
		// [NRS-1102] Start a browser session
		const session = await agent.startSession({
			// [NRS-1102] Initialize session
			url: "https://example.com", // [NRS-905] Starting URL
		}); // [NRS-1001]
		console.log("Session started:", session); // [NRS-1001] Log session info

		// [NRS-905] Navigate to a URL
		const navResult = await agent.navigate("https://www.example.com"); // [NRS-905] Execute navigation
		console.log("Navigation result:", navResult); // [NRS-1001] Log navigation result

		// [NRS-1102] Simulate page content (in real use, this would come from the renderer)
		agent.setPageContent("<h1>Example Domain</h1><p>This domain is for use in examples...</p>"); // [NRS-1102] Set page HTML

		// [NRS-1102] Ask Claude to analyze the page
		const analysis = await agent.analyzeAndDecide("Find and extract the main heading"); // [NRS-1102] Claude analysis
		console.log("Claude analysis:", analysis); // [NRS-1001] Log analysis results

		// [NRS-1102] Close session
		await agent.closeSession(); // [NRS-1102] End browser session
		console.log("Session closed\n"); // [NRS-1001] Log session closure
	} catch (error) {
		// [NRS-1001]
		console.error("Error:", error.message); // [NRS-1001] Log error
	} // [NRS-1001]
} // [NRS-1001]

async function exampleContentExtraction() {
	// [NRS-1102] Content extraction example
	console.log("=== Example 2: Content Extraction with Claude ===\n"); // [NRS-1001] Display header

	const agent = new BrowserUseAgent(); // [NRS-1102] Create agent instance

	try {
		// [NRS-1001]
		await agent.startSession({ url: "https://news.ycombinator.com" }); // [NRS-1102] Start session

		// [NRS-1102] Set page content (simulated)
		const pageContent = `  // [NRS-1102] HTML content
      <div class="story">  <!-- [NRS-1102] Story container -->
        <span class="rank">1.</span>
        <a href="...">AI models are getting smarter</a>
        <span class="score">500 points</span>
      </div>
      <div class="story">  <!-- [NRS-1102] Story container -->
        <span class="rank">2.</span>
        <a href="...">New JavaScript features released</a>
        <span class="score">450 points</span>
      </div>
    `; // [NRS-1102] Close sample content template
		agent.setPageContent(pageContent); // [NRS-1102] Set page HTML

		// [NRS-1102] Extract content with Claude's analysis
		const extracted = await agent.extractContent(".story"); // [NRS-1102] Extract stories
		console.log("Extracted content:", extracted); // [NRS-1001] Log results

		await agent.closeSession(); // [NRS-1102] End session
		console.log(); // [NRS-1001] Print newline
	} catch (error) {
		// [NRS-1001]
		console.error("Error:", error.message); // [NRS-1001] Log error
	} // [NRS-1001]
} // [NRS-1001]

async function exampleInteractiveWorkflow() {
	// [NRS-1102] Interactive workflow example
	console.log("=== Example 3: Interactive Workflow with Claude ===\n"); // [NRS-1001] Display header

	const agent = new BrowserUseAgent(); // [NRS-1102] Create agent instance

	try {
		// [NRS-1001]
		await agent.startSession({ url: "https://example.com" }); // [NRS-1102] Start session

		// [NRS-1102] Simulate page with search form
		agent.setPageContent(`  // [NRS-1102] HTML form
      <form id="search">  <!-- [NRS-1102] Search form -->
        <input type="text" id="search-box" placeholder="Search...">  <!-- [NRS-1102] Input field -->
        <button type="submit">Search</button>  <!-- [NRS-1102] Submit button -->
      </form>
      <div id="results"></div>  <!-- [NRS-1102] Results container -->
    `); // [NRS-1102] Close simulated form template

		// [NRS-1102] Let Claude decide what to do
		const decision = await agent.analyzeAndDecide(
			// [NRS-1102] Claude analyzes page
			'I want to search for "node.js best practices" on this website', // [NRS-1102] User intent statement
		); // [NRS-1001]
		console.log("Claude decision:", decision); // [NRS-1001] Log Claude decision

		// [NRS-1102] Based on Claude's suggestion, we could then:
		// [NRS-1102] - Click on the search box
		// [NRS-1102] - Type the search query
		// [NRS-1102] - Click the search button
		// [NRS-1102] - Extract and analyze results

		await agent.closeSession(); // [NRS-1102] End browser session
		console.log(); // [NRS-1001] Print newline
	} catch (error) {
		// [NRS-1001] Catch errors
		console.error("Error:", error.message); // [NRS-1001] Log error
	} // [NRS-1001]
} // [NRS-1001]

// [NRS-1001] Main execution entry point
async function runExamples() {
	// [NRS-1001] Run all examples
	// [NRS-1001] Check if API key is set
	if (!process.env.CLAUDE_API_KEY && !process.env.ANTHROPIC_API_KEY) {
		// [NRS-1001] Validate API key
		console.warn(
			// [NRS-1001] Display warning
			"WARNING: CLAUDE_API_KEY environment variable not set.\n" + // [NRS-1001] Warning message
				"Examples will fail unless you set:\n" + // [NRS-1001] Additional info
				"set CLAUDE_API_KEY=your_api_key_here\n", // [NRS-1001] Instructions
		); // [NRS-1001]
	} // [NRS-1001]

	try {
		// [NRS-1001] Execute examples
		await exampleBasicNavigation(); // [NRS-1102] Run basic example
		// [NRS-1001] Uncomment to run additional examples:
		// await exampleContentExtraction();  // [NRS-1102] Extraction example
		// await exampleInteractiveWorkflow();  // [NRS-1102] Workflow example
	} catch (error) {
		// [NRS-1001] Catch fatal errors
		console.error("Fatal error:", error); // [NRS-1001] Log fatal error
		process.exit(1); // [NRS-1001] Exit with error code
	} // [NRS-1001]
} // [NRS-1001]

module.exports = {
	// [NRS-1001] Module exports
	exampleBasicNavigation, // [NRS-1102] Export navigation example
	exampleContentExtraction, // [NRS-1102] Export extraction example
	exampleInteractiveWorkflow, // [NRS-1102] Export workflow example
}; // [NRS-1001]
