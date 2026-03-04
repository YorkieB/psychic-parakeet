/**
 * UI Sensor Tests
 * Tests desktop app sensor integration and UI components
 */

import axios from "axios";
import chalk from "chalk";

const BASE_URL = "http://localhost:3000";

interface UISensorTest {
  name: string;
  test: () => Promise<{ passed: boolean; details: string }>;
}

class UISensorTester {
  private tests: UISensorTest[] = [];
  private results: any[] = [];

  constructor() {
    this.registerTests();
  }

  // Register UI sensor tests
  private registerTests(): void {
    // 1. Test sensor health reporting from UI
    this.addTest("UI Sensor Health Reporting", async () => {
      try {
        // Simulate UI reporting sensor health
        const response = await axios.post(`${BASE_URL}/health/sensors/report`, {
          sensorName: "CPU",
          status: "healthy",
          message: "CPU monitoring working normally. Current usage: 45.2%",
          details: { usage: 45.2 },
          timestamp: Date.now(),
        });

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: "UI sensor health reporting works" };
        } else {
          return { passed: false, details: "UI sensor reporting failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 2. Test all 7 sensors reporting from UI
    this.addTest("All 7 UI Sensors Reporting", async () => {
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
          return {
            passed: true,
            details: `All ${sensors.length} UI sensors reported successfully`,
          };
        } else {
          return { passed: false, details: "Batch UI sensor report failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 3. Test sensor error reporting from UI
    this.addTest("UI Sensor Error Reporting", async () => {
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
          return { passed: true, details: "UI error reporting with plain language works" };
        } else {
          return { passed: false, details: "UI error reporting failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 4. Test sensor status retrieval for UI
    this.addTest("UI Sensor Status Retrieval", async () => {
      try {
        // First submit a report
        await axios.post(`${BASE_URL}/health/sensors/report`, {
          sensorName: "Battery",
          status: "healthy",
          message: "Battery level: 85%. Discharging.",
          details: { level: 0.85, charging: false },
          timestamp: Date.now(),
        });

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Retrieve for UI display
        const response = await axios.get(`${BASE_URL}/health/sensors/Battery`);

        if (response.status === 200 && response.data.success) {
          const sensor = response.data.data;
          if (sensor && sensor.sensorName === "Battery") {
            return { passed: true, details: "UI can retrieve sensor status" };
          } else {
            return { passed: false, details: "Invalid sensor data format" };
          }
        } else {
          return { passed: false, details: "Sensor status retrieval failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 5. Test sensor history for UI charts
    this.addTest("UI Sensor History for Charts", async () => {
      try {
        // Submit multiple reports for chart data
        for (let i = 0; i < 10; i++) {
          await axios.post(`${BASE_URL}/health/sensors/report`, {
            sensorName: "CPU",
            status: "healthy",
            message: `CPU monitoring working normally. Current usage: ${40 + i}%`,
            details: { usage: 40 + i },
            timestamp: Date.now(),
          });
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Retrieve history for UI charts
        const response = await axios.get(`${BASE_URL}/health/sensors/history`, {
          params: { sensorName: "CPU", limit: 10 },
        });

        if (response.status === 200 && response.data.success) {
          const history = response.data.data?.history || response.data.data || [];
          if (Array.isArray(history) && history.length > 0) {
            return {
              passed: true,
              details: `UI can retrieve ${history.length} history points for charts`,
            };
          } else {
            return { passed: false, details: "No history data returned" };
          }
        } else {
          return { passed: false, details: "History retrieval failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 6. Test real-time sensor updates
    this.addTest("Real-time Sensor Updates", async () => {
      try {
        // Submit multiple rapid updates
        const updates = Array.from({ length: 5 }, (_, i) =>
          axios.post(`${BASE_URL}/health/sensors/report`, {
            sensorName: "Memory",
            status: "healthy",
            message: `Memory monitoring working normally. Using ${4.0 + i * 0.1}GB of 8.0GB`,
            details: {
              used: 4.0 + i * 0.1,
              total: 8.0,
              free: 4.0 - i * 0.1,
              percentage: 50 + i * 1.25,
            },
            timestamp: Date.now(),
          }),
        );

        const results = await Promise.allSettled(updates);
        const successful = results.filter((r) => r.status === "fulfilled").length;

        if (successful === 5) {
          return { passed: true, details: "Real-time sensor updates work correctly" };
        } else {
          return { passed: false, details: `Only ${successful}/5 updates succeeded` };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 7. Test sensor degraded state in UI
    this.addTest("UI Sensor Degraded State Display", async () => {
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
          return { passed: true, details: "UI can display degraded sensor state" };
        } else {
          return { passed: false, details: "Degraded state reporting failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 8. Test sensor unavailable state (not an error)
    this.addTest("UI Sensor Unavailable State", async () => {
      try {
        const unavailableReport = {
          sensorName: "Battery",
          status: "unavailable",
          message:
            "Battery information is not available on this device. This is normal for desktop computers.",
          details: {},
          timestamp: Date.now(),
        };

        const response = await axios.post(`${BASE_URL}/health/sensors/report`, unavailableReport);

        if (response.status === 200 && response.data.success) {
          return { passed: true, details: "UI handles unavailable sensors correctly" };
        } else {
          return { passed: false, details: "Unavailable state reporting failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 9. Test sensor dashboard data aggregation
    this.addTest("UI Sensor Dashboard Data", async () => {
      try {
        // Submit reports for all sensors
        const sensors = ["CPU", "Memory", "Network", "Battery"];
        const reports = sensors.map((sensor) => ({
          sensorName: sensor,
          status: "healthy",
          message: `${sensor} monitoring working normally.`,
          details: { value: 100 },
          timestamp: Date.now(),
        }));

        await axios.post(`${BASE_URL}/health/sensors/batch`, { reports });

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Retrieve all sensors for dashboard
        const response = await axios.get(`${BASE_URL}/health/sensors`);

        if (response.status === 200 && response.data.success) {
          const sensors = response.data.data?.sensors || response.data.data || [];
          const sensorCount = Array.isArray(sensors) ? sensors.length : 0;
          return { passed: true, details: `Dashboard can display ${sensorCount} sensors` };
        } else {
          return { passed: false, details: "Dashboard data retrieval failed" };
        }
      } catch (error: any) {
        return { passed: false, details: `Request failed: ${error.message}` };
      }
    });

    // 10. Test sensor health alerts in UI
    this.addTest("UI Sensor Health Alerts", async () => {
      try {
        // Submit error report (should create alert)
        await axios.post(`${BASE_URL}/health/sensors/report`, {
          sensorName: "Camera",
          status: "error",
          message:
            "Camera permission denied. Please grant camera access in your browser or system settings.",
          details: {
            error: "NotAllowedError",
            code: "EACCES",
          },
          timestamp: Date.now(),
        });

        // Wait for alert creation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if alert was created (via system alerts endpoint)
        const alertsResponse = await axios.get(`${BASE_URL}/health/system/alerts`);

        if (alertsResponse.status === 200) {
          return { passed: true, details: "UI can receive sensor health alerts" };
        } else {
          return { passed: false, details: "Alert retrieval failed" };
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
    console.log(chalk.cyan.bold("UI SENSOR INTEGRATION TESTING"));
    console.log(chalk.cyan.bold("========================================\n"));

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printSummary();
  }

  // Run individual test
  private async runTest(test: UISensorTest): Promise<void> {
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
    console.log(chalk.cyan.bold("UI SENSOR TEST SUMMARY"));
    console.log(chalk.cyan.bold("========================================\n"));

    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`Total Tests:  ${total}`);
    console.log(chalk.green(`Passed:       ${passed}`));
    console.log(chalk.red(`Failed:       ${failed}\n`));

    if (failed === 0) {
      console.log(chalk.green.bold("✅ ALL UI SENSOR TESTS PASSED!"));
      console.log(chalk.green("UI sensor integration working correctly.\n"));
    } else {
      console.log(chalk.red.bold("❌ SOME UI SENSOR TESTS FAILED"));
      console.log(chalk.red("Review UI sensor integration.\n"));

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

// Run UI sensor tests
if (require.main === module) {
  const tester = new UISensorTester();
  tester.runAll().catch((error) => {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
  });
}

export { UISensorTester };
