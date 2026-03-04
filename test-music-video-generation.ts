/**
 * Test Music and Video Generation
 *
 * Tests actual generation for both Music (Suno) and Video (Runway) agents.
 * This WILL cost money - small tests only.
 */

import axios from "axios";

async function testMusicAndVideoGeneration(): Promise<void> {
  console.log("🎵🎬 Testing Music and Video Generation");
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

  // Test 1: Music Generation
  console.log("Test 1: Music Agent - Generate Music (COSTS ~$0.10-0.30)");
  console.log("=".repeat(60));
  console.log("Generating short test song (30 seconds)...\n");

  try {
    const response = await axios.post(
      "http://localhost:3009/api",
      {
        id: "test-music-gen",
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
      { timeout: 180000 },
    ); // 3 minute timeout for music generation

    if (response.data.success) {
      console.log("✅ Music Agent: Generation successful");
      const data = response.data.data as any;
      console.log(`   Title: ${data?.generation?.title || "N/A"}`);
      console.log(`   Duration: ${data?.generation?.duration || "N/A"}s`);
      console.log(`   Status: ${data?.generation?.status || "N/A"}`);
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

  // Test 2: Video Generation
  console.log("Test 2: Video Agent - Generate Video (COSTS ~$3.00 for 4 seconds)");
  console.log("=".repeat(60));
  console.log("Generating short test video (4 seconds)...\n");

  try {
    const response = await axios.post(
      "http://localhost:3011/api",
      {
        id: "test-video-gen",
        agentId: "Video",
        action: "generate_video",
        inputs: {
          prompt: "waves crashing on a beach",
          duration: 4, // Short 4-second test
          aspectRatio: "16:9",
        },
        userId: "test-user",
        timestamp: new Date(),
        priority: "MEDIUM",
      },
      { timeout: 60000 },
    ); // 1 minute timeout for initial request

    if (response.data.success) {
      console.log("✅ Video Agent: Generation started");
      const data = response.data.data as any;
      console.log(`   Task ID: ${data?.taskId || "N/A"}`);
      console.log(`   Message: ${data?.message || "N/A"}`);
      console.log(`   Estimated Time: ${data?.estimatedTime || "N/A"}s`);
      console.log("");
      console.log("⏳ Video generation is async. Check status with: check_status action");
      results.push({ agent: "Video", test: "generate_video", success: true });
    } else {
      const error = response.data.error || "Unknown error";
      console.log(`❌ Video Agent failed: ${error}`);
      const billingIssue =
        error.toLowerCase().includes("billing") ||
        error.toLowerCase().includes("payment") ||
        error.toLowerCase().includes("quota") ||
        error.toLowerCase().includes("credit") ||
        error.toLowerCase().includes("insufficient") ||
        error.toLowerCase().includes("balance") ||
        error.toLowerCase().includes("rate limit");
      results.push({ agent: "Video", test: "generate_video", success: false, error, billingIssue });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || String(error);
    console.log(`❌ Video Agent error: ${errorMsg}`);

    const billingIssue =
      errorMsg.toLowerCase().includes("billing") ||
      errorMsg.toLowerCase().includes("payment") ||
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("credit") ||
      errorMsg.toLowerCase().includes("insufficient") ||
      errorMsg.toLowerCase().includes("balance") ||
      errorMsg.toLowerCase().includes("rate limit");
    results.push({
      agent: "Video",
      test: "generate_video",
      success: false,
      error: errorMsg,
      billingIssue,
    });
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Generation Test Summary");
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
    billingIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.agent} - ${issue.test}`);
      console.log(`   Error: ${issue.error}`);
    });
    console.log("");
    console.log("Action Required:");
    console.log("  1. Check API account balance/credits");
    console.log("  2. Verify payment method is active");
    console.log("  3. Check API quota/rate limits");
  } else if (successful.length > 0) {
    console.log("🎉 Generation tests completed!");
    console.log("");
    console.log("✅ No billing issues detected");
    console.log("✅ API keys are working correctly");
    console.log("✅ Accounts have sufficient credits/balance");
  } else {
    console.log("⚠️  All tests failed (check errors above)");
  }

  process.exit(billingIssues.length > 0 ? 1 : 0);
}

testMusicAndVideoGeneration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
