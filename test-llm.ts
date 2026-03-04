/**
 * Test script for OpenAI LLM integration
 *
 * This script tests the OpenAI client's completion, intent detection,
 * and response synthesis capabilities. Requires OPENAI_API_KEY in .env.
 *
 * Usage: npx ts-node test-llm.ts
 */

import { config } from "dotenv";
import { OpenAIClient } from "./src/llm";
import { createLogger } from "./src/utils/logger";

config(); // Load .env

/**
 * Test script for OpenAI LLM integration
 */
async function testLLM(): Promise<void> {
  const logger = createLogger("llm-test");

  console.log("🤖 Testing OpenAI LLM Integration\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set in .env file");
    console.error("   Please add: OPENAI_API_KEY=your_api_key_here");
    process.exit(1);
  }

  const llm = new OpenAIClient(logger);

  console.log("✓ OpenAI client initialized\n");
  console.log("=".repeat(60));

  // Test 1: Simple completion
  console.log("\nTest 1: Simple Completion");
  console.log("=".repeat(60));

  try {
    const completion = await llm.complete("Explain what an AI agent is in one sentence.", {
      temperature: 0.7,
      maxTokens: 100,
    });
    console.log("Response:", completion);
  } catch (error) {
    console.log(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Test 2: Intent detection
  console.log("\n" + "=".repeat(60));
  console.log("Test 2: Intent Detection");
  console.log("=".repeat(60));

  const testInputs = [
    "Hello, how are you?",
    "Search for TypeScript tutorials",
    "Research quantum computing applications",
    "Fact check: Python is the most popular programming language",
    "Summarize recent AI developments",
    "What is machine learning?",
  ];

  for (const input of testInputs) {
    console.log(`\nInput: "${input}"`);
    try {
      const intent = await llm.detectIntent(input);
      console.log(`  Intent: ${intent.intent}`);
      console.log(`  Confidence: ${intent.confidence.toFixed(2)}`);
      console.log(`  Agent: ${intent.suggestedAgent}`);
      if (Object.keys(intent.entities).length > 0) {
        console.log(`  Entities:`, intent.entities);
      }
      if (intent.reasoning) {
        console.log(`  Reasoning: ${intent.reasoning}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Test 3: Response synthesis
  console.log("\n" + "=".repeat(60));
  console.log("Test 3: Response Synthesis");
  console.log("=".repeat(60));

  const mockOutputs = [
    {
      stepId: "step-1",
      agentId: "Knowledge",
      success: true,
      data: {
        topic: "artificial intelligence",
        summary:
          "AI is transforming multiple industries through machine learning, natural language processing, and automation. It enables computers to perform tasks that typically require human intelligence.",
        keyPoints: [
          "Machine learning enables pattern recognition",
          "Natural language processing improves human-computer interaction",
          "AI agents can automate complex tasks",
        ],
        sources: [
          { title: "AI Overview", url: "https://example.com/ai", snippet: "AI overview..." },
        ],
      },
      duration: 523,
    },
  ];

  try {
    const synthesized = await llm.synthesizeResponse("RESEARCH", mockOutputs);
    console.log("\nSynthesized Response:");
    console.log(synthesized);
  } catch (error) {
    console.log(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("All Tests Complete");
  console.log("=".repeat(60));
}

testLLM().catch((error) => {
  console.error("Fatal error in test script:", error);
  process.exit(1);
});
