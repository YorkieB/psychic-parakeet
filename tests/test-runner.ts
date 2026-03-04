/**
 * Automated Test Runner for Jarvis API Endpoints
 * TypeScript-based test runner with detailed reporting
 */

import * as fs from "node:fs";
import * as path from "node:path";
import fetch from "node-fetch";

interface TestResult {
  group: string;
  testNumber: number;
  description: string;
  method: string;
  url: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  responseTime: number;
  error?: string;
  response?: any;
}

interface TestGroup {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

class TestRunner {
  private baseUrl: string = "http://localhost:3000";
  private securityUrl: string = "http://localhost:3038";
  private token: string = "";
  private refreshToken: string = "";
  private webhookId: string = "";
  private agentName: string = "Dialogue";

  private results: TestResult[] = [];
  private groups: Map<string, TestGroup> = new Map();

  private readonly agents = [
    { name: "Dialogue", port: 3001 },
    { name: "Web", port: 3002 },
    { name: "Knowledge", port: 3003 },
    { name: "Finance", port: 3004 },
    { name: "Calendar", port: 3005 },
    { name: "Email", port: 3006 },
    { name: "Code", port: 3007 },
    { name: "Voice", port: 3008 },
    { name: "Music", port: 3009 },
    { name: "Image", port: 3010 },
    { name: "Video", port: 3011 },
    { name: "Spotify", port: 3012 },
    { name: "AppleMusic", port: 3013 },
    { name: "Weather", port: 3015 },
    { name: "News", port: 3016 },
    { name: "Reminder", port: 3017 },
    { name: "Timer", port: 3018 },
    { name: "Alarm", port: 3019 },
    { name: "Story", port: 3020 },
    { name: "Calculator", port: 3023 },
    { name: "UnitConverter", port: 3024 },
    { name: "Translation", port: 3025 },
    { name: "Command", port: 3026 },
    { name: "Context", port: 3027 },
    { name: "Memory", port: 3028 },
    { name: "Emotion", port: 3029 },
    { name: "File", port: 3030 },
    { name: "ComputerControl", port: 3031 },
    { name: "LLM", port: 3032 },
    { name: "Personality", port: 3033 },
    { name: "Listening", port: 3029 },
    { name: "Speech", port: 3035 },
    { name: "VoiceCommand", port: 3036 },
    { name: "Reliability", port: 3032 },
    { name: "EmotionsEngine", port: 3034 },
    { name: "MemorySystem", port: 3036 },
    { name: "VisualEngine", port: 3037 },
  ];

  async testEndpoint(
    group: string,
    method: string,
    url: string,
    data: any = null,
    expectedStatus: number = 200,
    description: string,
  ): Promise<TestResult> {
    const startTime = Date.now();
    const testNumber = this.results.length + 1;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let actualStatus = 0;
    let error: string | undefined;
    let response: any;

    try {
      const fetchOptions: any = {
        method,
        headers,
      };

      if (data) {
        fetchOptions.body = JSON.stringify(data);
      }

      const res = await fetch(url, fetchOptions);
      actualStatus = res.status;

      try {
        response = await res.json();
      } catch {
        response = await res.text();
      }
    } catch (err: any) {
      error = err.message;
      actualStatus = 0;
    }

    const responseTime = Date.now() - startTime;
    const passed = actualStatus === expectedStatus;

    const result: TestResult = {
      group,
      testNumber,
      description,
      method,
      url,
      expectedStatus,
      actualStatus,
      passed,
      responseTime,
      error,
      response,
    };

    this.results.push(result);

    // Update group stats
    if (!this.groups.has(group)) {
      this.groups.set(group, {
        name: group,
        tests: [],
        passed: 0,
        failed: 0,
      });
    }

    const groupData = this.groups.get(group)!;
    groupData.tests.push(result);
    if (passed) {
      groupData.passed++;
    } else {
      groupData.failed++;
    }

    // Log result
    const status = passed ? "✓ PASSED" : "✗ FAILED";
    const color = passed ? "\x1b[32m" : "\x1b[31m";
    console.log(`${color}${status}\x1b[0m Test ${testNumber}: ${description} (${responseTime}ms)`);
    if (!passed) {
      console.log(`  Expected: ${expectedStatus}, Got: ${actualStatus}`);
      if (error) console.log(`  Error: ${error}`);
    }

    return result;
  }

  async runAllTests(): Promise<void> {
    console.log("=========================================");
    console.log("JARVIS API ENDPOINT TESTING SUITE");
    console.log("=========================================");
    console.log(`Started at: ${new Date().toISOString()}\n`);

    // Group 1: Health & Status
    console.log("\n=========================================");
    console.log("GROUP 1: HEALTH & STATUS ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/health`,
      null,
      200,
      "Basic health check",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/ready`,
      null,
      200,
      "Readiness check",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/health/live`,
      null,
      200,
      "Liveness probe",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/health/ready`,
      null,
      200,
      "Readiness probe",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/health/metrics`,
      null,
      200,
      "Health metrics",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/health/dependencies`,
      null,
      200,
      "Dependencies health",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/health/detailed`,
      null,
      200,
      "Detailed health",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/status`,
      null,
      200,
      "System status",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/ping`,
      null,
      200,
      "Ping endpoint",
    );
    await this.testEndpoint(
      "Health & Status",
      "GET",
      `${this.baseUrl}/api/version`,
      null,
      200,
      "Version info",
    );

    // Group 2: Authentication
    console.log("\n=========================================");
    console.log("GROUP 2: AUTHENTICATION ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Authentication",
      "POST",
      `${this.baseUrl}/api/auth/register`,
      {
        email: "test@jarvis.ai",
        password: "Test123456!",
        name: "Test User",
      },
      201,
      "Register new user",
    );

    const loginResponse = await this.testEndpoint(
      "Authentication",
      "POST",
      `${this.baseUrl}/api/auth/login`,
      {
        email: "test@jarvis.ai",
        password: "Test123456!",
      },
      200,
      "User login",
    );

    if (loginResponse.response?.data?.accessToken) {
      this.token = loginResponse.response.data.accessToken;
      this.refreshToken = loginResponse.response.data.refreshToken || "";
    }

    await this.testEndpoint(
      "Authentication",
      "GET",
      `${this.baseUrl}/api/auth/me`,
      null,
      200,
      "Get current user",
    );
    await this.testEndpoint(
      "Authentication",
      "GET",
      `${this.baseUrl}/api/auth/check`,
      null,
      200,
      "Check authentication",
    );
    await this.testEndpoint(
      "Authentication",
      "GET",
      `${this.baseUrl}/api/auth/sessions`,
      null,
      200,
      "List sessions",
    );
    await this.testEndpoint(
      "Authentication",
      "GET",
      `${this.baseUrl}/api/auth/stats`,
      null,
      200,
      "Auth statistics",
    );

    if (this.refreshToken) {
      await this.testEndpoint(
        "Authentication",
        "POST",
        `${this.baseUrl}/api/auth/refresh`,
        {
          refreshToken: this.refreshToken,
        },
        200,
        "Refresh token",
      );
    }

    await this.testEndpoint(
      "Authentication",
      "POST",
      `${this.baseUrl}/api/auth/change-password`,
      {
        currentPassword: "Test123456!",
        newPassword: "NewTest123456!",
      },
      200,
      "Change password",
    );

    await this.testEndpoint(
      "Authentication",
      "POST",
      `${this.baseUrl}/api/auth/reset-password`,
      {
        email: "test@jarvis.ai",
      },
      200,
      "Reset password request",
    );

    await this.testEndpoint(
      "Authentication",
      "POST",
      `${this.baseUrl}/api/auth/verify-email`,
      {
        token: "test-token",
      },
      200,
      "Verify email",
    );

    if (this.token) {
      await this.testEndpoint(
        "Authentication",
        "POST",
        `${this.baseUrl}/api/auth/verify-token`,
        {
          token: this.token,
        },
        200,
        "Verify token",
      );
    }

    if (this.refreshToken) {
      await this.testEndpoint(
        "Authentication",
        "POST",
        `${this.baseUrl}/api/auth/revoke`,
        {
          refreshToken: this.refreshToken,
        },
        200,
        "Revoke refresh token",
      );

      await this.testEndpoint(
        "Authentication",
        "POST",
        `${this.baseUrl}/api/auth/logout`,
        {
          refreshToken: this.refreshToken,
        },
        200,
        "User logout",
      );
    }

    await this.testEndpoint(
      "Authentication",
      "DELETE",
      `${this.baseUrl}/api/auth/account`,
      {
        password: "NewTest123456!",
      },
      200,
      "Delete account",
    );

    // Re-register for remaining tests
    await this.testEndpoint(
      "Authentication",
      "POST",
      `${this.baseUrl}/api/auth/register`,
      {
        email: "admin@jarvis.ai",
        password: "Admin123456!",
        name: "Admin User",
      },
      201,
      "Register admin user",
    );

    const adminLogin = await this.testEndpoint(
      "Authentication",
      "POST",
      `${this.baseUrl}/api/auth/login`,
      {
        email: "admin@jarvis.ai",
        password: "Admin123456!",
      },
      200,
      "Admin login",
    );

    if (adminLogin.response?.data?.accessToken) {
      this.token = adminLogin.response.data.accessToken;
    }

    // Group 3: Agent Management
    console.log("\n=========================================");
    console.log("GROUP 3: AGENT MANAGEMENT ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents`,
      null,
      200,
      "List all agents",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents?page=1&limit=10`,
      null,
      200,
      "List agents with pagination",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents?status=online`,
      null,
      200,
      "List online agents",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents/${this.agentName}`,
      null,
      200,
      "Get specific agent",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents/${this.agentName}/health`,
      null,
      200,
      "Get agent health",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents/${this.agentName}/metrics`,
      null,
      200,
      "Get agent metrics",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents/${this.agentName}/logs`,
      null,
      200,
      "Get agent logs",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/agents/${this.agentName}/config`,
      null,
      200,
      "Get agent config",
    );
    await this.testEndpoint(
      "Agent Management",
      "POST",
      `${this.baseUrl}/api/agents/${this.agentName}/execute`,
      {
        action: "ping",
        inputs: {},
      },
      200,
      "Execute agent action",
    );
    await this.testEndpoint(
      "Agent Management",
      "POST",
      `${this.baseUrl}/api/agents/${this.agentName}/config`,
      {
        setting: "value",
      },
      200,
      "Update agent config",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/agents/status`,
      null,
      200,
      "Legacy agent status",
    );
    await this.testEndpoint(
      "Agent Management",
      "GET",
      `${this.baseUrl}/api/capabilities`,
      null,
      200,
      "System capabilities",
    );
    await this.testEndpoint(
      "Agent Management",
      "POST",
      `${this.baseUrl}/chat`,
      {
        message: "Hello",
        userId: "test-user",
      },
      200,
      "Chat endpoint",
    );

    // Group 4: System Management
    console.log("\n=========================================");
    console.log("GROUP 4: SYSTEM MANAGEMENT ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/system/info`,
      null,
      200,
      "System information",
    );
    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/metrics`,
      null,
      200,
      "Prometheus metrics",
    );
    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/stats`,
      null,
      200,
      "System statistics",
    );
    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/features`,
      null,
      200,
      "Feature flags",
    );
    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/environment`,
      null,
      200,
      "Environment info",
    );
    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/config`,
      null,
      200,
      "System config",
    );
    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/logs`,
      null,
      200,
      "System logs",
    );
    await this.testEndpoint(
      "System Management",
      "POST",
      `${this.baseUrl}/api/config`,
      {
        setting: "value",
      },
      200,
      "Update system config",
    );
    await this.testEndpoint(
      "System Management",
      "GET",
      `${this.baseUrl}/api/logs?level=info&limit=10`,
      null,
      200,
      "Filtered logs",
    );

    // Group 5: Batch Operations
    console.log("\n=========================================");
    console.log("GROUP 5: BATCH OPERATIONS ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Batch Operations",
      "POST",
      `${this.baseUrl}/api/batch/execute`,
      [
        {
          agentId: "Dialogue",
          action: "ping",
          inputs: {},
        },
      ],
      200,
      "Execute batch operations",
    );
    await this.testEndpoint(
      "Batch Operations",
      "GET",
      `${this.baseUrl}/api/batch/status/batch-123`,
      null,
      200,
      "Get batch status",
    );
    await this.testEndpoint(
      "Batch Operations",
      "GET",
      `${this.baseUrl}/api/batch/history`,
      null,
      200,
      "Get batch history",
    );
    await this.testEndpoint(
      "Batch Operations",
      "POST",
      `${this.baseUrl}/api/batch/cancel/batch-123`,
      null,
      200,
      "Cancel batch",
    );
    await this.testEndpoint(
      "Batch Operations",
      "DELETE",
      `${this.baseUrl}/api/batch/batch-123`,
      null,
      200,
      "Delete batch",
    );

    // Group 6: Security Agent
    console.log("\n=========================================");
    console.log("GROUP 6: SECURITY AGENT ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/health`,
      null,
      200,
      "Security agent health",
    );
    await this.testEndpoint(
      "Security Agent",
      "POST",
      `${this.securityUrl}/api/scan`,
      {
        inputs: {
          input: "Test input",
          userId: "test-user",
        },
      },
      200,
      "Scan input for threats",
    );
    await this.testEndpoint(
      "Security Agent",
      "POST",
      `${this.securityUrl}/api/check-tool`,
      {
        inputs: {
          userId: "test-user",
          toolName: "send_email",
        },
      },
      200,
      "Check tool access",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/events`,
      null,
      200,
      "Get security events",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/events?limit=10`,
      null,
      200,
      "Get security events (limited)",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/threat-level?userId=test-user`,
      null,
      200,
      "Get user threat level",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/stats`,
      null,
      200,
      "Security statistics",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/stats/summary`,
      null,
      200,
      "Stats summary",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/stats/realtime`,
      null,
      200,
      "Realtime stats",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/stats/trends`,
      null,
      200,
      "Security trends",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/stats/export`,
      null,
      200,
      "Export stats",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/users/test-user`,
      null,
      200,
      "Get user security profile",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/users`,
      null,
      200,
      "List all users",
    );
    await this.testEndpoint(
      "Security Agent",
      "POST",
      `${this.securityUrl}/api/users/test-user/block`,
      {
        reason: "Testing",
      },
      200,
      "Block user",
    );
    await this.testEndpoint(
      "Security Agent",
      "POST",
      `${this.securityUrl}/api/users/test-user/unblock`,
      null,
      200,
      "Unblock user",
    );
    await this.testEndpoint(
      "Security Agent",
      "DELETE",
      `${this.securityUrl}/api/users/test-user`,
      null,
      200,
      "Delete user profile",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/rate-limits`,
      null,
      200,
      "Get rate limits",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/rate-limits?userId=test-user`,
      null,
      200,
      "Get user rate limits",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/rate-limits/test-user/send_email`,
      null,
      200,
      "Get specific rate limit",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/rate-limits/config`,
      null,
      200,
      "Get rate limit config",
    );
    await this.testEndpoint(
      "Security Agent",
      "POST",
      `${this.securityUrl}/api/rate-limits/config`,
      {
        toolName: "send_email",
        maxCalls: 10,
        windowMs: 60000,
      },
      200,
      "Update rate limit config",
    );
    await this.testEndpoint(
      "Security Agent",
      "POST",
      `${this.securityUrl}/api/rate-limits/reset`,
      {
        userId: "test-user",
      },
      200,
      "Reset rate limits",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/patterns`,
      null,
      200,
      "Get threat patterns",
    );
    await this.testEndpoint(
      "Security Agent",
      "POST",
      `${this.securityUrl}/api/patterns`,
      {
        type: "prompt_injection",
        pattern: "ignore instructions",
        severity: "high",
      },
      200,
      "Add threat pattern",
    );
    await this.testEndpoint(
      "Security Agent",
      "GET",
      `${this.securityUrl}/api/redactions`,
      null,
      200,
      "Get redaction log",
    );

    // Group 7: Health API
    console.log("\n=========================================");
    console.log("GROUP 7: HEALTH API ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents`,
      null,
      200,
      "List all agent health",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/${this.agentName}`,
      null,
      200,
      "Get specific agent health",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/${this.agentName}/metrics`,
      null,
      200,
      "Get agent health metrics",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/${this.agentName}/logs`,
      null,
      200,
      "Get agent health logs",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/${this.agentName}/config`,
      null,
      200,
      "Get agent health config",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/${this.agentName}/status`,
      null,
      200,
      "Get agent status",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/${this.agentName}/history`,
      null,
      200,
      "Get agent health history",
    );
    await this.testEndpoint(
      "Health API",
      "POST",
      `${this.baseUrl}/health/agents/${this.agentName}/health-check`,
      null,
      200,
      "Trigger health check",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/summary`,
      null,
      200,
      "Agent health summary",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/list`,
      null,
      200,
      "List agent health",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/agents/unhealthy`,
      null,
      200,
      "List unhealthy agents",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system`,
      null,
      200,
      "System health",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system/uptime`,
      null,
      200,
      "System uptime",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system/resources`,
      null,
      200,
      "System resources",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system/alerts`,
      null,
      200,
      "System alerts",
    );
    await this.testEndpoint(
      "Health API",
      "POST",
      `${this.baseUrl}/health/system/alerts`,
      {
        title: "Test Alert",
        message: "Testing",
        severity: "info",
      },
      200,
      "Create system alert",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system/reports`,
      null,
      200,
      "Health reports",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system/status`,
      null,
      200,
      "System health status",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system/dependencies`,
      null,
      200,
      "System dependencies",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/system/performance`,
      null,
      200,
      "System performance",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/metrics/live`,
      null,
      200,
      "Live metrics",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/metrics/latest`,
      null,
      200,
      "Latest metrics",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/metrics/history`,
      null,
      200,
      "Metrics history",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/metrics/summary`,
      null,
      200,
      "Metrics summary",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/metrics/export`,
      null,
      200,
      "Export metrics",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/metrics/agents`,
      null,
      200,
      "Agent metrics",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/incidents`,
      null,
      200,
      "List incidents",
    );
    await this.testEndpoint(
      "Health API",
      "POST",
      `${this.baseUrl}/health/incidents`,
      {
        title: "Test Incident",
        description: "Testing",
        severity: "low",
      },
      200,
      "Create incident",
    );
    await this.testEndpoint(
      "Health API",
      "GET",
      `${this.baseUrl}/health/status`,
      null,
      200,
      "Health status",
    );

    // Group 8: Analytics API
    console.log("\n=========================================");
    console.log("GROUP 8: ANALYTICS API ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/overview`,
      null,
      200,
      "Analytics overview",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/agents`,
      null,
      200,
      "Agent analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/agents?period=7d`,
      null,
      200,
      "Agent analytics (7 days)",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/agents/${this.agentName}`,
      null,
      200,
      "Specific agent analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/requests`,
      null,
      200,
      "Request analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/requests?page=1&limit=10`,
      null,
      200,
      "Request analytics (paginated)",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/errors`,
      null,
      200,
      "Error analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/errors?agent=${this.agentName}`,
      null,
      200,
      "Agent error analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/performance`,
      null,
      200,
      "Performance analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/usage`,
      null,
      200,
      "Usage analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/users`,
      null,
      200,
      "User analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/security`,
      null,
      200,
      "Security analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/export`,
      null,
      200,
      "Export analytics (JSON)",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/export?format=csv`,
      null,
      200,
      "Export analytics (CSV)",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/reports`,
      null,
      200,
      "Analytics reports",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/real-time`,
      null,
      200,
      "Real-time analytics",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/trends`,
      null,
      200,
      "Analytics trends",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/comparison?period1=7d&period2=14d`,
      null,
      200,
      "Period comparison",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/dashboard`,
      null,
      200,
      "Analytics dashboard",
    );
    await this.testEndpoint(
      "Analytics API",
      "GET",
      `${this.baseUrl}/api/analytics/health-score`,
      null,
      200,
      "System health score",
    );
    await this.testEndpoint(
      "Analytics API",
      "POST",
      `${this.baseUrl}/api/analytics/track`,
      {
        agent: "Dialogue",
        action: "test",
        responseTime: 100,
      },
      200,
      "Track analytics event",
    );

    // Group 9: Webhook API
    console.log("\n=========================================");
    console.log("GROUP 9: WEBHOOK API ENDPOINTS");
    console.log("=========================================");

    await this.testEndpoint(
      "Webhook API",
      "GET",
      `${this.baseUrl}/api/webhooks/events/list`,
      null,
      200,
      "List webhook events",
    );

    const webhookResponse = await this.testEndpoint(
      "Webhook API",
      "POST",
      `${this.baseUrl}/api/webhooks`,
      {
        url: "https://webhook.site/test",
        events: ["agent.started", "request.completed"],
        description: "Test webhook",
      },
      201,
      "Create webhook",
    );

    if (webhookResponse.response?.data?.id) {
      this.webhookId = webhookResponse.response.data.id;
    }

    await this.testEndpoint(
      "Webhook API",
      "GET",
      `${this.baseUrl}/api/webhooks`,
      null,
      200,
      "List webhooks",
    );
    await this.testEndpoint(
      "Webhook API",
      "GET",
      `${this.baseUrl}/api/webhooks?page=1&limit=10`,
      null,
      200,
      "List webhooks (paginated)",
    );

    if (this.webhookId) {
      await this.testEndpoint(
        "Webhook API",
        "GET",
        `${this.baseUrl}/api/webhooks/${this.webhookId}`,
        null,
        200,
        "Get webhook details",
      );
      await this.testEndpoint(
        "Webhook API",
        "PATCH",
        `${this.baseUrl}/api/webhooks/${this.webhookId}`,
        {
          description: "Updated webhook",
        },
        200,
        "Update webhook",
      );
      await this.testEndpoint(
        "Webhook API",
        "POST",
        `${this.baseUrl}/api/webhooks/${this.webhookId}/test`,
        null,
        200,
        "Test webhook",
      );
      await this.testEndpoint(
        "Webhook API",
        "GET",
        `${this.baseUrl}/api/webhooks/${this.webhookId}/deliveries`,
        null,
        200,
        "Get webhook deliveries",
      );
      await this.testEndpoint(
        "Webhook API",
        "DELETE",
        `${this.baseUrl}/api/webhooks/${this.webhookId}`,
        null,
        200,
        "Delete webhook",
      );
    }

    // Group 10: Individual Agent Endpoints
    console.log("\n=========================================");
    console.log("GROUP 10: INDIVIDUAL AGENT ENDPOINTS");
    console.log("=========================================");

    for (const agent of this.agents) {
      const agentUrl = `http://localhost:${agent.port}`;
      console.log(`\nTesting ${agent.name} Agent (Port ${agent.port})`);

      await this.testEndpoint(
        "Agent Endpoints",
        "GET",
        `${agentUrl}/health`,
        null,
        200,
        `${agent.name} - Health check`,
      );
      await this.testEndpoint(
        "Agent Endpoints",
        "GET",
        `${agentUrl}/api/capabilities`,
        null,
        200,
        `${agent.name} - Get capabilities`,
      );
      await this.testEndpoint(
        "Agent Endpoints",
        "GET",
        `${agentUrl}/api/status`,
        null,
        200,
        `${agent.name} - Get status`,
      );
      await this.testEndpoint(
        "Agent Endpoints",
        "GET",
        `${agentUrl}/api/metrics`,
        null,
        200,
        `${agent.name} - Get metrics`,
      );
      await this.testEndpoint(
        "Agent Endpoints",
        "GET",
        `${agentUrl}/api/logs`,
        null,
        200,
        `${agent.name} - Get logs`,
      );
      await this.testEndpoint(
        "Agent Endpoints",
        "GET",
        `${agentUrl}/api/config`,
        null,
        200,
        `${agent.name} - Get config`,
      );
    }

    // Generate report
    this.generateReport();
  }

  generateReport(): void {
    console.log("\n=========================================");
    console.log("TEST SUITE COMPLETED");
    console.log("=========================================");
    console.log(`Completed at: ${new Date().toISOString()}\n`);

    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = ((passed / total) * 100).toFixed(2);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Pass Rate: ${passRate}%\n`);

    // Group summary
    console.log("\nGroup Summary:");
    console.log("=========================================");
    for (const [groupName, group] of this.groups.entries()) {
      const groupPassRate = ((group.passed / group.tests.length) * 100).toFixed(2);
      console.log(`${groupName}: ${group.passed}/${group.tests.length} passed (${groupPassRate}%)`);
    }

    // Failed tests detail
    const failedTests = this.results.filter((r) => !r.passed);
    if (failedTests.length > 0) {
      console.log("\nFailed Tests:");
      console.log("=========================================");
      for (const test of failedTests) {
        console.log(`\nTest ${test.testNumber}: ${test.description}`);
        console.log(`  URL: ${test.method} ${test.url}`);
        console.log(`  Expected: ${test.expectedStatus}, Got: ${test.actualStatus}`);
        if (test.error) console.log(`  Error: ${test.error}`);
      }
    }

    // Save report to file
    const reportPath = path.join(process.cwd(), "tests", "test-report.json");
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        passRate: Number.parseFloat(passRate),
      },
      groups: Array.from(this.groups.values()),
      results: this.results,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

    if (failed === 0) {
      console.log("\n✓ ALL TESTS PASSED!");
      process.exit(0);
    } else {
      console.log(`\n✗ ${failed} test(s) failed`);
      process.exit(1);
    }
  }
}

// Run tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch((error) => {
    console.error("Test runner error:", error);
    process.exit(1);
  });
}

export { TestRunner, type TestResult, type TestGroup };
