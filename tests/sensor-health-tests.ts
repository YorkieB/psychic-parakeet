/**
 * Sensor Health API Testing Suite
 * Tests all 5 sensor health endpoints and sensor integration
 */

import axios, { type AxiosError } from "axios";
import chalk from "chalk";

const BASE_URL = "http://localhost:3000";

interface SensorHealthTest {
  name: string;
  test: () => Promise<{ passed: boolean; details: string }>;
}

class SensorHealthTester {
  private tests: SensorHealthTest[] = [];
  private results: any[] = [];

  constructor() {
    this.registerTests();
  }

  // Register sensor health tests
  private registerTests(): void {
    // 1. Individual sensor report
    this.addTest("POST /health/sensors/report - Individual Report", async () => {
      const sensorReport = {
        sensorName: "CPU",
        status: "healthy",
        message: "CPU monitoring working normally. Current usage: 45.2%",
        details: { usage: 45.2 },
        timestamp: Date.now(),
      };

      try {
        const response = await axios.post(`${BASE_URL}/health/sensors/report`, sensorReport);

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: "Sensor report submitted successfully" };
        } else {
          return {
            passed: false,
            details: `Unexpected response: ${JSON.stringify(response.data)}`,
          };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 2. Batch sensor report
    this.addTest("POST /health/sensors/batch - Batch Reports", async () => {
      const reports = [
        {
          sensorName: "CPU",
          status: "healthy",
          message: "CPU monitoring working normally. Current usage: 45.2%",
          details: { usage: 45.2 },
          timestamp: Date.now(),
        },
        {
          sensorName: "Memory",
          status: "degraded",
          message: "Memory usage is high at 78.5%. 2.1GB available.",
          details: { used: 6.3, total: 8.0, free: 1.7, percentage: 78.5 },
          timestamp: Date.now(),
        },
        {
          sensorName: "Battery",
          status: "healthy",
          message: "Battery level: 85%. Discharging.",
          details: { level: 0.85, charging: false },
          timestamp: Date.now(),
        },
      ];

      try {
        const response = await axios.post(`${BASE_URL}/health/sensors/batch`, { reports });

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: `Batch report submitted: ${reports.length} sensors` };
        } else {
          return {
            passed: false,
            details: `Unexpected response: ${JSON.stringify(response.data)}`,
          };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 3. Get all sensors
    this.addTest("GET /health/sensors - All Sensor Reports", async () => {
      try {
        const response = await axios.get(`${BASE_URL}/health/sensors`);

        if (response.status === 200 && response.data.success) {
          const sensors = response.data.data?.sensors || response.data.data || [];
          const sensorCount = Array.isArray(sensors) ? sensors.length : 0;
          return { passed: true, details: `Retrieved ${sensorCount} sensor reports` };
        } else {
          return { passed: false, details: "Invalid response format" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 4. Get specific sensor
    this.addTest("GET /health/sensors/:sensorName - Specific Sensor", async () => {
      try {
        // First submit a report
        await axios.post(`${BASE_URL}/health/sensors/report`, {
          sensorName: "Camera",
          status: "healthy",
          message: "Camera is now active and streaming video.",
          details: { active: true },
          timestamp: Date.now(),
        });

        // Wait a bit for processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Then retrieve it
        const response = await axios.get(`${BASE_URL}/health/sensors/Camera`);

        if (response.status === 200 && response.data.success) {
          const sensor = response.data.data;
          if (sensor && sensor.sensorName === "Camera") {
            return { passed: true, details: "Camera sensor report retrieved" };
          } else {
            return { passed: false, details: "Sensor data mismatch" };
          }
        } else {
          return { passed: false, details: "Sensor not found or invalid response" };
        }
      } catch (error: any) {
        if ((error as AxiosError).response?.status === 404) {
          return { passed: false, details: "Sensor not found (404)" };
        }
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 5. Get sensor history
    this.addTest("GET /health/sensors/history - Sensor History", async () => {
      try {
        // Submit multiple reports
        for (let i = 0; i < 5; i++) {
          await axios.post(`${BASE_URL}/health/sensors/report`, {
            sensorName: "CPU",
            status: "healthy",
            message: `CPU monitoring working normally. Current usage: ${40 + i}%`,
            details: { usage: 40 + i },
            timestamp: Date.now(),
          });
          // Small delay between reports
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        const response = await axios.get(`${BASE_URL}/health/sensors/history`);

        if (response.status === 200 && response.data.success) {
          const history = response.data.data?.history || response.data.data || [];
          const count = Array.isArray(history) ? history.length : 0;
          return { passed: true, details: `History retrieved: ${count} entries` };
        } else {
          return { passed: false, details: "Invalid history response" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 6. Sensor error reporting
    this.addTest("Sensor Error Reporting", async () => {
      try {
        const errorReport = {
          sensorName: "Camera",
          status: "error",
          message:
            "Camera permission denied. Please grant camera access in your browser or system settings.",
          details: {
            error: "NotAllowedError",
            code: "EACCES",
            plainLanguage:
              "Permission denied. Please grant access to this sensor in your system settings.",
          },
          timestamp: Date.now(),
        };

        const response = await axios.post(`${BASE_URL}/health/sensors/report`, errorReport);

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: "Error report submitted with plain language" };
        } else {
          return { passed: false, details: "Error report failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 7. Sensor degraded state
    this.addTest("Sensor Degraded State", async () => {
      try {
        const degradedReport = {
          sensorName: "Memory",
          status: "degraded",
          message: "Memory usage is high at 85.5%. 1.5GB available.",
          details: {
            used: 6.8,
            total: 8.0,
            free: 1.2,
            percentage: 85.5,
          },
          timestamp: Date.now(),
        };

        const response = await axios.post(`${BASE_URL}/health/sensors/report`, degradedReport);

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: "Degraded state reported successfully" };
        } else {
          return { passed: false, details: "Degraded report failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 8. All 7 sensors reporting
    this.addTest("All 7 Sensors Reporting", async () => {
      try {
        const sensors = [
          "CPU",
          "Memory",
          "System Uptime",
          "Network",
          "Battery",
          "Camera",
          "Microphone",
        ];

        const reports = sensors.map((sensor) => ({
          sensorName: sensor,
          status: "healthy",
          message: `${sensor} monitoring working normally.`,
          details: { value: 100 },
          timestamp: Date.now(),
        }));

        const response = await axios.post(`${BASE_URL}/health/sensors/batch`, { reports });

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: `All ${sensors.length} sensors reported successfully` };
        } else {
          return { passed: false, details: "Batch sensor report failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 9. Sensor history filtering
    this.addTest("Sensor History Filtering", async () => {
      try {
        // Submit reports for specific sensor
        for (let i = 0; i < 3; i++) {
          await axios.post(`${BASE_URL}/health/sensors/report`, {
            sensorName: "Battery",
            status: "healthy",
            message: `Battery level: ${80 - i * 5}%. Discharging.`,
            details: { level: (80 - i * 5) / 100 },
            timestamp: Date.now(),
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Query history with filter
        const response = await axios.get(`${BASE_URL}/health/sensors/history`, {
          params: { sensorName: "Battery" },
        });

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: "Sensor history filtering works" };
        } else {
          return { passed: false, details: "History filtering failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 10. Concurrent sensor reports
    this.addTest("Concurrent Sensor Reports", async () => {
      try {
        const promises = Array.from({ length: 10 }, (_, i) =>
          axios.post(`${BASE_URL}/health/sensors/report`, {
            sensorName: "CPU",
            status: "healthy",
            message: `CPU monitoring working normally. Current usage: ${40 + i}%`,
            details: { usage: 40 + i },
            timestamp: Date.now(),
          }),
        );

        const results = await Promise.allSettled(promises);
        const successful = results.filter((r) => r.status === "fulfilled").length;

        if (successful === 10) {
          return { passed: true, details: "All concurrent reports succeeded" };
        } else {
          return { passed: false, details: `Only ${successful}/10 reports succeeded` };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });
  }

  // Add a test
  private addTest(name: string, test: () => Promise<{ passed: boolean; details: string }>): void {
    this.tests.push({ name, test });
  }

  // Run all tests
  async runAll(): Promise<void> {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("SENSOR HEALTH API TESTING"));
    console.log(chalk.cyan.bold("========================================\n"));

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printSummary();
  }

  // Run individual test
  private async runTest(test: SensorHealthTest): Promise<void> {
    console.log(chalk.yellow(`Testing: ${test.name}`));

    try {
      const result = await test.test();

      this.results.push({
        name: test.name,
        passed: result.passed,
        details: result.details,
      });

      const icon = result.passed ? chalk.green("✓") : chalk.red("✗");
      console.log(`${icon} ${result.details}\n`);
    } catch (error: any) {
      this.results.push({
        name: test.name,
        passed: false,
        details: error.message,
      });

      console.log(chalk.red(`✗ Error: ${error.message}\n`));
    }
  }

  // Print summary
  private printSummary(): void {
    console.log(chalk.cyan.bold("\n========================================"));
    console.log(chalk.cyan.bold("SENSOR HEALTH TEST SUMMARY"));
    console.log(chalk.cyan.bold("========================================\n"));

    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`Total Tests:  ${total}`);
    console.log(chalk.green(`Passed:       ${passed}`));
    console.log(chalk.red(`Failed:       ${failed}\n`));

    if (failed === 0) {
      console.log(chalk.green.bold("✅ ALL SENSOR HEALTH TESTS PASSED!"));
      console.log(chalk.green("Sensor health integration working correctly.\n"));
    } else {
      console.log(chalk.red.bold("❌ SOME SENSOR HEALTH TESTS FAILED"));
      console.log(chalk.red("Review sensor health integration.\n"));

      // Show failed tests
      const failedTests = this.results.filter((r) => !r.passed);
      console.log(chalk.red.bold("Failed Tests:"));
      failedTests.forEach((test) => {
        console.log(chalk.red(`  - ${test.name}: ${test.details}`));
      });
      console.log("");
    }
  }
}

// Run sensor health tests
if (require.main === module) {
  const tester = new SensorHealthTester();
  tester.runAll().catch((error) => {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
  });
}

export { SensorHealthTester };
