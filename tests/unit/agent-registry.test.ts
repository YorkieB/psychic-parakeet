import { AgentRegistry } from "../../src/orchestrator/agent-registry";
import { type AgentRegistration, AgentStatus } from "../../src/types/agent";
import { createLogger } from "../../src/utils/logger";

describe("AgentRegistry", () => {
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

  describe("AgentRegistry - Registration", () => {
    it("should register an agent successfully", async () => {
      const registration: AgentRegistration = {
        agentId: "test-agent",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      };

      await registry.registerAgent(registration);

      const retrieved = registry.getAgent("test-agent");
      expect(retrieved).toBeDefined();
      expect(retrieved?.agentId).toBe("test-agent");
      expect(retrieved?.version).toBe("1.0.0");
    });

    it("should retrieve a registered agent", () => {
      const registration: AgentRegistration = {
        agentId: "test-agent-2",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3002/health",
        apiEndpoint: "http://localhost:3002/api",
        dependencies: [],
        priority: 5,
      };

      registry.registerAgent(registration).then(() => {
        const agent = registry.getAgent("test-agent-2");
        expect(agent).toEqual(registration);
      });
    });

    it("should return undefined for non-existent agent", () => {
      const agent = registry.getAgent("non-existent");
      expect(agent).toBeUndefined();
    });

    it("should throw error when registering duplicate agent", async () => {
      const registration: AgentRegistration = {
        agentId: "duplicate-agent",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3003/health",
        apiEndpoint: "http://localhost:3003/api",
        dependencies: [],
        priority: 5,
      };

      await registry.registerAgent(registration);

      await expect(registry.registerAgent(registration)).rejects.toThrow(
        "Agent duplicate-agent is already registered",
      );
    });
  });

  describe("AgentRegistry - Availability", () => {
    it("should return true for ONLINE agents", () => {
      const registration: AgentRegistration = {
        agentId: "online-agent",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3004/health",
        apiEndpoint: "http://localhost:3004/api",
        dependencies: [],
        priority: 5,
      };

      registry.registerAgent(registration).then(() => {
        expect(registry.isAvailable("online-agent")).toBe(true);
      });
    });

    it("should return true for DEGRADED agents", () => {
      const registration: AgentRegistration = {
        agentId: "degraded-agent",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.DEGRADED,
        healthEndpoint: "http://localhost:3005/health",
        apiEndpoint: "http://localhost:3005/api",
        dependencies: [],
        priority: 5,
      };

      registry.registerAgent(registration).then(() => {
        expect(registry.isAvailable("degraded-agent")).toBe(true);
      });
    });

    it("should return false for MAINTENANCE agents", () => {
      const registration: AgentRegistration = {
        agentId: "maintenance-agent",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.MAINTENANCE,
        healthEndpoint: "http://localhost:3006/health",
        apiEndpoint: "http://localhost:3006/api",
        dependencies: [],
        priority: 5,
      };

      registry.registerAgent(registration).then(() => {
        expect(registry.isAvailable("maintenance-agent")).toBe(false);
      });
    });

    it("should return false for OFFLINE agents", () => {
      const registration: AgentRegistration = {
        agentId: "offline-agent",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.OFFLINE,
        healthEndpoint: "http://localhost:3007/health",
        apiEndpoint: "http://localhost:3007/api",
        dependencies: [],
        priority: 5,
      };

      registry.registerAgent(registration).then(() => {
        expect(registry.isAvailable("offline-agent")).toBe(false);
      });
    });

    it("should return false for non-existent agents", () => {
      expect(registry.isAvailable("non-existent")).toBe(false);
    });
  });

  describe("AgentRegistry - Health Summary", () => {
    it("should calculate correct health summary with mixed statuses", async () => {
      const agents: AgentRegistration[] = [
        {
          agentId: "agent-1",
          version: "1.0.0",
          capabilities: ["test"],
          status: AgentStatus.ONLINE,
          healthEndpoint: "http://localhost:3010/health",
          apiEndpoint: "http://localhost:3010/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "agent-2",
          version: "1.0.0",
          capabilities: ["test"],
          status: AgentStatus.DEGRADED,
          healthEndpoint: "http://localhost:3011/health",
          apiEndpoint: "http://localhost:3011/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "agent-3",
          version: "1.0.0",
          capabilities: ["test"],
          status: AgentStatus.OFFLINE,
          healthEndpoint: "http://localhost:3012/health",
          apiEndpoint: "http://localhost:3012/api",
          dependencies: [],
          priority: 5,
        },
        {
          agentId: "agent-4",
          version: "1.0.0",
          capabilities: ["test"],
          status: AgentStatus.MAINTENANCE,
          healthEndpoint: "http://localhost:3013/health",
          apiEndpoint: "http://localhost:3013/api",
          dependencies: [],
          priority: 5,
        },
      ];

      for (const agent of agents) {
        await registry.registerAgent(agent);
      }

      const summary = registry.getHealthSummary();

      expect(summary.total).toBe(4);
      expect(summary.online).toBe(1);
      expect(summary.degraded).toBe(1);
      expect(summary.offline).toBe(2); // OFFLINE + MAINTENANCE
      expect(summary.availability).toBe(50); // 2 available out of 4 = 50%
    });

    it("should return zero values for empty registry", () => {
      const summary = registry.getHealthSummary();

      expect(summary.total).toBe(0);
      expect(summary.online).toBe(0);
      expect(summary.degraded).toBe(0);
      expect(summary.offline).toBe(0);
      expect(summary.availability).toBe(0);
    });

    it("should filter agents by status", async () => {
      const onlineAgent: AgentRegistration = {
        agentId: "online-only",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3020/health",
        apiEndpoint: "http://localhost:3020/api",
        dependencies: [],
        priority: 5,
      };

      const offlineAgent: AgentRegistration = {
        agentId: "offline-only",
        version: "1.0.0",
        capabilities: ["test"],
        status: AgentStatus.OFFLINE,
        healthEndpoint: "http://localhost:3021/health",
        apiEndpoint: "http://localhost:3021/api",
        dependencies: [],
        priority: 5,
      };

      await registry.registerAgent(onlineAgent);
      await registry.registerAgent(offlineAgent);

      const onlineAgents = registry.getAllAgents(AgentStatus.ONLINE);
      expect(onlineAgents).toHaveLength(1);
      expect(onlineAgents[0].agentId).toBe("online-only");

      const offlineAgents = registry.getAllAgents(AgentStatus.OFFLINE);
      expect(offlineAgents).toHaveLength(1);
      expect(offlineAgents[0].agentId).toBe("offline-only");
    });
  });
});
