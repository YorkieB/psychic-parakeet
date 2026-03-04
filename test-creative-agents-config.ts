/**
 * Test script for Creative Agents Configuration
 *
 * Tests API key configuration and agent setup without requiring servers to be running.
 * Validates that all credentials are properly set up.
 *
 * Usage: npx ts-node test-creative-agents-config.ts
 */

import dotenv from "dotenv";
import { ImageAgent } from "./src/agents/image-agent";
import { MusicAgent } from "./src/agents/music-agent";
import { VideoAgent } from "./src/agents/video-agent";
import { OpenAIClient } from "./src/llm";
import { createLogger } from "./src/utils/logger";

// Load environment variables
dotenv.config();

async function testCreativeAgentsConfig(): Promise<void> {
  const logger = createLogger("creative-agents-config-test");

  console.log("🔍 Testing Creative Agents Configuration");
  console.log("=".repeat(60));
  console.log("Checking API keys and agent setup...");
  console.log("=".repeat(60) + "\n");

  let successCount = 0;
  let failureCount = 0;
  const issues: string[] = [];

  // Test 1: Music Agent (Suno API)
  console.log("=".repeat(60));
  console.log("Test 1: Music Agent (Suno API)");
  console.log("=".repeat(60));

  try {
    const sunoApiKey = process.env.SUNO_API_KEY;

    if (!sunoApiKey) {
      failureCount++;
      issues.push("Music Agent: SUNO_API_KEY not found in .env");
      console.log("❌ SUNO_API_KEY not configured");
    } else {
      console.log("✅ SUNO_API_KEY found");
      console.log(
        `   Key: ${sunoApiKey.substring(0, 10)}...${sunoApiKey.substring(sunoApiKey.length - 4)}`,
      );

      // Try to create agent instance
      try {
        const llm = new OpenAIClient(logger);
        new MusicAgent(logger, llm); // Test instantiation
        console.log("✅ Music Agent instance created successfully");
        console.log(`   Port: ${process.env.MUSIC_AGENT_PORT || "3009"}`);
        successCount++;
      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        issues.push(`Music Agent: ${errorMsg}`);
        console.log(`❌ Failed to create Music Agent: ${errorMsg}`);
      }
    }
  } catch (error) {
    failureCount++;
    issues.push(`Music Agent: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // Test 2: Image Agent (DALL-E 3 via OpenAI)
  console.log("=".repeat(60));
  console.log("Test 2: Image Agent (DALL-E 3)");
  console.log("=".repeat(60));

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      failureCount++;
      issues.push("Image Agent: OPENAI_API_KEY not found in .env");
      console.log("❌ OPENAI_API_KEY not configured");
    } else {
      console.log("✅ OPENAI_API_KEY found");
      console.log(
        `   Key: ${openaiApiKey.substring(0, 10)}...${openaiApiKey.substring(openaiApiKey.length - 4)}`,
      );

      // Try to create agent instance
      try {
        const llm = new OpenAIClient(logger);
        new ImageAgent(logger, llm); // Test instantiation
        console.log("✅ Image Agent instance created successfully");
        console.log(`   Port: ${process.env.IMAGE_AGENT_PORT || "3010"}`);
        successCount++;
      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        issues.push(`Image Agent: ${errorMsg}`);
        console.log(`❌ Failed to create Image Agent: ${errorMsg}`);
      }
    }
  } catch (error) {
    failureCount++;
    issues.push(`Image Agent: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // Test 3: Video Agent (Runway API)
  console.log("=".repeat(60));
  console.log("Test 3: Video Agent (Runway API)");
  console.log("=".repeat(60));

  try {
    const runwayApiKey = process.env.RUNWAY_API_KEY;

    if (!runwayApiKey) {
      failureCount++;
      issues.push("Video Agent: RUNWAY_API_KEY not found in .env");
      console.log("❌ RUNWAY_API_KEY not configured");
    } else {
      console.log("✅ RUNWAY_API_KEY found");
      console.log(
        `   Key: ${runwayApiKey.substring(0, 15)}...${runwayApiKey.substring(runwayApiKey.length - 4)}`,
      );

      // Try to create agent instance
      try {
        new VideoAgent(logger); // Test instantiation
        console.log("✅ Video Agent instance created successfully");
        console.log(`   Port: ${process.env.VIDEO_AGENT_PORT || "3011"}`);
        successCount++;
      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        issues.push(`Video Agent: ${errorMsg}`);
        console.log(`❌ Failed to create Video Agent: ${errorMsg}`);
      }
    }
  } catch (error) {
    failureCount++;
    issues.push(`Video Agent: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Configuration Test Summary");
  console.log("=".repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📊 Total: ${successCount + failureCount}`);
  console.log("");

  if (issues.length > 0) {
    console.log("Issues found:");
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
    console.log("");
  }

  if (failureCount === 0) {
    console.log("🎉 All creative agents are properly configured!");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Start the system: npm start");
    console.log("  2. Agents will be available on ports 3009, 3010, 3011");
    console.log("  3. Test actual generation (costs money) via orchestrator");
  } else {
    console.log("⚠️  Some agents need configuration.");
    console.log("");
    console.log("To fix:");
    console.log("  1. Check .env file exists");
    console.log("  2. Verify API keys are set correctly");
    console.log("  3. Restart after adding keys");
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

// Run tests
testCreativeAgentsConfig().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
