/**
 * Direct API test for Creative Agents
 *
 * Tests agents directly via HTTP to check billing/API issues.
 * Bypasses orchestrator to test agents directly.
 */

import axios from "axios";

async function testDirectAPIs(): Promise<void> {
  console.log("💰 Testing Creative Agents Directly (Billing Check)");
  console.log("=".repeat(60) + "\n");

  const results: {
    agent: string;
    test: string;
    success: boolean;
    error?: string;
    billingIssue?: boolean;
  }[] = [];

  // Test 1: Music Agent - Analyze Prompt
  console.log("Test 1: Music Agent - Analyze Prompt");
  console.log("=".repeat(60));

  try {
    const response = await axios.post(
      "http://localhost:3009/api",
      {
        id: "test-1",
        agentId: "Music",
        action: "analyze_prompt",
        inputs: { prompt: "happy song" },
        userId: "test-user",
        timestamp: new Date(),
        priority: "MEDIUM",
      },
      { timeout: 10000 },
    );

    if (response.data.success) {
      console.log("✅ Music Agent: Working");
      results.push({ agent: "Music", test: "analyze_prompt", success: true });
    } else {
      const error = response.data.error || "Unknown error";
      console.log(`❌ Music Agent failed: ${error}`);
      const billingIssue =
        error.toLowerCase().includes("billing") ||
        error.toLowerCase().includes("payment") ||
        error.toLowerCase().includes("quota") ||
        error.toLowerCase().includes("credit");
      results.push({ agent: "Music", test: "analyze_prompt", success: false, error, billingIssue });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || String(error);
    console.log(`❌ Music Agent error: ${errorMsg}`);

    if (error.code === "ECONNREFUSED" || error.message?.includes("connect")) {
      console.log("   → Agent not running on port 3009");
      results.push({
        agent: "Music",
        test: "analyze_prompt",
        success: false,
        error: "Agent not running",
      });
    } else {
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
  }

  console.log("");

  // Test 2: Image Agent - Enhance Prompt
  console.log("Test 2: Image Agent - Enhance Prompt");
  console.log("=".repeat(60));

  try {
    const response = await axios.post(
      "http://localhost:3010/api",
      {
        id: "test-2",
        agentId: "Image",
        action: "enhance_prompt",
        inputs: { prompt: "a cat" },
        userId: "test-user",
        timestamp: new Date(),
        priority: "MEDIUM",
      },
      { timeout: 10000 },
    );

    if (response.data.success) {
      console.log("✅ Image Agent: Working");
      results.push({ agent: "Image", test: "enhance_prompt", success: true });
    } else {
      const error = response.data.error || "Unknown error";
      console.log(`❌ Image Agent failed: ${error}`);
      const billingIssue =
        error.toLowerCase().includes("billing") ||
        error.toLowerCase().includes("payment") ||
        error.toLowerCase().includes("quota") ||
        error.toLowerCase().includes("credit");
      results.push({ agent: "Image", test: "enhance_prompt", success: false, error, billingIssue });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || String(error);
    console.log(`❌ Image Agent error: ${errorMsg}`);

    if (error.code === "ECONNREFUSED" || error.message?.includes("connect")) {
      console.log("   → Agent not running on port 3010");
      results.push({
        agent: "Image",
        test: "enhance_prompt",
        success: false,
        error: "Agent not running",
      });
    } else {
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
  }

  console.log("");

  // Test 3: Video Agent - List Videos
  console.log("Test 3: Video Agent - List Videos");
  console.log("=".repeat(60));

  try {
    const response = await axios.post(
      "http://localhost:3011/api",
      {
        id: "test-3",
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
      const billingIssue =
        error.toLowerCase().includes("billing") ||
        error.toLowerCase().includes("payment") ||
        error.toLowerCase().includes("quota") ||
        error.toLowerCase().includes("credit");
      results.push({ agent: "Video", test: "list_videos", success: false, error, billingIssue });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || String(error);
    console.log(`❌ Video Agent error: ${errorMsg}`);

    if (error.code === "ECONNREFUSED" || error.message?.includes("connect")) {
      console.log("   → Agent not running on port 3011");
      results.push({
        agent: "Video",
        test: "list_videos",
        success: false,
        error: "Agent not running",
      });
    } else {
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
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Billing Test Summary");
  console.log("=".repeat(60));

  const billingIssues = results.filter((r) => r.billingIssue);
  const successful = results.filter((r) => r.success);
  const notRunning = results.filter((r) => !r.success && r.error === "Agent not running");
  const otherErrors = results.filter(
    (r) => !r.success && r.error !== "Agent not running" && !r.billingIssue,
  );

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Agents not running: ${notRunning.length}`);
  console.log(`❌ Other errors: ${otherErrors.length}`);
  console.log(`💰 Billing Issues: ${billingIssues.length}`);
  console.log("");

  if (notRunning.length > 0) {
    console.log("⚠️  AGENTS NOT RUNNING:");
    notRunning.forEach((issue) => {
      console.log(
        `  - ${issue.agent} (port ${issue.agent === "Music" ? "3009" : issue.agent === "Image" ? "3010" : "3011"})`,
      );
    });
    console.log("");
    console.log("Action: Start the system with: npm start");
  }

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
    console.log("  3. Check API quota limits");
  } else if (successful.length > 0) {
    console.log("🎉 Agents are working! No billing issues detected.");
  }

  process.exit(billingIssues.length > 0 ? 1 : 0);
}

testDirectAPIs().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
