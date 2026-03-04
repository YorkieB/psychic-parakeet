/**
 * Test script for Advanced Reasoning Engine
 *
 * This script tests the advanced reasoning engine's chain-of-thought reasoning,
 * multi-path analysis, and verification capabilities. Requires OPENAI_API_KEY.
 *
 * Usage: npx ts-node test-advanced-reasoning.ts
 */

import { config } from "dotenv";
import { OpenAIClient } from "./src/llm";
import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import { AdvancedReasoningEngine } from "./src/reasoning/advanced-reasoning-engine";
import type { UserInput } from "./src/reasoning/types";
import { AgentStatus } from "./src/types/agent";
import { createLogger } from "./src/utils/logger";

config();

/**
 * Test script for Advanced Reasoning Engine
 */
async function testAdvancedReasoning(): Promise<void> {
  const logger = createLogger("advanced-reasoning-test");

  console.log("🧠 Testing Advanced Reasoning Engine\n");
  console.log("=".repeat(80));

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set");
    console.error("   Please set OPENAI_API_KEY in .env file");
    process.exit(1);
  }

  // Initialize components
  const llm = new OpenAIClient(logger);
  const registry = new AgentRegistry(logger);
  const orchestrator = new Orchestrator(registry, logger);
  const engine = new AdvancedReasoningEngine(orchestrator, logger, llm);

  // Register agents for testing
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
    capabilities: ["research", "fact-check", "summarize"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3003/health",
    apiEndpoint: "http://localhost:3003/api",
    dependencies: [],
    priority: 8,
  });

  console.log("✓ All agents registered\n");

  const testCases: UserInput[] = [
    {
      text: "Explain how machine learning works",
      source: "text",
      userId: "test",
      sessionId: "test-1",
      timestamp: new Date(),
    },
    {
      text: "Should I invest in cryptocurrency?",
      source: "text",
      userId: "test",
      sessionId: "test-2",
      timestamp: new Date(),
    },
    {
      text: "Research quantum computing and fact-check if it is faster than classical computing",
      source: "text",
      userId: "test",
      sessionId: "test-3",
      timestamp: new Date(),
    },
  ];

  for (const input of testCases) {
    console.log("\n" + "=".repeat(80));
    console.log(`Test: "${input.text}"`);
    console.log("=".repeat(80));

    try {
      const response = await engine.processInput(input);

      console.log("\nResponse:", response.text);
      console.log("Confidence:", response.confidence.toFixed(2));
      console.log("Agents used:", response.agentsUsed.join(", "));

      if (response.uncertainties && response.uncertainties.length > 0) {
        console.log("\nUncertainties:");
        response.uncertainties.forEach((u) => console.log(`  - ${u}`));
      }

      if (response.metadata?.reasoning) {
        console.log("\nReasoning Process:");
        response.metadata.reasoning.forEach((step) => {
          console.log(`  ${step.stepNumber}. [${step.type}] ${step.content}`);
        });
      }
    } catch (error) {
      console.log(`\n✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(80));
  console.log("All Tests Complete");
  console.log("=".repeat(80));
}

testAdvancedReasoning().catch((error) => {
  console.error("Fatal error in test script:", error);
  process.exit(1);
});
