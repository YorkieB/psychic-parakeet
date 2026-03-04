/**
 * Master Test Runner
 * Run ALL test suites and generate master report
 */

import { exec } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import chalk from "chalk";

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  file: string;
  critical: boolean;
  timeout: number; // seconds
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  exitCode: number;
}

class ComprehensiveTestRunner {
  // Note: Health Monitoring (tests/health-monitoring.ts) is a CONTINUOUS SERVICE
  // It should be run separately via: npm run monitor:health
  // It is NOT included in the test suite as it runs indefinitely by design

  private suites: TestSuite[] = [
    { name: "Smoke Tests", file: "tests/smoke-test-suite.ts", critical: true, timeout: 120 },
    {
      name: "Performance Benchmark",
      file: "tests/performance-benchmark.ts",
      critical: false,
      timeout: 300,
    },
    { name: "Security Audit", file: "tests/security-audit.ts", critical: true, timeout: 180 },
    { name: "Stress Test", file: "tests/stress-test.ts", critical: false, timeout: 120 },
    { name: "Recovery Test", file: "tests/recovery-test.ts", critical: true, timeout: 240 },
    { name: "Integration Test", file: "tests/integration-test.ts", critical: true, timeout: 180 },
    {
      name: "Data Integrity Test",
      file: "tests/data-integrity-test.ts",
      critical: true,
      timeout: 120,
    },
    {
      name: "API Compatibility Test",
      file: "tests/api-compatibility-test.ts",
      critical: true,
      timeout: 60,
    },
    {
      name: "Sensor Health Tests",
      file: "tests/sensor-health-tests.ts",
      critical: true,
      timeout: 60,
    },
    { name: "UI Sensor Tests", file: "tests/ui-sensor-tests.ts", critical: true, timeout: 60 },
    {
      name: "Endpoint Tests",
      file: "tests/automated-test-runner.ts",
      critical: true,
      timeout: 300,
    },
    { name: "Code Quality", file: "scripts/lint-all.ts", critical: false, timeout: 180 },
  ];

  private results: TestResult[] = [];

  // Run all test suites
  async runAll(): Promise<void> {
    console.log(chalk.cyan.bold("\n╔════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║   JARVIS COMPREHENSIVE TEST SUITE     ║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════╝\n"));

    console.log(chalk.gray(`Total test suites: ${this.suites.length}`));
    console.log(chalk.gray(`Critical suites: ${this.suites.filter((s) => s.critical).length}\n`));

    const overallStart = Date.now();

    for (let i = 0; i < this.suites.length; i++) {
      const suite = this.suites[i];
      console.log(chalk.cyan.bold(`\n[${i + 1}/${this.suites.length}] ${suite.name}`));
      console.log(chalk.gray(`File: ${suite.file}`));
      console.log(chalk.gray(`Timeout: ${suite.timeout}s`));

      await this.runSuite(suite);
    }

    const overallDuration = Date.now() - overallStart;

    this.printMasterReport(overallDuration);
    this.saveMasterReport(overallDuration);
  }

  // Run individual test suite
  private async runSuite(suite: TestSuite): Promise<void> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(`ts-node ${suite.file}`, {
        timeout: suite.timeout * 1000,
      });

      const duration = Date.now() - startTime;

      this.results.push({
        suite: suite.name,
        passed: true,
        duration,
        output: stdout + stderr,
        exitCode: 0,
      });

      console.log(chalk.green(`✓ ${suite.name} PASSED (${(duration / 1000).toFixed(2)}s)`));
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.results.push({
        suite: suite.name,
        passed: false,
        duration,
        output: error.stdout + error.stderr,
        exitCode: error.code || 1,
      });

      console.log(chalk.red(`✗ ${suite.name} FAILED (${(duration / 1000).toFixed(2)}s)`));

      if (suite.critical) {
        console.log(chalk.red.bold("   [CRITICAL FAILURE]"));
      }
    }
  }

  // Print master report
  private printMasterReport(totalDuration: number): void {
    console.log(chalk.cyan.bold("\n\n╔════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║      MASTER TEST REPORT               ║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════╝\n"));

    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const criticalFailed = this.results.filter((r) => {
      const suite = this.suites.find((s) => s.name === r.suite);
      return !r.passed && suite && suite.critical;
    }).length;

    console.log(chalk.bold("Overall Statistics:"));
    console.log(`  Total Suites:       ${total}`);
    console.log(chalk.green(`  Passed:             ${passed}`));
    console.log(chalk.red(`  Failed:             ${failed}`));
    console.log(chalk.red.bold(`  Critical Failed:    ${criticalFailed}`));
    console.log(
      chalk.gray(`  Total Duration:     ${(totalDuration / 1000 / 60).toFixed(2)} minutes\n`),
    );

    console.log(chalk.bold("Suite Results:"));
    console.log("─".repeat(80));

    this.results.forEach((result) => {
      const suite = this.suites.find((s) => s.name === result.suite);
      const icon = result.passed ? chalk.green("✓") : chalk.red("✗");
      const critical = suite?.critical ? chalk.red("[CRITICAL]") : "";
      const duration = `${(result.duration / 1000).toFixed(2)}s`.padStart(8);

      console.log(`${icon} ${result.suite.padEnd(35)} ${duration} ${critical}`);
    });

    console.log("─".repeat(80));
    console.log();

    // Final verdict
    if (criticalFailed > 0) {
      console.log(chalk.red.bold("❌ CRITICAL TEST FAILURES DETECTED"));
      console.log(chalk.red("System is NOT ready for deployment.\n"));
      process.exit(1);
    } else if (failed === 0) {
      console.log(chalk.green.bold("✅ ALL TESTS PASSED!"));
      console.log(chalk.green("System is ready for deployment.\n"));
      process.exit(0);
    } else {
      console.log(chalk.yellow.bold("⚠️  SOME NON-CRITICAL TESTS FAILED"));
      console.log(chalk.yellow("Review failures before deployment.\n"));
      process.exit(0);
    }
  }

  // Save master report
  private saveMasterReport(totalDuration: number): void {
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.passed).length,
        failed: this.results.filter((r) => !r.passed).length,
        criticalFailed: this.results.filter((r) => {
          const suite = this.suites.find((s) => s.name === r.suite);
          return !r.passed && suite && suite.critical;
        }).length,
      },
      results: this.results.map((r) => ({
        suite: r.suite,
        passed: r.passed,
        duration: r.duration,
        exitCode: r.exitCode,
        critical: (() => {
          const suite = this.suites.find((s) => s.name === r.suite);
          return suite ? suite.critical : false;
        })(),
      })),
    };

    fs.writeFileSync("master-test-report.json", JSON.stringify(report, null, 2));
    console.log(chalk.gray("✓ Master report saved to master-test-report.json\n"));
  }
}

// Run comprehensive tests
const runner = new ComprehensiveTestRunner();
runner.runAll().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
