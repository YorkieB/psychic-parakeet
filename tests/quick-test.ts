/**
 * Quick Smoke Test - Tests critical endpoints only
 * Fast validation for CI/CD pipelines and pre-deployment checks
 */

import axios from "axios";
import chalk from "chalk";

const BASE_URL = "http://localhost:3000";

interface QuickTestResult {
  endpoint: string;
  status: "PASS" | "FAIL";
  statusCode: number;
  duration: number;
}

const results: QuickTestResult[] = [];

async function quickTest(method: string, url: string, description: string): Promise<void> {
  const startTime = Date.now();

  try {
    const response = await axios({
      method,
      url,
      validateStatus: () => true,
      timeout: 5000,
    });

    const duration = Date.now() - startTime;
    const status = response.status >= 200 && response.status < 300 ? "PASS" : "FAIL";

    results.push({
      endpoint: description,
      status,
      statusCode: response.status,
      duration,
    });

    if (status === "PASS") {
      console.log(chalk.green(`✓ ${description} (${duration}ms)`));
    } else {
      console.log(chalk.red(`✗ ${description} - Status ${response.status} (${duration}ms)`));
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(chalk.red(`✗ ${description} - ${error.message}`));
    results.push({
      endpoint: description,
      status: "FAIL",
      statusCode: 0,
      duration,
    });
  }
}

async function runQuickTests() {
  console.log(chalk.cyan.bold("\n========================================"));
  console.log(chalk.cyan.bold("JARVIS QUICK SMOKE TEST"));
  console.log(chalk.cyan.bold("========================================\n"));

  // Critical endpoints only
  await quickTest("GET", `${BASE_URL}/health`, "Main Server Health");
  await quickTest("GET", `${BASE_URL}/api/status`, "System Status");
  await quickTest("GET", `${BASE_URL}/api/agents`, "List Agents");
  await quickTest("GET", `${BASE_URL}/api/version`, "Version Info");
  await quickTest("GET", `${BASE_URL}/api/features`, "Feature Flags");

  // Test a few agents
  await quickTest("GET", "http://localhost:3001/health", "Dialogue Agent Health");
  await quickTest("GET", "http://localhost:3002/health", "Web Agent Health");
  await quickTest("GET", "http://localhost:3038/health", "Security Agent Health");

  // Health API
  await quickTest("GET", `${BASE_URL}/health/system`, "System Health");
  await quickTest("GET", `${BASE_URL}/health/agents/summary`, "Agent Summary");

  // Print results
  console.log(chalk.cyan.bold("\n========================================"));
  console.log(chalk.cyan.bold("QUICK TEST RESULTS"));
  console.log(chalk.cyan.bold("========================================\n"));

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(chalk.green(`Passed: ${passed}`));
  console.log(chalk.red(`Failed: ${failed}`));

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(chalk.gray(`\nAverage Response Time: ${avgDuration.toFixed(2)}ms`));

  if (failed === 0) {
    console.log(chalk.green.bold("\n✓ ALL CRITICAL ENDPOINTS WORKING!\n"));
    process.exit(0);
  } else {
    console.log(chalk.red.bold("\n✗ SOME CRITICAL ENDPOINTS FAILED!\n"));
    process.exit(1);
  }
}

runQuickTests().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
