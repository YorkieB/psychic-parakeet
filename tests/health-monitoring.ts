/**
 * Continuous Health Monitoring
 * Real-time system health monitoring with alerting
 */

import fs from "node:fs";
import axios from "axios";
import chalk from "chalk";

const BASE_URL = "http://localhost:3000";
const CHECK_INTERVAL = 30000; // 30 seconds
const ALERT_THRESHOLD = 3; // Alert after 3 consecutive failures

interface HealthCheck {
  endpoint: string;
  name: string;
  critical: boolean;
}

interface HealthStatus {
  endpoint: string;
  status: "healthy" | "degraded" | "down";
  consecutiveFailures: number;
  lastCheck: Date;
  responseTime: number;
  error?: string;
}

class HealthMonitor {
  private checks: HealthCheck[] = [
    { endpoint: "/health", name: "Main Server", critical: true },
    { endpoint: "/ready", name: "Readiness", critical: true },
    { endpoint: "/api/agents", name: "Agent Registry", critical: true },
    { endpoint: "http://localhost:3001/health", name: "Dialogue Agent", critical: true },
    { endpoint: "http://localhost:3038/health", name: "Security Agent", critical: true },
    { endpoint: "/api/analytics/overview", name: "Analytics API", critical: false },
    { endpoint: "/health/system", name: "System Health", critical: false },
  ];

  private statuses: Map<string, HealthStatus> = new Map();
  private alertLog: any[] = [];
  private isRunning = false;

  // Start monitoring
  start(): void {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("JARVIS HEALTH MONITORING STARTED"));
    console.log(chalk.cyan.bold("========================================"));
    console.log(chalk.gray(`Check interval: ${CHECK_INTERVAL / 1000}s`));
    console.log(chalk.gray(`Alert threshold: ${ALERT_THRESHOLD} failures\n`));

    this.isRunning = true;
    this.monitorLoop();

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\n\nStopping health monitor..."));
      this.stop();
      process.exit(0);
    });
  }

  // Stop monitoring
  stop(): void {
    this.isRunning = false;
    this.saveReport();
  }

  // Main monitoring loop
  private async monitorLoop(): Promise<void> {
    while (this.isRunning) {
      await this.runChecks();
      await this.sleep(CHECK_INTERVAL);
    }
  }

  // Run all health checks
  private async runChecks(): Promise<void> {
    console.log(chalk.gray(`[${new Date().toISOString()}] Running health checks...`));

    const results = await Promise.allSettled(this.checks.map((check) => this.checkEndpoint(check)));

    let healthyCount = 0;
    let degradedCount = 0;
    let downCount = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const status = result.value;
        this.statuses.set(this.checks[index].endpoint, status);

        if (status.status === "healthy") healthyCount++;
        else if (status.status === "degraded") degradedCount++;
        else downCount++;

        this.printStatus(this.checks[index], status);
        this.checkAlert(this.checks[index], status);
      }
    });

    console.log(
      chalk.gray(
        `Summary: ${healthyCount} healthy, ${degradedCount} degraded, ${downCount} down\n`,
      ),
    );
  }

  // Check individual endpoint
  private async checkEndpoint(check: HealthCheck): Promise<HealthStatus> {
    const startTime = Date.now();
    const currentStatus = this.statuses.get(check.endpoint);

    try {
      const url = check.endpoint.startsWith("http")
        ? check.endpoint
        : `${BASE_URL}${check.endpoint}`;

      const response = await axios.get(url, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        return {
          endpoint: check.endpoint,
          status: "healthy",
          consecutiveFailures: 0,
          lastCheck: new Date(),
          responseTime,
        };
      } else {
        return {
          endpoint: check.endpoint,
          status: "degraded",
          consecutiveFailures: (currentStatus?.consecutiveFailures || 0) + 1,
          lastCheck: new Date(),
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        endpoint: check.endpoint,
        status: "down",
        consecutiveFailures: (currentStatus?.consecutiveFailures || 0) + 1,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // Print status line
  private printStatus(check: HealthCheck, status: HealthStatus): void {
    const name = check.name.padEnd(20);
    const responseTime = `${status.responseTime}ms`.padEnd(10);

    if (status.status === "healthy") {
      console.log(`  ${chalk.green("✓")} ${name} ${chalk.gray(responseTime)}`);
    } else if (status.status === "degraded") {
      console.log(
        `  ${chalk.yellow("⚠")} ${name} ${chalk.gray(responseTime)} ${chalk.yellow(status.error)}`,
      );
    } else {
      console.log(
        `  ${chalk.red("✗")} ${name} ${chalk.gray(responseTime)} ${chalk.red(status.error)}`,
      );
    }
  }

  // Check if alert should be triggered
  private checkAlert(check: HealthCheck, status: HealthStatus): void {
    if (status.consecutiveFailures >= ALERT_THRESHOLD && check.critical) {
      const alert = {
        timestamp: new Date().toISOString(),
        endpoint: check.endpoint,
        name: check.name,
        status: status.status,
        failures: status.consecutiveFailures,
        error: status.error,
      };

      this.alertLog.push(alert);

      console.log(
        chalk.red.bold(`\n🚨 ALERT: ${check.name} has failed ${status.consecutiveFailures} times!`),
      );
      console.log(chalk.red(`   Error: ${status.error}\n`));

      // Here you could send alerts via email, Slack, PagerDuty, etc.
      this.sendAlert(alert);
    }
  }

  // Send alert (implement your notification system)
  private sendAlert(alert: any): void {
    // TODO: Implement actual alerting (email, Slack, SMS, etc.)
    fs.appendFileSync("health-alerts.log", JSON.stringify(alert) + "\n");
  }

  // Save monitoring report
  private saveReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now(),
      statuses: Array.from(this.statuses.entries()).map(([endpoint, status]) => ({
        endpoint,
        ...status,
      })),
      alerts: this.alertLog,
    };

    fs.writeFileSync("health-monitoring-report.json", JSON.stringify(report, null, 2));
    console.log(chalk.gray("\n✓ Monitoring report saved to health-monitoring-report.json"));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Run monitor
const monitor = new HealthMonitor();
monitor.start();
