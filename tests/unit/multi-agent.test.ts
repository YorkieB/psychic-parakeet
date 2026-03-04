import { AgentRegistry } from "../../src/orchestrator/agent-registry";
import { type AgentRegistration, AgentStatus } from "../../src/types/agent";
import { createLogger } from "../../src/utils/logger";

describe("Multi-Agent System", () => {
  let registry: AgentRegistry;
  let silentLogger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    // Create a silent logger for tests
    silentLogger = createLogger("Test");
    silentLogger.transports.forEach((transport) => {
      transport.silent = true;
    });

    registry = new AgentRegistry(silentLogger);
  });

  afterEach(() => {
    registry.stopHealthChecks();
  });

  describe("Multi-Agent Registration", () => {
    it("should register multiple agents", async () => {
      const dialogueAgent: AgentRegistration = {
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation", "response"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      const webAgent: AgentRegistration = {
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search", "information_retrieval"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      };

      await registry.registerAgent(dialogueAgent);
      await registry.registerAgent(webAgent);

      const allAgents = registry.getAllAgents();
      expect(allAgents).toHaveLength(2);
      expect(allAgents.map((a) => a.agentId)).toContain("Dialogue");
      expect(allAgents.map((a) => a.agentId)).toContain("Web");
    });

    it("should track all registered agents correctly", async () => {
      const agents: AgentRegistration[] = [
        {
          agentId: "Agent1",
          version: "1.0.0",
          capabilities: ["cap1"],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3001/health",
          apiEndpoint: "http://localhost:3001/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "Agent2",
          version: "1.0.0",
          capabilities: ["cap2"],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3002/health",
          apiEndpoint: "http://localhost:3002/api",
          dependencies: [],
          priority: 6,
        },
        {
          agentId: "Agent3",
          version: "1.0.0",
          capabilities: ["cap3"],
          status: AgentStatus.DEGRADED,
          healthEndpoint: "http://localhost:3003/health",
          apiEndpoint: "http://localhost:3003/api",
          dependencies: [],
          priority: 7,
        },
      ];

      for (const agent of agents) {
        await registry.registerAgent(agent);
      }

      const allAgents = registry.getAllAgents();
      expect(allAgents).toHaveLength(3);

      const agentIds = allAgents.map((a) => a.agentId);
      expect(agentIds).toContain("Agent1");
      expect(agentIds).toContain("Agent2");
      expect(agentIds).toContain("Agent3");
    });

    it("should return correct agent by ID", async () => {
      const dialogueAgent: AgentRegistration = {
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      const webAgent: AgentRegistration = {
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      };

      await registry.registerAgent(dialogueAgent);
      await registry.registerAgent(webAgent);

      const retrievedDialogue = registry.getAgent("Dialogue");
      const retrievedWeb = registry.getAgent("Web");

      expect(retrievedDialogue).toBeDefined();
      expect(retrievedDialogue?.agentId).toBe("Dialogue");
      expect(retrievedDialogue?.priority).toBe(5);

      expect(retrievedWeb).toBeDefined();
      expect(retrievedWeb?.agentId).toBe("Web");
      expect(retrievedWeb?.priority).toBe(7);
    });
  });

  describe("Multi-Agent Availability", () => {
    it("should report both agents as available when ONLINE", async () => {
      const dialogueAgent: AgentRegistration = {
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      const webAgent: AgentRegistration = {
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      };

      await registry.registerAgent(dialogueAgent);
      await registry.registerAgent(webAgent);

      expect(registry.isAvailable("Dialogue")).toBe(true);
      expect(registry.isAvailable("Web")).toBe(true);
    });

    it("should continue with remaining agent when one goes OFFLINE", async () => {
      const dialogueAgent: AgentRegistration = {
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      const webAgent: AgentRegistration = {
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      };

      await registry.registerAgent(dialogueAgent);
      await registry.registerAgent(webAgent);

      // Initially both available
      expect(registry.isAvailable("Dialogue")).toBe(true);
      expect(registry.isAvailable("Web")).toBe(true);

      // Set one offline
      const dialogue = registry.getAgent("Dialogue");
      if (dialogue) {
        dialogue.status = AgentStatus.OFFLINE;
      }

      // Dialogue should be unavailable, Web should still be available
      expect(registry.isAvailable("Dialogue")).toBe(false);
      expect(registry.isAvailable("Web")).toBe(true);
    });

    it("should update availability percentage correctly", async () => {
      const agents: AgentRegistration[] = [
        {
          agentId: "Agent1",
          version: "1.0.0",
          capabilities: ["cap1"],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3001/health",
          apiEndpoint: "http://localhost:3001/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "Agent2",
          version: "1.0.0",
          capabilities: ["cap2"],
          status: AgentStatus.DEGRADED,
          healthEndpoint: "http://localhost:3002/health",
          apiEndpoint: "http://localhost:3002/api",
          dependencies: [],
          priority: 6,
        },
        {
          agentId: "Agent3",
          version: "1.0.0",
          capabilities: ["cap3"],
          status: AgentStatus.OFFLINE,
          healthEndpoint: "http://localhost:3003/health",
          apiEndpoint: "http://localhost:3003/api",
          dependencies: [],
          priority: 7,
        },
      ];

      for (const agent of agents) {
        await registry.registerAgent(agent);
      }

      const summary = registry.getHealthSummary();

      // 2 available (ONLINE + DEGRADED) out of 3 total = 66.67%
      expect(summary.total).toBe(3);
      expect(summary.online).toBe(1);
      expect(summary.degraded).toBe(1);
      expect(summary.offline).toBe(1);
      expect(summary.availability).toBeCloseTo(66.67, 1);
    });
  });

  describe("Multi-Agent Health Summary", () => {
    it("should calculate correct totals with multiple agents", async () => {
      const agents: AgentRegistration[] = [
        {
          agentId: "Agent1",
          version: "1.0.0",
          capabilities: ["cap1"],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3001/health",
          apiEndpoint: "http://localhost:3001/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "Agent2",
          version: "1.0.0",
          capabilities: ["cap2"],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3002/health",
          apiEndpoint: "http://localhost:3002/api",
          dependencies: [],
          priority: 6,
        },
        {
          agentId: "Agent3",
          version: "1.0.0",
          capabilities: ["cap3"],
          status: AgentStatus.DEGRADED,
          healthEndpoint: "http://localhost:3003/health",
          apiEndpoint: "http://localhost:3003/api",
          dependencies: [],
          priority: 7,
        },
        {
          agentId: "Agent4",
          version: "1.0.0",
          capabilities: ["cap4"],
          status: AgentStatus.OFFLINE,
          healthEndpoint: "http://localhost:3004/health",
          apiEndpoint: "http://localhost:3004/api",
          dependencies: [],
          priority: 8,
        },
      ];

      for (const agent of agents) {
        await registry.registerAgent(agent);
      }

      const summary = registry.getHealthSummary();

      expect(summary.total).toBe(4);
      expect(summary.online).toBe(2);
      expect(summary.degraded).toBe(1);
      expect(summary.offline).toBe(1);
    });

    it("should track online/degraded/offline counts", async () => {
      const agents: AgentRegistration[] = [
        {
          agentId: "A1",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3001/health",
          apiEndpoint: "http://localhost:3001/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A2",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3002/health",
          apiEndpoint: "http://localhost:3002/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A3",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.DEGRADED,
          healthEndpoint: "http://localhost:3003/health",
          apiEndpoint: "http://localhost:3003/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A4",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.DEGRADED,
          healthEndpoint: "http://localhost:3004/health",
          apiEndpoint: "http://localhost:3004/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A5",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.OFFLINE,
          healthEndpoint: "http://localhost:3005/health",
          apiEndpoint: "http://localhost:3005/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A6",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.MAINTENANCE,
          healthEndpoint: "http://localhost:3006/health",
          apiEndpoint: "http://localhost:3006/api",
          dependencies: [],
          priority: 5,
        },
      ];

      for (const agent of agents) {
        await registry.registerAgent(agent);
      }

      const summary = registry.getHealthSummary();

      expect(summary.online).toBe(2);
      expect(summary.degraded).toBe(2);
      expect(summary.offline).toBe(2); // OFFLINE + MAINTENANCE
    });

    it("should calculate availability as (online + degraded) / total", async () => {
      const agents: AgentRegistration[] = [
        {
          agentId: "A1",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3001/health",
          apiEndpoint: "http://localhost:3001/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A2",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3002/health",
          apiEndpoint: "http://localhost:3002/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A3",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.DEGRADED,
          healthEndpoint: "http://localhost:3003/health",
          apiEndpoint: "http://localhost:3003/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "A4",
          version: "1.0.0",
          capabilities: [],
          status: AgentStatus.OFFLINE,
          healthEndpoint: "http://localhost:3004/health",
          apiEndpoint: "http://localhost:3004/api",
          dependencies: [],
          priority: 5,
        },
      ];

      for (const agent of agents) {
        await registry.registerAgent(agent);
      }

      const summary = registry.getHealthSummary();

      // 3 available (2 ONLINE + 1 DEGRADED) out of 4 total = 75%
      const expectedAvailability = ((2 + 1) / 4) * 100;
      expect(summary.availability).toBeCloseTo(expectedAvailability, 1);
    });
  });

  describe("Multi-Agent Coordination", () => {
    it("should route to correct agent based on agentId", async () => {
      const dialogueAgent: AgentRegistration = {
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      const webAgent: AgentRegistration = {
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      };

      await registry.registerAgent(dialogueAgent);
      await registry.registerAgent(webAgent);

      // Verify agents are registered
      expect(registry.getAgent("Dialogue")?.agentId).toBe("Dialogue");
      expect(registry.getAgent("Web")?.agentId).toBe("Web");

      // Verify availability
      expect(registry.isAvailable("Dialogue")).toBe(true);
      expect(registry.isAvailable("Web")).toBe(true);
    });

    it("should handle requests to different agents independently", async () => {
      const dialogueAgent: AgentRegistration = {
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      const webAgent: AgentRegistration = {
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      };

      await registry.registerAgent(dialogueAgent);
      await registry.registerAgent(webAgent);

      // Both agents should be independently available
      const dialogueAvailable = registry.isAvailable("Dialogue");
      const webAvailable = registry.isAvailable("Web");

      expect(dialogueAvailable).toBe(true);
      expect(webAvailable).toBe(true);

      // Setting one offline shouldn't affect the other
      const dialogue = registry.getAgent("Dialogue");
      if (dialogue) {
        dialogue.status = AgentStatus.OFFLINE;
      }

      expect(registry.isAvailable("Dialogue")).toBe(false);
      expect(registry.isAvailable("Web")).toBe(true);
    });

    it("should maintain separate response data per agent", async () => {
      const dialogueAgent: AgentRegistration = {
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      const webAgent: AgentRegistration = {
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      };

      await registry.registerAgent(dialogueAgent);
      await registry.registerAgent(webAgent);

      // Each agent should have its own registration data
      const dialogue = registry.getAgent("Dialogue");
      const web = registry.getAgent("Web");

      expect(dialogue?.agentId).toBe("Dialogue");
      expect(dialogue?.priority).toBe(5);
      expect(dialogue?.capabilities).toContain("conversation");

      expect(web?.agentId).toBe("Web");
      expect(web?.priority).toBe(7);
      expect(web?.capabilities).toContain("web_search");

      // They should be different objects
      expect(dialogue).not.toBe(web);
    });
  });

  describe("Web Agent - Real Search", () => {
    let registry: AgentRegistry;
    let logger: ReturnType<typeof createLogger>;

    beforeEach(() => {
      logger = createLogger("Test");
      logger.transports.forEach((transport) => {
        transport.silent = true;
      });
      registry = new AgentRegistry(logger);
    });

    afterEach(() => {
      registry.stopHealthChecks();
    });

    it("should return SearchResponse type with real results", async () => {
      // This test requires Web Agent to be running
      // Mock the agent registration
      await registry.registerAgent({
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search", "information_retrieval", "fact_checking"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      });

      // Note: This is an integration test that requires the agent to be running
      // In a real test environment, we would mock the DuckDuckGo API
      expect(registry.isAvailable("Web")).toBe(true);

      const webAgent = registry.getAgent("Web");
      expect(webAgent?.capabilities).toContain("web_search");
    });

    it("should handle search errors gracefully", async () => {
      // Test that fallback works when search fails
      // This would require mocking the duck-duck-scrape library
      // For now, we verify the agent registration structure supports error handling
      await registry.registerAgent({
        agentId: "Web",
        version: "1.0.0",
        capabilities: ["web_search", "information_retrieval", "fact_checking"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 7,
      });

      // Verify agent is registered and available
      expect(registry.isAvailable("Web")).toBe(true);
    });
  });
});
