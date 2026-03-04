/**
 * Test script for Creative Agents (Music, Image, Video)
 *
 * Tests the three creative agents to verify API keys and functionality.
 * Starts with non-costly operations, then optionally tests generation.
 *
 * Usage: npx ts-node test-creative-agents.ts
 */

import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import { AgentStatus } from "./src/types/agent";
import { createLogger } from "./src/utils/logger";

async function testCreativeAgents(): Promise<void> {
  const logger = createLogger("creative-agents-test");

  console.log("🎨 Testing Creative Agents");
  console.log("=".repeat(60));
  console.log("Testing: Music (Suno), Image (DALL-E 3), Video (Runway)");
  console.log("=".repeat(60) + "\n");

  // Setup
  const registry = new AgentRegistry(logger);
  const orchestrator = new Orchestrator(registry, logger);

  // Register Music Agent
  await registry.registerAgent({
    agentId: "Music",
    version: "1.0.0",
    capabilities: ["generate_music", "analyze_prompt", "ask_clarifying_questions"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3009/health",
    apiEndpoint: "http://localhost:3009/api",
    dependencies: [],
    priority: 8,
  });

  // Register Image Agent
  await registry.registerAgent({
    agentId: "Image",
    version: "1.0.0",
    capabilities: ["generate_image", "enhance_prompt", "create_variations"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3010/health",
    apiEndpoint: "http://localhost:3010/api",
    dependencies: [],
    priority: 8,
  });

  // Register Video Agent
  await registry.registerAgent({
    agentId: "Video",
    version: "1.0.0",
    capabilities: ["generate_video", "check_status", "download_video"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3011/health",
    apiEndpoint: "http://localhost:3011/api",
    dependencies: [],
    priority: 8,
  });

  console.log("✅ All agents registered\n");

  let successCount = 0;
  let failureCount = 0;

  // Test 1: Music Agent - Analyze Prompt (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 1: Music Agent - Analyze Prompt");
  console.log("=".repeat(60));

  try {
    const musicAnalysis = await orchestrator.executeRequest(
      "Music",
      "analyze_prompt",
      { prompt: "Create a happy upbeat song" },
      "test-user",
      "MEDIUM",
    );

    if (musicAnalysis.success) {
      successCount++;
      console.log("✅ Music Agent: Prompt analysis successful");
      console.log(`   Extracted info: ${JSON.stringify(musicAnalysis.data).substring(0, 150)}...`);
    } else {
      failureCount++;
      console.log(`❌ Music Agent failed: ${musicAnalysis.error}`);
    }
  } catch (error) {
    failureCount++;
    console.log(`❌ Music Agent error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // Test 2: Image Agent - Enhance Prompt (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 2: Image Agent - Enhance Prompt");
  console.log("=".repeat(60));

  try {
    const imageEnhancement = await orchestrator.executeRequest(
      "Image",
      "enhance_prompt",
      { prompt: "a cat" },
      "test-user",
      "MEDIUM",
    );

    if (imageEnhancement.success) {
      successCount++;
      console.log("✅ Image Agent: Prompt enhancement successful");
      const enhanced = (imageEnhancement.data as any)?.enhancedPrompt || imageEnhancement.data;
      console.log(
        `   Enhanced prompt: ${typeof enhanced === "string" ? enhanced.substring(0, 100) : JSON.stringify(enhanced).substring(0, 100)}...`,
      );
    } else {
      failureCount++;
      console.log(`❌ Image Agent failed: ${imageEnhancement.error}`);
    }
  } catch (error) {
    failureCount++;
    console.log(`❌ Image Agent error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // Test 3: Video Agent - List Videos (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 3: Video Agent - List Videos");
  console.log("=".repeat(60));

  try {
    const videoList = await orchestrator.executeRequest(
      "Video",
      "list_videos",
      {},
      "test-user",
      "MEDIUM",
    );

    if (videoList.success) {
      successCount++;
      console.log("✅ Video Agent: List videos successful");
      const videos = (videoList.data as any)?.videos || [];
      console.log(`   Videos found: ${videos.length}`);
    } else {
      failureCount++;
      console.log(`❌ Video Agent failed: ${videoList.error}`);
    }
  } catch (error) {
    failureCount++;
    console.log(`❌ Video Agent error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // Test 4: Music Agent - List Generations (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 4: Music Agent - List Generations");
  console.log("=".repeat(60));

  try {
    const musicList = await orchestrator.executeRequest(
      "Music",
      "list_generations",
      {},
      "test-user",
      "MEDIUM",
    );

    if (musicList.success) {
      successCount++;
      console.log("✅ Music Agent: List generations successful");
      const generations = (musicList.data as any)?.generations || [];
      console.log(`   Generations found: ${generations.length}`);
    } else {
      failureCount++;
      console.log(`❌ Music Agent failed: ${musicList.error}`);
    }
  } catch (error) {
    failureCount++;
    console.log(`❌ Music Agent error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");

  // Test 5: Image Agent - List Images (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 5: Image Agent - List Images");
  console.log("=".repeat(60));

  try {
    const imageList = await orchestrator.executeRequest(
      "Image",
      "list_images",
      {},
      "test-user",
      "MEDIUM",
    );

    if (imageList.success) {
      successCount++;
      console.log("✅ Image Agent: List images successful");
      const images = (imageList.data as any)?.images || [];
      console.log(`   Images found: ${images.length}`);
    } else {
      failureCount++;
      console.log(`❌ Image Agent failed: ${imageList.error}`);
    }
  } catch (error) {
    failureCount++;
    console.log(`❌ Image Agent error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📊 Total: ${successCount + failureCount}`);
  console.log("");

  if (failureCount === 0) {
    console.log("🎉 All creative agents are working correctly!");
    console.log("");
    console.log("Note: These tests used non-costly operations.");
    console.log("To test actual generation (costs money), you can:");
    console.log("  - Music: generate_music action");
    console.log("  - Image: generate_image action");
    console.log("  - Video: generate_video action");
  } else {
    console.log("⚠️  Some agents failed. Check:");
    console.log("  1. Agents are running (npm start)");
    console.log("  2. API keys are set in .env");
    console.log("  3. Network connectivity");
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

// Run tests
testCreativeAgents().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
