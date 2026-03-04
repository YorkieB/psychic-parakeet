/**
 * Multi-Agent Coordination Test Script
 *
 * This script tests the coordination and orchestration capabilities of the Jarvis
 * multi-agent system. It verifies that multiple agents can work together,
 * handle parallel requests, prioritize correctly, and fail gracefully.
 *
 * Usage: npx ts-node test-multi-agent.ts
 */

import { AgentRegistry } from "./src/orchestrator/agent-registry";
import { Orchestrator } from "./src/orchestrator/orchestrator";
import { AgentStatus } from "./src/types/agent";
import { createLogger } from "./src/utils/logger";

/**
 * Main test function that runs all multi-agent coordination scenarios.
 */
async function testMultiAgent(): Promise<void> {
  const logger = createLogger("multi-agent-test");
  const testStartTime = Date.now();
  let successCount = 0;
  let failureCount = 0;
  let totalRequests = 0;

  logger.info("🧪 Multi-Agent Coordination Test\n");

  try {
    // Create registry and orchestrator
    const registry = new AgentRegistry(logger);
    const orchestrator = new Orchestrator(registry, logger);

    // Register both agents manually
    await registry.registerAgent({
      agentId: "Dialogue",
      version: "1.0.0",
      capabilities: ["conversation", "response", "context_tracking"],
      status: AgentStatus.ONLINE,
      healthEndpoint: "http://localhost:3001/health",
      apiEndpoint: "http://localhost:3001/api",
      dependencies: [],
      priority: 5,
    });

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

    logger.info("✅ Both agents registered\n");

    // Scenario 1: Dialogue Agent
    logger.info("📋 Scenario 1: Conversation with Dialogue Agent");
    const scenario1Start = Date.now();
    totalRequests++;

    try {
      const dialogueResponse = await orchestrator.executeRequest(
        "Dialogue",
        "respond",
        { message: "Hello, what can you do?" },
        "test-user",
        "MEDIUM",
      );

      const scenario1Duration = Date.now() - scenario1Start;

      if (dialogueResponse.success) {
        successCount++;
        logger.info(`✅ Dialogue response received in ${scenario1Duration}ms`);
        logger.info(`   Response: ${JSON.stringify(dialogueResponse.data).substring(0, 100)}...`);
      } else {
        failureCount++;
        logger.error(`❌ Dialogue request failed: ${dialogueResponse.error}`);
      }
    } catch (error) {
      failureCount++;
      logger.error(
        `❌ Scenario 1 error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    logger.info("");

    // Scenario 2: Web Agent
    logger.info("📋 Scenario 2: Web Search");
    const scenario2Start = Date.now();
    totalRequests++;

    try {
      const webResponse = await orchestrator.executeRequest(
        "Web",
        "search",
        { query: "latest AI developments 2026" },
        "test-user",
        "MEDIUM",
      );

      const scenario2Duration = Date.now() - scenario2Start;

      if (webResponse.success) {
        successCount++;
        logger.info(`✅ Web search completed in ${scenario2Duration}ms`);
        const data = webResponse.data as { resultCount?: number; query?: string };
        logger.info(`   Query: "${data.query}"`);
        logger.info(`   Results: ${data.resultCount || 0}`);
      } else {
        failureCount++;
        logger.error(`❌ Web search failed: ${webResponse.error}`);
      }
    } catch (error) {
      failureCount++;
      logger.error(
        `❌ Scenario 2 error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    logger.info("");

    // Scenario 3: Sequential vs Parallel
    logger.info("📋 Scenario 3: Sequential vs Parallel Execution");
    totalRequests += 4; // 2 sequential + 2 parallel

    // Sequential execution
    const sequentialStart = Date.now();
    try {
      const seq1 = await orchestrator.executeRequest(
        "Dialogue",
        "respond",
        { message: "Tell me about TypeScript" },
        "test-user",
        "MEDIUM",
      );
      const seq2 = await orchestrator.executeRequest(
        "Web",
        "search",
        { query: "TypeScript features" },
        "test-user",
        "MEDIUM",
      );
      const sequentialDuration = Date.now() - sequentialStart;

      if (seq1.success && seq2.success) {
        successCount += 2;
        logger.info(`✅ Sequential: ${sequentialDuration}ms (Dialogue: ✓, Web: ✓)`);
      } else {
        failureCount += 2;
        logger.error(`❌ Sequential execution had failures`);
      }

      // Parallel execution
      const parallelStart = Date.now();
      const [par1, par2] = await Promise.all([
        orchestrator.executeRequest(
          "Dialogue",
          "respond",
          { message: "Tell me about JavaScript" },
          "test-user",
          "MEDIUM",
        ),
        orchestrator.executeRequest(
          "Web",
          "search",
          { query: "JavaScript features" },
          "test-user",
          "MEDIUM",
        ),
      ]);
      const parallelDuration = Date.now() - parallelStart;

      if (par1.success && par2.success) {
        successCount += 2;
        logger.info(`✅ Parallel: ${parallelDuration}ms (Dialogue: ✓, Web: ✓)`);

        const speedup = ((sequentialDuration - parallelDuration) / sequentialDuration) * 100;
        logger.info(`📊 Speedup: ${speedup.toFixed(1)}% faster in parallel`);
      } else {
        failureCount += 2;
        logger.error(`❌ Parallel execution had failures`);
      }
    } catch (error) {
      failureCount += 4;
      logger.error(
        `❌ Scenario 3 error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    logger.info("");

    // Scenario 4: Priority Handling
    logger.info("📋 Scenario 4: Priority Levels");
    totalRequests += 2;

    try {
      const criticalStart = Date.now();
      const criticalResponse = await orchestrator.executeRequest(
        "Dialogue",
        "respond",
        { message: "URGENT: System status?" },
        "test-user",
        "CRITICAL",
      );
      const criticalDuration = Date.now() - criticalStart;

      const lowStart = Date.now();
      const lowResponse = await orchestrator.executeRequest(
        "Web",
        "search",
        { query: "general information" },
        "test-user",
        "LOW",
      );
      const lowDuration = Date.now() - lowStart;

      if (criticalResponse.success) {
        successCount++;
        logger.info(`✅ CRITICAL priority: ${criticalDuration}ms`);
      } else {
        failureCount++;
        logger.error(`❌ CRITICAL request failed`);
      }

      if (lowResponse.success) {
        successCount++;
        logger.info(`✅ LOW priority: ${lowDuration}ms`);
      } else {
        failureCount++;
        logger.error(`❌ LOW request failed`);
      }
    } catch (error) {
      failureCount += 2;
      logger.error(
        `❌ Scenario 4 error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    logger.info("");

    // Scenario 5: Error Handling
    logger.info("📋 Scenario 5: Non-existent Agent");
    totalRequests++;

    try {
      const failResponse = await orchestrator.executeRequest(
        "NonExistentAgent",
        "doSomething",
        {},
        "test-user",
        "MEDIUM",
      );

      if (!failResponse.success && failResponse.error) {
        successCount++; // Expected failure is success for error handling test
        logger.info(`✅ Error handling works: ${failResponse.error}`);
      } else {
        failureCount++;
        logger.error(`❌ Expected failure but got success`);
      }
    } catch (error) {
      failureCount++;
      logger.error(
        `❌ Scenario 5 error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    logger.info("");

    // Final statistics
    const testDuration = Date.now() - testStartTime;
    const healthSummary = registry.getHealthSummary();

    logger.info("📊 Final Statistics:");
    logger.info(`   Total test duration: ${testDuration}ms`);
    logger.info(`   Total requests sent: ${totalRequests}`);
    logger.info(`   Successful: ${successCount}`);
    logger.info(`   Failed: ${failureCount}`);
    logger.info(`   Success rate: ${((successCount / totalRequests) * 100).toFixed(1)}%`);
    logger.info(`   System availability: ${healthSummary.availability.toFixed(1)}%`);
    logger.info(`   Online agents: ${healthSummary.online}/${healthSummary.total}`);

    // Cleanup
    registry.stopHealthChecks();

    logger.info("\n✅ Multi-Agent Coordination Test Complete!\n");
  } catch (error) {
    logger.error("❌ Test suite failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the test
testMultiAgent().catch((error) => {
  const logger = createLogger("multi-agent-test");
  logger.error("Fatal error in test script", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
