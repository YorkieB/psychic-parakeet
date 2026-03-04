/**
 * Test script for real web search functionality using DuckDuckGo.
 *
 * This script tests the Web Agent's ability to perform real web searches
 * and return formatted results. Requires the Web Agent to be running.
 *
 * Usage: npx ts-node test-real-search.ts
 */

import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import { AgentStatus, type SearchResponse } from "./src/types/agent";
import { createLogger } from "./src/utils/logger";

/**
 * Test script for real web search functionality.
 */
async function testRealSearch(): Promise<void> {
  const logger = createLogger("search-test");

  console.log("🔍 Testing Real Web Search with Brave Search API\n");

  // Setup
  const registry = new AgentRegistry(logger);
  const orchestrator = new Orchestrator(registry, logger);

  // Register Web Agent (must be running on port 3002)
  await registry.registerAgent({
    agentId: "Web",
    version: "1.0.0",
    capabilities: ["web_search", "information_retrieval", "fact_checking"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3002/health",
    apiEndpoint: "http://localhost:3002/api",
    dependencies: [],
    priority: 7,
  });

  // Test queries
  const testQueries = [
    "artificial intelligence 2026",
    "TypeScript multi-agent systems",
    "OpenAI GPT-4",
    "how to build AI agents",
    "latest tech news",
  ];

  console.log(`Running ${testQueries.length} search queries...\n`);

  for (const query of testQueries) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Query: "${query}"`);
    console.log("=".repeat(60));

    try {
      const startTime = Date.now();

      const response = await orchestrator.executeRequest(
        "Web",
        "search",
        { query, maxResults: 5 },
        "test-user",
        "MEDIUM",
      );

      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        const searchData = response.data as SearchResponse;

        console.log(`✓ Found ${searchData.resultCount} results in ${duration}ms`);
        console.log(`  Source: ${searchData.source}`);
        console.log(`  Total available: ${searchData.totalAvailable || "N/A"}`);
        console.log("\nTop 3 Results:");

        searchData.results.slice(0, 3).forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.title}`);
          console.log(`   URL: ${result.url}`);
          console.log(`   Snippet: ${result.snippet.substring(0, 100)}...`);
        });
      } else {
        console.log(`✗ Search failed: ${response.error || "Unknown error"}`);
      }

      // Rate limiting: wait 1 second between requests
      if (query !== testQueries[testQueries.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Test Complete");
  console.log("=".repeat(60));

  // Health summary
  const health = registry.getHealthSummary();
  console.log("\nSystem Health:");
  console.log(`  Total agents: ${health.total}`);
  console.log(`  Online: ${health.online}`);
  console.log(`  Availability: ${(health.availability * 100).toFixed(1)}%`);
}

testRealSearch().catch((error) => {
  console.error("Fatal error in test script:", error);
  process.exit(1);
});
