/**
 * Test script for Simple Reasoning Engine
 *
 * This script tests the reasoning engine's intent detection, plan creation,
 * and response synthesis capabilities. Requires all agents to be running.
 *
 * Usage: npx ts-node test-reasoning.ts
 */

import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import { SimpleReasoningEngine } from "./src/reasoning/simple-reasoning-engine";
import { AgentStatus, type UserInput } from "./src/types/agent";
import { createLogger } from "./src/utils/logger";

/**
 * Test script for Simple Reasoning Engine
 */
async function testReasoning(): Promise<void> {
  const logger = createLogger("reasoning-test");

  console.log("🧠 Testing Simple Reasoning Engine");
  console.log("=".repeat(60) + "\n");

  // Setup
  const registry = new AgentRegistry(logger);
  const orchestrator = new Orchestrator(registry, logger);

  // Register all agents
  await registry.registerAgent({
    agentId: "Dialogue",
    version: "1.0.0",
    capabilities: ["conversation", "response"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3001/health",
    apiEndpoint: "http://localhost:3001/api",
    dependencies: [],
    priority: 5,
  });

  await registry.registerAgent({
    agentId: "Web",
    version: "1.0.0",
    capabilities: ["web_search"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3002/health",
    apiEndpoint: "http://localhost:3002/api",
    dependencies: [],
    priority: 7,
  });

  await registry.registerAgent({
    agentId: "Knowledge",
    version: "1.0.0",
    capabilities: ["research", "fact_checking", "summarization"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3003/health",
    apiEndpoint: "http://localhost:3003/api",
    dependencies: ["Web"],
    priority: 8,
  });

  const reasoningEngine = new SimpleReasoningEngine(orchestrator, logger);

  console.log("✓ All agents registered\n");

  // Test scenarios
  const scenarios: Array<{ name: string; input: UserInput }> = [
    {
      name: "Greeting",
      input: {
        text: "Hello Jarvis, how are you?",
        source: "text",
        userId: "test-user",
        sessionId: "session-1",
        timestamp: new Date(),
      },
    },
    {
      name: "Web Search",
      input: {
        text: "Search for latest AI developments",
        source: "text",
        userId: "test-user",
        sessionId: "session-2",
        timestamp: new Date(),
      },
    },
    {
      name: "Research",
      input: {
        text: "Research neural networks",
        source: "text",
        userId: "test-user",
        sessionId: "session-3",
        timestamp: new Date(),
      },
    },
    {
      name: "Fact Check",
      input: {
        text: "Verify that Python is a programming language",
        source: "text",
        userId: "test-user",
        sessionId: "session-4",
        timestamp: new Date(),
      },
    },
    {
      name: "Summarize",
      input: {
        text: "Summarize information about quantum computing",
        source: "text",
        userId: "test-user",
        sessionId: "session-5",
        timestamp: new Date(),
      },
    },
    {
      name: "Natural Question",
      input: {
        text: "What is machine learning?",
        source: "text",
        userId: "test-user",
        sessionId: "session-6",
        timestamp: new Date(),
      },
    },
  ];

  for (const scenario of scenarios) {
    console.log("\n" + "=".repeat(60));
    console.log(`Test: ${scenario.name}`);
    console.log("=".repeat(60));
    console.log(`Input: "${scenario.input.text}"\n`);

    try {
      const startTime = Date.now();
      const response = await reasoningEngine.processInput(scenario.input);
      const duration = Date.now() - startTime;

      console.log(`✓ Intent: ${response.metadata?.intentType}`);
      console.log(`✓ Confidence: ${response.confidence}`);
      console.log(`✓ Agents used: ${response.agentsUsed.join(", ")}`);
      console.log(`✓ Duration: ${duration}ms`);
      console.log(
        `\n✓ Response:\n${response.text.substring(0, 300)}${response.text.length > 300 ? "..." : ""}\n`,
      );
    } catch (error) {
      console.log(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    }

    // Rate limiting
    await sleep(1000);
  }

  console.log("=".repeat(60));
  console.log("All Tests Complete");
  console.log("=".repeat(60));
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

testReasoning().catch((error) => {
  console.error("Fatal error in test script:", error);
  process.exit(1);
});
