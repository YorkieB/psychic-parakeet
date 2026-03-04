/**
 * Performance Benchmark Suite
 * Benchmark performance of all critical endpoints
 */

import fs from "node:fs";
import axios from "axios";
import chalk from "chalk";

const BASE_URL = "http://localhost:3000";
const ITERATIONS = 100; // Number of requests per endpoint
const CONCURRENT = 10; // Concurrent requests

interface BenchmarkResult {
  endpoint: string;
  method: string;
  iterations: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
  requestsPerSecond: number;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  // Benchmark an endpoint
  async benchmarkEndpoint(
    name: string,
    method: string,
    url: string,
    data?: any,
    headers?: any,
  ): Promise<BenchmarkResult> {
    console.log(chalk.cyan(`\nBenchmarking ${name}...`));

    const responseTimes: number[] = [];
    const errors: number[] = [];
    const startTime = Date.now();

    // Run iterations in batches
    for (let i = 0; i < ITERATIONS; i += CONCURRENT) {
      const batch = Math.min(CONCURRENT, ITERATIONS - i);
      const promises = Array.from({ length: batch }, () =>
        this.makeRequest(method, url, data, headers),
      );

      const results = await Promise.allSettled(promises);

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          responseTimes.push(result.value);
        } else {
          errors.push(1);
        }
      });

      // Progress indicator
      process.stdout.write(`\r  Progress: ${i + batch}/${ITERATIONS}`);
    }

    const totalTime = Date.now() - startTime;
    console.log(""); // New line after progress

    // Calculate statistics
    responseTimes.sort((a, b) => a - b);

    const result: BenchmarkResult = {
      endpoint: name,
      method,
      iterations: ITERATIONS,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50: this.percentile(responseTimes, 50),
      p95: this.percentile(responseTimes, 95),
      p99: this.percentile(responseTimes, 99),
      successRate: (responseTimes.length / ITERATIONS) * 100,
      requestsPerSecond: ITERATIONS / (totalTime / 1000),
    };

    this.printResult(result);
    this.results.push(result);

    return result;
  }

  // Make HTTP request
  private async makeRequest(
    method: string,
    url: string,
    data?: any,
    headers?: any,
  ): Promise<number> {
    const startTime = Date.now();

    await axios({
      method,
      url,
      data,
      headers,
      timeout: 30000,
    });

    return Date.now() - startTime;
  }

  // Calculate percentile
  private percentile(arr: number[], p: number): number {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[index] || 0;
  }

  // Print result
  private printResult(result: BenchmarkResult): void {
    console.log(chalk.gray(`  Avg: ${result.avgResponseTime.toFixed(2)}ms`));
    console.log(chalk.gray(`  Min: ${result.minResponseTime}ms`));
    console.log(chalk.gray(`  Max: ${result.maxResponseTime}ms`));
    console.log(chalk.gray(`  P50: ${result.p50}ms`));
    console.log(chalk.gray(`  P95: ${result.p95}ms`));
    console.log(chalk.gray(`  P99: ${result.p99}ms`));
    console.log(chalk.gray(`  Success Rate: ${result.successRate.toFixed(2)}%`));
    console.log(chalk.gray(`  Req/s: ${result.requestsPerSecond.toFixed(2)}`));

    // Performance assessment
    if (result.avgResponseTime < 100) {
      console.log(chalk.green(`  ✓ Excellent performance`));
    } else if (result.avgResponseTime < 500) {
      console.log(chalk.yellow(`  ⚠ Acceptable performance`));
    } else {
      console.log(chalk.red(`  ✗ Poor performance`));
    }
  }

  // Run all benchmarks
  async runAll(): Promise<void> {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("PERFORMANCE BENCHMARK"));
    console.log(chalk.cyan.bold("========================================"));
    console.log(chalk.gray(`Iterations per endpoint: ${ITERATIONS}`));
    console.log(chalk.gray(`Concurrent requests: ${CONCURRENT}\n`));

    // Health endpoints
    await this.benchmarkEndpoint("Health Check", "GET", `${BASE_URL}/health`);
    await this.benchmarkEndpoint("Readiness Check", "GET", `${BASE_URL}/ready`);

    // Agent endpoints
    await this.benchmarkEndpoint("List Agents", "GET", `${BASE_URL}/api/agents`);
    await this.benchmarkEndpoint("Get Agent", "GET", `${BASE_URL}/api/agents/Dialogue`);

    // System endpoints
    await this.benchmarkEndpoint("System Info", "GET", `${BASE_URL}/api/system/info`);
    await this.benchmarkEndpoint("System Stats", "GET", `${BASE_URL}/api/stats`);

    // Print summary
    this.printSummary();
    this.saveReport();
  }

  // Print summary
  private printSummary(): void {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("PERFORMANCE SUMMARY"));
    console.log(chalk.cyan.bold("========================================\n"));

    console.log(chalk.bold("Endpoint Performance Rankings:\n"));

    const sorted = [...this.results].sort((a, b) => a.avgResponseTime - b.avgResponseTime);

    sorted.forEach((result, index) => {
      const icon =
        result.avgResponseTime < 100
          ? chalk.green("🚀")
          : result.avgResponseTime < 500
            ? chalk.yellow("⚡")
            : chalk.red("🐌");

      console.log(
        `${icon} ${index + 1}. ${result.endpoint} - ${result.avgResponseTime.toFixed(2)}ms avg`,
      );
    });

    console.log();

    // Overall stats
    const avgAll =
      this.results.reduce((sum, r) => sum + r.avgResponseTime, 0) / this.results.length;
    const totalRequests = this.results.reduce((sum, r) => sum + r.iterations, 0);

    console.log(chalk.bold("Overall Statistics:"));
    console.log(`  Average Response Time: ${avgAll.toFixed(2)}ms`);
    console.log(`  Total Requests: ${totalRequests}`);
    console.log(
      `  Success Rate: ${(this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length).toFixed(2)}%`,
    );
  }

  // Save report
  private saveReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      config: {
        iterations: ITERATIONS,
        concurrent: CONCURRENT,
      },
      results: this.results,
    };

    fs.writeFileSync("performance-benchmark.json", JSON.stringify(report, null, 2));
    console.log(chalk.gray("\n✓ Benchmark report saved to performance-benchmark.json\n"));
  }
}

// Run benchmarks
const benchmark = new PerformanceBenchmark();
benchmark.runAll().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
