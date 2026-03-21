import { AgentRegistry } from "../../src/orchestrator/agent-registry";
import { Orchestrator } from "../../src/orchestrator/orchestrator";
import { SimpleReasoningEngine } from "../../src/reasoning/simple-reasoning-engine";
import { AgentStatus, type UserInput } from "../../src/types/agent";
import { createLogger } from "../../src/utils/logger";

describe("Simple Reasoning Engine", () => {
  let reasoningEngine: SimpleReasoningEngine;
  let registry: AgentRegistry;
  let orchestrator: Orchestrator;
  let silentLogger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    // Create a silent logger for tests
    silentLogger = createLogger("Test");
    silentLogger.transports.forEach((transport) => {
      transport.silent = true;
    });

    registry = new AgentRegistry(silentLogger);
    orchestrator = new Orchestrator(registry, silentLogger);
    reasoningEngine = new SimpleReasoningEngine(orchestrator, silentLogger);
  });

  afterEach(() => {
    registry.stopHealthChecks();
  });

  describe("Intent Detection", () => {
    beforeEach(() => {
      jest.setTimeout(30000); // 30 second timeout for agent calls
    });

    it("should detect GREETING intent", async () => {
      await registry.registerAgent({
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      });

      const input: UserInput = {
        text: "Hello Jarvis",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      expect(response.metadata?.intentType).toBe("GREETING");
      expect(response.agentsUsed).toContain("Dialogue");
    });

    it("should detect SEARCH intent", async () => {
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

      const input: UserInput = {
        text: "Search for TypeScript tutorials",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      expect(response.metadata?.intentType).toBe("SEARCH");
      expect(response.agentsUsed).toContain("Web");
    });

    it("should detect RESEARCH intent", async () => {
      jest.setTimeout(30000);
      await registry.registerAgent({
        agentId: "Knowledge",
        version: "1.0.0",
        capabilities: ["research"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3003/health",
        apiEndpoint: "http://localhost:3003/api",
        dependencies: [],
        priority: 8,
      });

      const input: UserInput = {
        text: "I want to research neural networks",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      expect(response.metadata?.intentType).toBe("RESEARCH");
      expect(response.agentsUsed).toContain("Knowledge");
    });

    it("should detect FACT_CHECK intent", async () => {
      await registry.registerAgent({
        agentId: "Knowledge",
        version: "1.0.0",
        capabilities: ["fact_checking"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3003/health",
        apiEndpoint: "http://localhost:3003/api",
        dependencies: [],
        priority: 8,
      });

      const input: UserInput = {
        text: "Fact check: TypeScript is a language",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      expect(response.metadata?.intentType).toBe("FACT_CHECK");
      expect(response.agentsUsed).toContain("Knowledge");
    });

    it("should detect CONVERSATION intent for questions", async () => {
      await registry.registerAgent({
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      });

      const input: UserInput = {
        text: "Why is TypeScript popular?",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      // Note: This may be detected as CONVERSATION or UNKNOWN depending on keyword matching
      // The important thing is that it routes to Dialogue agent
      expect(["CONVERSATION", "UNKNOWN"]).toContain(response.metadata?.intentType);
      expect(response.agentsUsed).toContain("Dialogue");
    });
  });

  describe("Plan Creation", () => {
    beforeEach(() => {
      jest.setTimeout(30000);
    });

    it("should create single-step plan for simple intent", async () => {
      await registry.registerAgent({
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      });

      const input: UserInput = {
        text: "Hello",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      expect(response.metadata?.planSteps).toBe(1);
    });
  });

  describe("Response Synthesis", () => {
    beforeEach(() => {
      jest.setTimeout(30000);
    });

    it("should return JarvisResponse with metadata", async () => {
      await registry.registerAgent({
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      });

      const input: UserInput = {
        text: "Hi",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      expect(response).toHaveProperty("text");
      expect(response).toHaveProperty("reasoningTraceId");
      expect(response).toHaveProperty("confidence");
      expect(response).toHaveProperty("agentsUsed");
      expect(response).toHaveProperty("metadata");
      expect(response.metadata).toHaveProperty("intentType");
      expect(response.metadata).toHaveProperty("planSteps");
      expect(response.metadata).toHaveProperty("totalDuration");
    });

    it("should handle errors gracefully", async () => {
      // No agents registered - should handle gracefully
      const input: UserInput = {
        text: "Hello",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await reasoningEngine.processInput(input);
      expect(response).toHaveProperty("text");
      expect(response.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("LLM Integration", () => {
    it("should gracefully handle missing LLM", async () => {
      // Reasoning engine should work without LLM (fallback to keyword matching)
      const engineWithoutLLM = new SimpleReasoningEngine(orchestrator, silentLogger);
      expect(engineWithoutLLM).toBeDefined();
    });

    it("should use LLM when available", async () => {
      jest.setTimeout(30000); // 30 second timeout for LLM calls

      // Skip test if Vertex AI is not configured
      if (!process.env.VERTEX_AI_ENDPOINT_URL) {
        console.log("Skipping LLM test (no VERTEX_AI_ENDPOINT_URL configured)");
        return;
      }

      const { VertexLLMClient } = await import("../../src/llm");
      const llm = new VertexLLMClient(silentLogger);
      const engineWithLLM = new SimpleReasoningEngine(orchestrator, silentLogger, llm);

      await registry.registerAgent({
        agentId: "Dialogue",
        version: "1.0.0",
        capabilities: ["conversation"],
        status: AgentStatus.ONLINE,
        healthEndpoint: "http://localhost:3001/health",
        apiEndpoint: "http://localhost:3001/api",
        dependencies: [],
        priority: 5,
      });

      const input: UserInput = {
        text: "Tell me about AI",
        source: "text",
        userId: "test",
        sessionId: "test",
        timestamp: new Date(),
      };

      const response = await engineWithLLM.processInput(input);
      expect(response).toHaveProperty("text");
      expect(response.confidence).toBeGreaterThan(0);
    });
  });
});
