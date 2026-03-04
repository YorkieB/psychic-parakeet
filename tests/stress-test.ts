/**
 * Stress Testing Suite
 * Stress test the system under heavy load
 */

import fs from "node:fs";
import axios from "axios";
import chalk from "chalk";

const BASE_URL = "http://localhost:3000";

interface StressTestConfig {
  duration: number; // seconds
  rampUpTime: number; // seconds
  maxConcurrentUsers: number;
  requestsPerSecond: number;
}

interface StressTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errors: Map<number, number>; // status code -> count
}

class StressTest {
  private config: StressTestConfig = {
    duration: 60, // 1 minute
    rampUpTime: 10, // 10 seconds
    maxConcurrentUsers: 100,
    requestsPerSecond: 50,
  };

  private results: StressTestResult = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    requestsPerSecond: 0,
    errors: new Map(),
  };

  private responseTimes: number[] = [];

  // Run stress test
  async run(): Promise<void> {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("STRESS TEST"));
    console.log(chalk.cyan.bold("========================================"));
    console.log(chalk.gray(`Duration: ${this.config.duration}s`));
    console.log(chalk.gray(`Ramp-up: ${this.config.rampUpTime}s`));
    console.log(chalk.gray(`Max users: ${this.config.maxConcurrentUsers}`));
    console.log(chalk.gray(`Target RPS: ${this.config.requestsPerSecond}\n`));

    this.isRunning = true;
    const startTime = Date.now();

    // Ramp up phase
    console.log(chalk.yellow("Ramping up..."));
    await this.rampUp();

    // Sustained load phase
    console.log(chalk.yellow("Applying sustained load..."));
    const sustainedDuration = this.config.duration - this.config.rampUpTime;
    await this.sustainedLoad(sustainedDuration);

    const totalDuration = (Date.now() - startTime) / 1000;
    this.results.requestsPerSecond = this.results.totalRequests / totalDuration;

    this.calculateMetrics();
    this.printResults();
    this.saveReport();
  }

  // Ramp up phase
  private async rampUp(): Promise<void> {
    const steps = 10;
    const stepDuration = this.config.rampUpTime / steps;
    const usersPerStep = this.config.maxConcurrentUsers / steps;

    for (let i = 1; i <= steps; i++) {
      const currentUsers = Math.floor(usersPerStep * i);
      await this.sendRequests(currentUsers, stepDuration);

      process.stdout.write(`\r  Users: ${currentUsers}/${this.config.maxConcurrentUsers}`);
    }

    console.log("");
  }

  // Sustained load phase
  private async sustainedLoad(duration: number): Promise<void> {
    const steps = Math.ceil(duration);

    for (let i = 0; i < steps; i++) {
      await this.sendRequests(this.config.maxConcurrentUsers, 1);

      process.stdout.write(
        `\r  Time remaining: ${steps - i}s | Requests: ${this.results.totalRequests}`,
      );
    }

    console.log("");
  }

  // Send batch of requests
  private async sendRequests(concurrent: number, duration: number): Promise<void> {
    const requests = [];
    const requestsToSend = Math.floor(this.config.requestsPerSecond * duration);

    for (let i = 0; i < requestsToSend; i++) {
      if (i % concurrent === 0 && i > 0) {
        await Promise.allSettled(requests);
        requests.length = 0;
      }

      requests.push(this.makeRequest());
    }

    if (requests.length > 0) {
      await Promise.allSettled(requests);
    }
  }

  // Make single request
  private async makeRequest(): Promise<void> {
    const startTime = Date.now();
    this.results.totalRequests++;

    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 30000 });

      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);

      if (response.status === 200) {
        this.results.successfulRequests++;
      } else {
        this.results.failedRequests++;
        this.results.errors.set(
          response.status,
          (this.results.errors.get(response.status) || 0) + 1,
        );
      }
    } catch (error: any) {
      this.results.failedRequests++;
      const status = error.response?.status || 0;
      this.results.errors.set(status, (this.results.errors.get(status) || 0) + 1);
    }
  }

  // Calculate metrics
  private calculateMetrics(): void {
    if (this.responseTimes.length > 0) {
      this.results.averageResponseTime =
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

      this.results.maxResponseTime = Math.max(...this.responseTimes);
      this.results.minResponseTime = Math.min(...this.responseTimes);
    }
  }

  // Print results
  private printResults(): void {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("STRESS TEST RESULTS"));
    console.log(chalk.cyan.bold("========================================\n"));

    console.log(chalk.bold("Request Statistics:"));
    console.log(`  Total Requests:     ${this.results.totalRequests.toLocaleString()}`);
    console.log(
      chalk.green(`  Successful:         ${this.results.successfulRequests.toLocaleString()}`),
    );
    console.log(chalk.red(`  Failed:             ${this.results.failedRequests.toLocaleString()}`));
    console.log(
      `  Success Rate:       ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%\n`,
    );

    console.log(chalk.bold("Performance:"));
    console.log(`  Requests/Second:    ${this.results.requestsPerSecond.toFixed(2)}`);
    console.log(`  Avg Response Time:  ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Min Response Time:  ${this.results.minResponseTime}ms`);
    console.log(`  Max Response Time:  ${this.results.maxResponseTime}ms\n`);

    if (this.results.errors.size > 0) {
      console.log(chalk.bold("Errors by Status Code:"));
      Array.from(this.results.errors.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          console.log(`  ${status}: ${count}`);
        });
      console.log("");
    }

    // Assessment
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;

    if (successRate >= 99 && this.results.averageResponseTime < 500) {
      console.log(chalk.green.bold("✅ EXCELLENT - System handles stress well"));
    } else if (successRate >= 95 && this.results.averageResponseTime < 1000) {
      console.log(chalk.yellow.bold("⚠️  ACCEPTABLE - System stable under load"));
    } else {
      console.log(chalk.red.bold("❌ POOR - System struggles under stress"));
    }

    console.log("");
  }

  // Save report
  private saveReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: {
        ...this.results,
        errors: Array.from(this.results.errors.entries()),
      },
    };

    fs.writeFileSync("stress-test-report.json", JSON.stringify(report, null, 2));
    console.log(chalk.gray("✓ Stress test report saved to stress-test-report.json\n"));
  }
}

// Run stress test
const stressTest = new StressTest();
stressTest.run().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
