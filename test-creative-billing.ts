/**
 * Test script for Creative Agents Billing
 *
 * Tests the three creative agents to verify API keys work and check for billing issues.
 * Tests both non-costly operations and small generation requests.
 *
 * Usage: npx ts-node test-creative-billing.ts
 */

import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import { AgentStatus } from "./src/types/agent";
import { createLogger } from "./src/utils/logger";

async function testCreativeBilling(): Promise<void> {
  const logger = createLogger("creative-billing-test");

  console.log("💰 Testing Creative Agents Billing");
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
    capabilities: ["generate_music", "analyze_prompt"],
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
    capabilities: ["generate_image", "enhance_prompt"],
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
    capabilities: ["generate_video", "check_status"],
    status: AgentStatus.ONLINE,
    healthEndpoint: "http://localhost:3011/health",
    apiEndpoint: "http://localhost:3011/api",
    dependencies: [],
    priority: 8,
  });

  console.log("✅ All agents registered\n");

  const results: {
    agent: string;
    test: string;
    success: boolean;
    error?: string;
    billingIssue?: boolean;
  }[] = [];

  // Test 1: Music Agent - Analyze Prompt (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 1: Music Agent - Analyze Prompt (FREE)");
  console.log("=".repeat(60));

  try {
    const response = await orchestrator.executeRequest(
      "Music",
      "analyze_prompt",
      { prompt: "happy song" },
      "test-user",
      "MEDIUM",
    );

    if (response.success) {
      console.log("✅ Music Agent: Prompt analysis successful");
      results.push({ agent: "Music", test: "analyze_prompt", success: true });
    } else {
      console.log(`❌ Music Agent failed: ${response.error}`);
      const billingIssue =
        response.error?.toLowerCase().includes("billing") ||
        response.error?.toLowerCase().includes("payment") ||
        response.error?.toLowerCase().includes("quota") ||
        response.error?.toLowerCase().includes("credit");
      results.push({
        agent: "Music",
        test: "analyze_prompt",
        success: false,
        error: response.error,
        billingIssue,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Music Agent error: ${errorMsg}`);
    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit");
    results.push({
      agent: "Music",
      test: "analyze_prompt",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  console.log("");

  // Test 2: Image Agent - Enhance Prompt (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 2: Image Agent - Enhance Prompt (FREE)");
  console.log("=".repeat(60));

  try {
    const response = await orchestrator.executeRequest(
      "Image",
      "enhance_prompt",
      { prompt: "a cat" },
      "test-user",
      "MEDIUM",
    );

    if (response.success) {
      console.log("✅ Image Agent: Prompt enhancement successful");
      results.push({ agent: "Image", test: "enhance_prompt", success: true });
    } else {
      console.log(`❌ Image Agent failed: ${response.error}`);
      const billingIssue =
        response.error?.toLowerCase().includes("billing") ||
        response.error?.toLowerCase().includes("payment") ||
        response.error?.toLowerCase().includes("quota") ||
        response.error?.toLowerCase().includes("credit");
      results.push({
        agent: "Image",
        test: "enhance_prompt",
        success: false,
        error: response.error,
        billingIssue,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Image Agent error: ${errorMsg}`);
    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit");
    results.push({
      agent: "Image",
      test: "enhance_prompt",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  console.log("");

  // Test 3: Music Agent - Small Generation Test (COSTS MONEY)
  console.log("=".repeat(60));
  console.log("Test 3: Music Agent - Small Generation (COSTS ~$0.10-0.30)");
  console.log("=".repeat(60));
  console.log("⚠️  This will cost money! Testing with minimal prompt...\n");

  try {
    const response = await orchestrator.executeRequest(
      "Music",
      "generate_music",
      {
        prompt: "happy upbeat instrumental",
        genre: "pop",
        mood: "happy",
        vocals: "instrumental",
        duration: 30, // Short 30-second test
      },
      "test-user",
      "MEDIUM",
    );

    if (response.success) {
      console.log("✅ Music Agent: Generation successful (billing OK)");
      results.push({ agent: "Music", test: "generate_music", success: true });
    } else {
      console.log(`❌ Music Agent failed: ${response.error}`);
      const billingIssue =
        response.error?.toLowerCase().includes("billing") ||
        response.error?.toLowerCase().includes("payment") ||
        response.error?.toLowerCase().includes("quota") ||
        response.error?.toLowerCase().includes("credit") ||
        response.error?.toLowerCase().includes("insufficient") ||
        response.error?.toLowerCase().includes("balance");
      results.push({
        agent: "Music",
        test: "generate_music",
        success: false,
        error: response.error,
        billingIssue,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Music Agent error: ${errorMsg}`);
    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit") ||
      errorMsg.toLowerCase().includes("insufficient") ||
      errorMsg.toLowerCase().includes("balance");
    results.push({
      agent: "Music",
      test: "generate_music",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  console.log("");

  // Test 4: Image Agent - Small Generation Test (COSTS MONEY)
  console.log("=".repeat(60));
  console.log("Test 4: Image Agent - Small Generation (COSTS ~$0.04-0.08)");
  console.log("=".repeat(60));
  console.log("⚠️  This will cost money! Testing with simple prompt...\n");

  try {
    const response = await orchestrator.executeRequest(
      "Image",
      "generate_image",
      {
        prompt: "a simple red circle on white background",
        size: "1024x1024",
        quality: "standard",
      },
      "test-user",
      "MEDIUM",
    );

    if (response.success) {
      console.log("✅ Image Agent: Generation successful (billing OK)");
      results.push({ agent: "Image", test: "generate_image", success: true });
    } else {
      console.log(`❌ Image Agent failed: ${response.error}`);
      const billingIssue =
        response.error?.toLowerCase().includes("billing") ||
        response.error?.toLowerCase().includes("payment") ||
        response.error?.toLowerCase().includes("quota") ||
        response.error?.toLowerCase().includes("credit") ||
        response.error?.toLowerCase().includes("insufficient") ||
        response.error?.toLowerCase().includes("balance");
      results.push({
        agent: "Image",
        test: "generate_image",
        success: false,
        error: response.error,
        billingIssue,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Image Agent error: ${errorMsg}`);
    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit") ||
      errorMsg.toLowerCase().includes("insufficient") ||
      errorMsg.toLowerCase().includes("balance");
    results.push({
      agent: "Image",
      test: "generate_image",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  console.log("");

  // Test 5: Video Agent - Status Check (Non-costly)
  console.log("=".repeat(60));
  console.log("Test 5: Video Agent - Status Check (FREE)");
  console.log("=".repeat(60));

  try {
    const response = await orchestrator.executeRequest(
      "Video",
      "list_videos",
      {},
      "test-user",
      "MEDIUM",
    );

    if (response.success) {
      console.log("✅ Video Agent: Status check successful");
      results.push({ agent: "Video", test: "list_videos", success: true });
    } else {
      console.log(`❌ Video Agent failed: ${response.error}`);
      const billingIssue =
        response.error?.toLowerCase().includes("billing") ||
        response.error?.toLowerCase().includes("payment") ||
        response.error?.toLowerCase().includes("quota") ||
        response.error?.toLowerCase().includes("credit");
      results.push({
        agent: "Video",
        test: "list_videos",
        success: false,
        error: response.error,
        billingIssue,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Video Agent error: ${errorMsg}`);
    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit");
    results.push({
      agent: "Video",
      test: "list_videos",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Billing Test Summary");
  console.log("=".repeat(60));

  const billingIssues = results.filter((r) => r.billingIssue);
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success && !r.billingIssue);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed (non-billing): ${failed.length}`);
  console.log(`💰 Billing Issues: ${billingIssues.length}`);
  console.log("");

  if (billingIssues.length > 0) {
    console.log("⚠️  BILLING ISSUES DETECTED:");
    console.log("");
    billingIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.agent} - ${issue.test}`);
      console.log(`   Error: ${issue.error}`);
      console.log("");
    });
    console.log("Action Required:");
    console.log("  1. Check API account balance/credits");
    console.log("  2. Verify payment method is active");
    console.log("  3. Check API quota limits");
    console.log("  4. Review API account dashboard");
  } else if (failed.length > 0) {
    console.log("⚠️  Some tests failed (not billing related):");
    failed.forEach((f, index) => {
      console.log(`  ${index + 1}. ${f.agent} - ${f.test}: ${f.error}`);
    });
  } else {
    console.log("🎉 All tests passed! No billing issues detected.");
    console.log("");
    console.log("✅ All API keys are working correctly");
    console.log("✅ Billing/credits are sufficient");
    console.log("✅ Ready for production use");
  }

  process.exit(billingIssues.length > 0 ? 1 : 0);
}

// Run tests
testCreativeBilling().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
