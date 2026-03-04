import { config } from "dotenv";
import { OpenAIClient } from "./src/llm";
import { ContextManager } from "./src/memory";
import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import { AdvancedReasoningEngine } from "./src/reasoning/advanced-reasoning-engine";
import type { UserInput } from "./src/reasoning/types";
import { createLogger } from "./src/utils/logger";

config();

async function testContext() {
  const logger = createLogger("context-test");

  console.log("💾 Testing Context & Memory System\n");
  console.log("=".repeat(80));

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set");
    process.exit(1);
  }

  const llm = new OpenAIClient(logger);
  const registry = new AgentRegistry(logger);
  const orchestrator = new Orchestrator(registry, logger);
  const contextManager = new ContextManager(logger, llm);
  const engine = new AdvancedReasoningEngine(orchestrator, logger, llm, contextManager);

  const sessionId = `test-session-${Date.now()}`;

  console.log(`\n📝 Session: ${sessionId}\n`);

  // Conversation scenario
  const conversation = [
    "Research quantum computing",
    "Is it faster than classical computers?",
    "What are the practical applications of that technology?",
    "Summarize what we discussed",
  ];

  for (let i = 0; i < conversation.length; i++) {
    console.log("=".repeat(80));
    console.log(`Turn ${i + 1}: "${conversation[i]}"`);
    console.log("=".repeat(80));

    const input: UserInput = {
      text: conversation[i],
      source: "text",
      userId: "test-user",
      sessionId,
      timestamp: new Date(),
    };

    const response = await engine.processInput(input);

    console.log("\nResponse:", response.text);
    console.log("Confidence:", response.confidence.toFixed(2));

    if (response.metadata?.contextUsed) {
      console.log("\n✓ Context used");
      if (response.metadata.referencesResolved && response.metadata.referencesResolved.length > 0) {
        console.log("References resolved:");
        response.metadata.referencesResolved.forEach(([ref, value]) => {
          console.log(`  "${ref}" → "${value}"`);
        });
      }
    }

    console.log("\n");

    // Wait between turns
    if (i < conversation.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const stats = contextManager.getStats();
  console.log("=".repeat(80));
  console.log("Session Statistics:");
  console.log(`  Messages: ${stats.totalMessages}`);
  console.log(`  Avg per session: ${stats.averageMessagesPerSession.toFixed(1)}`);
  console.log("=".repeat(80));
}

testContext().catch(console.error);
