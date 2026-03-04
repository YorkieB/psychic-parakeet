import { AgentRegistry } from "../../src/orchestrator/agent-registry";
import { AgentStatus } from "../../src/types/agent";
import { createLogger } from "../../src/utils/logger";

describe("Knowledge Agent", () => {
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

  it("should register with research capabilities", async () => {
    await registry.registerAgent({
      agentId: "Knowledge",
      version: "1.0.0",
      capabilities: ["research", "fact_checking", "summarization"],
      status: AgentStatus.ONLINE,
      healthEndpoint: "http://localhost:3003/health",
      apiEndpoint: "http://localhost:3003/api",
      dependencies: ["Web"],
      priority: 8,
    });

    expect(registry.isAvailable("Knowledge")).toBe(true);
    const agent = registry.getAgent("Knowledge");
    expect(agent?.capabilities).toContain("research");
    expect(agent?.dependencies).toContain("Web");
  });

  it("should have higher priority than Web Agent", async () => {
    await registry.registerAgent({
      agentId: "Web",
      version: "1.0.0",
      capabilities: ["web_search"],
      status: AgentStatus.ONLINE,
      healthEndpoint: "http://localhost:3002/health",
      apiEndpoint: "http://localhost:3002/api",
      dependencies: [],
      priority: 7,
    });

    await registry.registerAgent({
      agentId: "Knowledge",
      version: "1.0.0",
      capabilities: ["research"],
      status: AgentStatus.ONLINE,
      healthEndpoint: "http://localhost:3003/health",
      apiEndpoint: "http://localhost:3003/api",
      dependencies: ["Web"],
      priority: 8,
    });

    const webAgent = registry.getAgent("Web");
    const knowledgeAgent = registry.getAgent("Knowledge");

    expect(knowledgeAgent?.priority).toBeGreaterThan(webAgent?.priority || 0);
  });

  it("should depend on Web Agent", async () => {
    await registry.registerAgent({
      agentId: "Knowledge",
      version: "1.0.0",
      capabilities: ["research"],
      status: AgentStatus.ONLINE,
      healthEndpoint: "http://localhost:3003/health",
      apiEndpoint: "http://localhost:3003/api",
      dependencies: ["Web"],
      priority: 8,
    });

    const agent = registry.getAgent("Knowledge");
    expect(agent?.dependencies).toEqual(["Web"]);
  });

  it("should have all required capabilities", async () => {
    await registry.registerAgent({
      agentId: "Knowledge",
      version: "1.0.0",
      capabilities: [
        "research",
        "fact_checking",
        "summarization",
        "information_synthesis",
        "multi_source_analysis",
      ],
      status: AgentStatus.ONLINE,
      healthEndpoint: "http://localhost:3003/health",
      apiEndpoint: "http://localhost:3003/api",
      dependencies: ["Web"],
      priority: 8,
    });

    const agent = registry.getAgent("Knowledge");
    expect(agent?.capabilities).toContain("research");
    expect(agent?.capabilities).toContain("fact_checking");
    expect(agent?.capabilities).toContain("summarization");
    expect(agent?.capabilities).toContain("information_synthesis");
    expect(agent?.capabilities).toContain("multi_source_analysis");
  });
});
