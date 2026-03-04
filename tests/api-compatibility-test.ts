/**
 * API Version Compatibility Testing
 * Ensure API backwards compatibility
 */

import fs from "node:fs";
import axios from "axios";
import chalk from "chalk";

const BASE_URL = "http://localhost:3000";

interface CompatibilityTest {
  name: string;
  version: string;
  test: () => Promise<{ passed: boolean; details: string }>;
}

class APICompatibilityTester {
  private tests: CompatibilityTest[] = [];
  private results: any[] = [];

  constructor() {
    this.registerTests();
  }

  // Register compatibility tests
  private registerTests(): void {
    // 1. Response format consistency
    this.addTest("Response Format Consistency", "v4.0", async () => {
      const response = await axios.get(`${BASE_URL}/api/agents`);

      const hasStandardFormat =
        Object.hasOwn(response.data, "success") &&
        Object.hasOwn(response.data, "data") &&
        Object.hasOwn(response.data, "timestamp");

      if (hasStandardFormat) {
        return { passed: true, details: "Standard response format maintained" };
      } else {
        return { passed: false, details: "Response format changed unexpectedly" };
      }
    });

    // 2. Endpoint availability
    this.addTest("Core Endpoints Available", "v4.0", async () => {
      const coreEndpoints = ["/health", "/ready", "/api/agents", "/api/status", "/api/version"];

      for (const endpoint of coreEndpoints) {
        try {
          const response = await axios.get(`${BASE_URL}${endpoint}`);

          if (response.status !== 200) {
            return {
              passed: false,
              details: `Endpoint ${endpoint} returned ${response.status}`,
            };
          }
        } catch (_error) {
          return {
            passed: false,
            details: `Endpoint ${endpoint} not available`,
          };
        }
      }

      return { passed: true, details: "All core endpoints available" };
    });

    // 3. Field naming consistency
    this.addTest("Field Naming Consistency", "v4.0", async () => {
      const email = `compat-${Date.now()}@test.com`;

      await axios.post(`${BASE_URL}/api/auth/register`, {
        email,
        password: "Test123456!",
        name: "Test",
      });

      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email,
        password: "Test123456!",
      });

      // Check if expected fields exist
      const hasExpectedFields =
        Object.hasOwn(loginResponse.data.data, "accessToken") &&
        Object.hasOwn(loginResponse.data.data, "refreshToken") &&
        Object.hasOwn(loginResponse.data.data, "expiresIn");

      if (hasExpectedFields) {
        return { passed: true, details: "Field naming consistent with API spec" };
      } else {
        return { passed: false, details: "Field names changed unexpectedly" };
      }
    });

    // 4. Status code consistency
    this.addTest("HTTP Status Code Consistency", "v4.0", async () => {
      const tests = [
        { endpoint: "/health", expected: 200 },
        { endpoint: "/api/nonexistent", expected: 404 },
        { endpoint: "/api/auth/me", expected: 401 }, // without auth
      ];

      for (const test of tests) {
        try {
          const response = await axios.get(`${BASE_URL}${test.endpoint}`);

          if (response.status !== test.expected) {
            return {
              passed: false,
              details: `${test.endpoint} returned ${response.status}, expected ${test.expected}`,
            };
          }
        } catch (error: any) {
          if (error.response?.status !== test.expected) {
            return {
              passed: false,
              details: `${test.endpoint} returned ${error.response?.status}, expected ${test.expected}`,
            };
          }
        }
      }

      return { passed: true, details: "Status codes consistent" };
    });

    // 5. Legacy authentication support
    this.addTest("Authentication Method Compatibility", "v4.0", async () => {
      const email = `auth-${Date.now()}@test.com`;

      await axios.post(`${BASE_URL}/api/auth/register`, {
        email,
        password: "Test123456!",
        name: "Test",
      });

      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email,
        password: "Test123456!",
      });

      const token = loginResponse.data.data.accessToken;

      // Test Bearer token auth
      const authResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (authResponse.status === 200) {
        return { passed: true, details: "Authentication methods compatible" };
      } else {
        return { passed: false, details: "Authentication method changed" };
      }
    });

    // 6. Error format consistency
    this.addTest("Error Format Consistency", "v4.0", async () => {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          email: "invalid@test.com",
          password: "wrong",
        });

        return { passed: false, details: "Error not thrown as expected" };
      } catch (error: any) {
        const errorResponse = error.response?.data;

        const hasStandardErrorFormat =
          Object.hasOwn(errorResponse, "success") &&
          errorResponse.success === false &&
          Object.hasOwn(errorResponse, "error");

        if (hasStandardErrorFormat) {
          return { passed: true, details: "Error format consistent" };
        } else {
          return { passed: false, details: "Error format changed" };
        }
      }
    });
  }

  // Add a test
  private addTest(
    name: string,
    version: string,
    test: () => Promise<{ passed: boolean; details: string }>,
  ): void {
    this.tests.push({ name, version, test });
  }

  // Run all tests
  async runAll(): Promise<void> {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("API COMPATIBILITY TESTING"));
    console.log(chalk.cyan.bold("========================================\n"));

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printSummary();
    this.saveReport();
  }

  // Run individual test
  private async runTest(test: CompatibilityTest): Promise<void> {
    console.log(chalk.yellow(`Testing: ${test.name} (${test.version})`));

    try {
      const result = await test.test();

      this.results.push({
        name: test.name,
        version: test.version,
        passed: result.passed,
        details: result.details,
      });

      const icon = result.passed ? chalk.green("✓") : chalk.red("✗");
      console.log(`${icon} ${result.details}\n`);
    } catch (error: any) {
      this.results.push({
        name: test.name,
        version: test.version,
        passed: false,
        details: error.message,
      });

      console.log(chalk.red(`✗ Error: ${error.message}\n`));
    }
  }

  // Print summary
  private printSummary(): void {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("COMPATIBILITY SUMMARY"));
    console.log(chalk.cyan.bold("========================================\n"));

    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`Total Tests:  ${total}`);
    console.log(chalk.green(`Passed:       ${passed}`));
    console.log(chalk.red(`Failed:       ${failed}\n`));

    if (failed === 0) {
      console.log(chalk.green.bold("✅ API COMPATIBILITY MAINTAINED!"));
      console.log(chalk.green("No breaking changes detected.\n"));
    } else {
      console.log(chalk.red.bold("⚠️  BREAKING CHANGES DETECTED!"));
      console.log(chalk.red("Review compatibility issues before release.\n"));
    }
  }

  // Save report
  private saveReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
    };

    fs.writeFileSync("compatibility-report.json", JSON.stringify(report, null, 2));
    console.log(chalk.gray("✓ Compatibility report saved to compatibility-report.json\n"));
  }
}

// Run compatibility tests
const tester = new APICompatibilityTester();
tester.runAll().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
