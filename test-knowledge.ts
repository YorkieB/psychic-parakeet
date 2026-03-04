/**
 * Test script for Knowledge Agent functionality
 *
 * This script tests the Knowledge Agent's research, fact-checking, and
 * summarization capabilities. Requires both Web Agent and Knowledge Agent
 * to be running.
 *
 * Usage: npx ts-node test-knowledge.ts
 */

import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import {
  AgentStatus,
  type FactCheckResult,
  type ResearchResult,
  type Summary,
} from "./src/types/agent";
import { createLogger } from "./src/utils/logger";

/**
 * Test script for Knowledge Agent functionality
 */
async function testKnowledge(): Promise<void> {
  const logger = createLogger("knowledge-test");

  console.log("🧠 Testing Knowledge Agent\n");
  console.log("=".repeat(60));

  // Setup
  const registry = new AgentRegistry(logger);
  const orchestrator = new Orchestrator(registry, logger);

  // Register Web Agent (dependency)
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

  // Register Knowledge Agent
  await registry.registerAgent({
    agentId: "Knowledge",
    version: "1.0.0",
    capabilities: [
      "research",
      "fact_checking",
      "summarization",
      "information_synthesis",
      "multi_source_analysis",
    ],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3003/health",
    apiEndpoint: "http://localhost:3003/api",
    dependencies: ["Web"],
    priority: 8,
  });

  console.log("✓ Agents registered\n");

  // Test 1: Quick Research
  console.log("\n" + "=".repeat(60));
  console.log("Test 1: Quick Research");
  console.log("=".repeat(60));

  const research1 = await orchestrator.executeRequest(
    "Knowledge",
    "research",
    { topic: "quantum computing", depth: "quick" },
    "test-user",
  );

  if (research1.success) {
    const data = research1.data as ResearchResult;
    console.log(`\n✓ Topic: ${data.topic}`);
    console.log(`✓ Summary: ${data.summary.substring(0, 200)}...`);
    console.log(`✓ Sources: ${data.sources.length}`);
    console.log(`✓ Key Points: ${data.keyPoints.length}`);
    console.log(`✓ Confidence: ${(data.confidence * 100).toFixed(1)}%`);
  } else {
    console.log(`\n✗ Research failed: ${research1.error}`);
  }

  await sleep(2000);

  // Test 2: Medium Depth Research
  console.log("\n" + "=".repeat(60));
  console.log("Test 2: Medium Depth Research");
  console.log("=".repeat(60));

  const research2 = await orchestrator.executeRequest(
    "Knowledge",
    "research",
    { topic: "TypeScript best practices", depth: "medium" },
    "test-user",
  );

  if (research2.success) {
    const data = research2.data as ResearchResult;
    console.log(`\n✓ Topic: ${data.topic}`);
    console.log(`✓ Queries Used: ${data.queriesUsed}`);
    console.log(`✓ Sources Found: ${data.sources.length}`);
    console.log(`\n✓ Key Points:`);
    data.keyPoints.slice(0, 3).forEach((point, i) => {
      console.log(`   ${i + 1}. ${point}`);
    });
  } else {
    console.log(`\n✗ Research failed: ${research2.error}`);
  }

  await sleep(2000);

  // Test 3: Fact Check (True Claim)
  console.log("\n" + "=".repeat(60));
  console.log("Test 3: Fact Check - True Claim");
  console.log("=".repeat(60));

  const factCheck1 = await orchestrator.executeRequest(
    "Knowledge",
    "fact-check",
    { claim: "TypeScript is developed by Microsoft", sources: 3 },
    "test-user",
  );

  if (factCheck1.success) {
    const data = factCheck1.data as FactCheckResult;
    console.log(`\n✓ Claim: ${data.claim}`);
    console.log(`✓ Verdict: ${data.verdict}`);
    console.log(`✓ Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    console.log(`✓ Confirming Sources: ${data.confirmingSources.length}`);
    console.log(`✓ Explanation: ${data.explanation}`);
  } else {
    console.log(`\n✗ Fact-check failed: ${factCheck1.error}`);
  }

  await sleep(2000);

  // Test 4: Summarize
  console.log("\n" + "=".repeat(60));
  console.log("Test 4: Summarize Information");
  console.log("=".repeat(60));

  const summary = await orchestrator.executeRequest(
    "Knowledge",
    "summarize",
    { query: "AI agent architecture patterns", maxSources: 5 },
    "test-user",
  );

  if (summary.success) {
    const data = summary.data as Summary;
    console.log(`\n✓ Query: ${data.query}`);
    console.log(`✓ Summary (${data.wordCount} words):`);
    console.log(`   ${data.summary.substring(0, 300)}...`);
    console.log(`\n✓ Sources Used:`);
    data.sources.slice(0, 3).forEach((source, i) => {
      console.log(`   ${i + 1}. ${source.title}`);
      console.log(`      ${source.url}`);
    });
  } else {
    console.log(`\n✗ Summarization failed: ${summary.error}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("All Tests Complete");
  console.log("=".repeat(60));

  // Health summary
  const health = registry.getHealthSummary();
  console.log("\nSystem Health:");
  console.log(`  Total agents: ${health.total}`);
  console.log(`  Online: ${health.online}`);
  console.log(`  Availability: ${(health.availability * 100).toFixed(1)}%`);
}

/**
 * Sleeps for the specified number of milliseconds.
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the sleep duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

testKnowledge().catch((error) => {
  console.error("Fatal error in test script:", error);
  process.exit(1);
});
