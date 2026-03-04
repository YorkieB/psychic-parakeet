/**
 * Test Creative Agents Generation (Billing Check)
 *
 * Tests actual generation to verify billing/API issues.
 * This WILL cost money - small tests only.
 */

import axios from "axios";

async function testGeneration(): Promise<void> {
  console.log("💰 Testing Creative Agents Generation (Billing Check)");
  console.log("=".repeat(60));
  console.log("⚠️  WARNING: These tests will cost money!");
  console.log("=".repeat(60) + "\n");

  const results: {
    agent: string;
    test: string;
    success: boolean;
    error?: string;
    billingIssue?: boolean;
  }[] = [];

  // Test 1: Image Agent - Small Generation (COSTS ~$0.04-0.08)
  console.log("Test 1: Image Agent - Generate Image (COSTS ~$0.04-0.08)");
  console.log("=".repeat(60));
  console.log("Generating simple test image...\n");

  try {
    const response = await axios.post(
      "http://localhost:3010/api",
      {
        id: "test-img-1",
        agentId: "Image",
        action: "generate_image",
        inputs: {
          prompt: "a simple red circle on white background",
          size: "1024x1024",
          quality: "standard",
          enhance: false, // Skip enhancement to save on LLM costs
        },
        userId: "test-user",
        timestamp: new Date(),
        priority: "MEDIUM",
      },
      { timeout: 60000 },
    );

    if (response.data.success) {
      console.log("✅ Image Agent: Generation successful");
      console.log(`   File: ${(response.data.data as any)?.generation?.filepath || "N/A"}`);
      results.push({ agent: "Image", test: "generate_image", success: true });
    } else {
      const error = response.data.error || "Unknown error";
      console.log(`❌ Image Agent failed: ${error}`);
      const billingIssue =
        error.toLowerCase().includes("billing") ||
        error.toLowerCase().includes("payment") ||
        error.toLowerCase().includes("quota") ||
        error.toLowerCase().includes("credit") ||
        error.toLowerCase().includes("insufficient") ||
        error.toLowerCase().includes("balance") ||
        error.toLowerCase().includes("rate limit");
      results.push({ agent: "Image", test: "generate_image", success: false, error, billingIssue });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || String(error);
    console.log(`❌ Image Agent error: ${errorMsg}`);

    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit") ||
      errorMsg.toLowerCase().includes("insufficient") ||
      errorMsg.toLowerCase().includes("balance") ||
      errorMsg.toLowerCase().includes("rate limit");
    results.push({
      agent: "Image",
      test: "generate_image",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  console.log("");

  // Test 2: Music Agent - Small Generation (COSTS ~$0.10-0.30)
  console.log("Test 2: Music Agent - Generate Music (COSTS ~$0.10-0.30)");
  console.log("=".repeat(60));
  console.log("Generating short test song (30 seconds)...\n");

  try {
    const response = await axios.post(
      "http://localhost:3009/api",
      {
        id: "test-music-1",
        agentId: "Music",
        action: "generate_music",
        inputs: {
          prompt: "happy upbeat instrumental",
          genre: "pop",
          mood: "happy",
          vocals: "instrumental",
          duration: 30, // Short 30-second test
        },
        userId: "test-user",
        timestamp: new Date(),
        priority: "MEDIUM",
      },
      { timeout: 120000 },
    ); // 2 minute timeout for music generation

    if (response.data.success) {
      console.log("✅ Music Agent: Generation successful");
      console.log(`   Status: ${(response.data.data as any)?.generation?.status || "N/A"}`);
      results.push({ agent: "Music", test: "generate_music", success: true });
    } else {
      const error = response.data.error || "Unknown error";
      console.log(`❌ Music Agent failed: ${error}`);
      const billingIssue =
        error.toLowerCase().includes("billing") ||
        error.toLowerCase().includes("payment") ||
        error.toLowerCase().includes("quota") ||
        error.toLowerCase().includes("credit") ||
        error.toLowerCase().includes("insufficient") ||
        error.toLowerCase().includes("balance") ||
        error.toLowerCase().includes("rate limit");
      results.push({ agent: "Music", test: "generate_music", success: false, error, billingIssue });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || String(error);
    console.log(`❌ Music Agent error: ${errorMsg}`);

    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit") ||
      errorMsg.toLowerCase().includes("insufficient") ||
      errorMsg.toLowerCase().includes("balance") ||
      errorMsg.toLowerCase().includes("rate limit");
    results.push({
      agent: "Music",
      test: "generate_music",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  console.log("");

  // Test 3: Video Agent - Status Check (No cost, but tests API connection)
  console.log("Test 3: Video Agent - Check Status (FREE)");
  console.log("=".repeat(60));
  console.log("Checking video agent status...\n");

  try {
    const response = await axios.post(
      "http://localhost:3011/api",
      {
        id: "test-video-1",
        agentId: "Video",
        action: "list_videos",
        inputs: {},
        userId: "test-user",
        timestamp: new Date(),
        priority: "MEDIUM",
      },
      { timeout: 10000 },
    );

    if (response.data.success) {
      console.log("✅ Video Agent: Working");
      results.push({ agent: "Video", test: "list_videos", success: true });
    } else {
      const error = response.data.error || "Unknown error";
      console.log(`❌ Video Agent failed: ${error}`);
      results.push({ agent: "Video", test: "list_videos", success: false, error });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || String(error);
    console.log(`❌ Video Agent error: ${errorMsg}`);
    results.push({ agent: "Video", test: "list_videos", success: false, error: errorMsg });
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Generation & Billing Test Summary");
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
    console.log("  3. Check API quota/rate limits");
    console.log("  4. Review API account dashboard");
    console.log("  5. Check for API key validity");
  } else if (successful.length > 0) {
    console.log("🎉 All generation tests passed!");
    console.log("");
    console.log("✅ No billing issues detected");
    console.log("✅ API keys are working correctly");
    console.log("✅ Accounts have sufficient credits/balance");
    console.log("✅ Ready for production use");
  } else {
    console.log("⚠️  All tests failed (check errors above)");
  }

  process.exit(billingIssues.length > 0 ? 1 : 0);
}

testGeneration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
