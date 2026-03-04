import { randomUUID } from "node:crypto";
import type { Logger } from "winston";
import type { CacheRepository, ReasoningRepository } from "../database/repositories";
import type { VertexLLMClient } from "../llm";
import { ContextManager, type ConversationMessage } from "../memory";
import type { Orchestrator } from "../orchestrator/orchestrator";
import type { AgentOutput, AgentResponse } from "../types/agent";
import type {
  CachedResponse,
  Criticality,
  EnhancedExecutionPlan,
  Goal,
  JarvisResponse,
  ReasoningStep,
  ReasoningTrace,
  UserInput,
  VerificationCheck,
  VerificationResult,
} from "./types";

/**
 * Advanced Reasoning Engine with chain-of-thought reasoning, multi-path analysis,
 * pre-execution verification, and visible reasoning steps.
 *
 * Features:
 * - Goal parsing from natural language
 * - Criticality assessment
 * - Multi-path reasoning for critical decisions
 * - Chain-of-thought reasoning with visible steps
 * - Pre-execution verification (safety, permissions, feasibility, goal alignment)
 * - Dependency-aware plan execution
 * - Explicit uncertainty declaration
 */
export class AdvancedReasoningEngine {
  private readonly orchestrator: Orchestrator;
  private readonly logger: Logger;
  private readonly llm: VertexLLMClient;
  private readonly contextManager: ContextManager;
  private readonly reasoningRepo?: ReasoningRepository;
  private readonly cacheRepo?: CacheRepository;
  private readonly MAX_RETRIES = 2; // Reduced from 3 for faster failure handling
  private readonly BASE_BACKOFF_MS = 500; // Reduced from 1000 for faster retries

  // Cache for responses (in-memory)
  private cache: Map<string, CachedResponse>;
  private readonly CACHE_TTL_MS = 3600000; // 1 hour

  /**
   * Creates a new AdvancedReasoningEngine instance.
   *
   * @param orchestrator - Orchestrator for executing agent requests
   * @param logger - Winston logger instance
   * @param llm - OpenAI client for LLM operations (required)
   * @param contextManager - Context manager for conversation memory (optional, creates new if not provided)
   * @param reasoningRepo - Repository for persisting reasoning traces (optional)
   * @param cacheRepo - Repository for persisting cache (optional)
   */
  constructor(
    orchestrator: Orchestrator,
    logger: Logger,
    llm: VertexLLMClient,
    contextManager?: ContextManager,
    reasoningRepo?: ReasoningRepository,
    cacheRepo?: CacheRepository,
  ) {
    this.orchestrator = orchestrator;
    this.logger = logger;
    this.llm = llm;
    this.contextManager = contextManager || new ContextManager(logger, llm);
    this.reasoningRepo = reasoningRepo;
    this.cacheRepo = cacheRepo;
    this.cache = new Map();

    // Clear expired cache entries every 10 minutes
    setInterval(() => this.clearExpiredCache(), 600000);

    this.logger.info("Advanced Reasoning Engine initialized", {
      features: [
        "chain-of-thought",
        "multi-path",
        "verification",
        "fast-path",
        "caching",
        "context-memory",
      ],
      persistence: reasoningRepo ? "Enabled" : "Disabled",
    });
  }

  /**
   * Main entry point with smart routing.
   * Routes simple queries to fast-path, complex queries to full reasoning.
   * Includes context management and reference resolution.
   *
   * @param input - User input to process
   * @returns Promise resolving to Jarvis response with reasoning trace
   */
  async processInput(input: UserInput): Promise<JarvisResponse> {
    const startTime = Date.now();

    this.logger.info(`\n${"=".repeat(80)}`);
    this.logger.info(`New request: "${input.text}"`);
    this.logger.info(`Session: ${input.sessionId}, User: ${input.userId}`);
    this.logger.info(`${"=".repeat(80)}`);

    // Step 1: Add user message to context
    await this.contextManager.addUserMessage(input.sessionId, input.userId, input.text);

    // Step 2: Resolve references using context
    const resolveStart = Date.now();
    const resolution = await this.contextManager.resolveReferences(input.sessionId, input.text);
    const resolveDuration = Date.now() - resolveStart;

    if (resolution.contextUsed) {
      this.logger.info(`✓ References resolved in ${resolveDuration}ms:`);
      this.logger.info(`  Original: "${input.text}"`);
      this.logger.info(`  Resolved: "${resolution.resolvedText}"`);
      resolution.references.forEach((value, key) => {
        this.logger.info(`    "${key}" → "${value}"`);
      });
    }

    // Step 3: Update input with resolved text
    const resolvedInput: UserInput = {
      ...input,
      text: resolution.resolvedText,
      context: {
        ...input.context,
        originalText: input.text,
        references: Array.from(resolution.references.entries()),
        entities: resolution.entities,
      },
    };

    // Step 4: Extract entities for future reference
    await this.contextManager.extractEntities(input.sessionId, resolution.resolvedText);

    // Step 5: Check cache (using resolved text)
    const cachedResponse = await this.getCachedResponse(resolvedInput);
    if (cachedResponse) {
      const totalDuration = Date.now() - startTime;
      this.logger.info(`✓ Served from cache in ${totalDuration}ms\n`);

      // Add to conversation history
      await this.contextManager.addAssistantMessage(
        input.sessionId,
        cachedResponse.text,
        cachedResponse.metadata
          ? {
              intent: cachedResponse.metadata.intentType,
              agentsUsed: cachedResponse.agentsUsed,
              confidence: cachedResponse.confidence,
              reasoningTraceId: cachedResponse.reasoningTraceId,
            }
          : undefined,
      );

      return cachedResponse;
    }

    // Step 6: Route to appropriate processing path
    let response: JarvisResponse;

    if (this.isSimpleQuery(resolvedInput.text)) {
      this.logger.info("Route: FAST-PATH (simple query)");
      response = await this.processSimpleQuery(resolvedInput);
    } else {
      this.logger.info("Route: FULL-REASONING (complex query)");
      response = await this.processComplexQuery(resolvedInput);
    }

    // Step 7: Add conversation context info to response
    response.metadata = {
      ...response.metadata,
      contextUsed: resolution.contextUsed,
      referencesResolved: Array.from(resolution.references.entries()),
    };

    // Step 8: Cache the response
    await this.cacheResponse(resolvedInput, response);

    const totalDuration = Date.now() - startTime;

    // Step 9: Add assistant message to context
    await this.contextManager.addAssistantMessage(input.sessionId, response.text, {
      intent: response.metadata?.intentType,
      agentsUsed: response.agentsUsed,
      confidence: response.confidence,
      reasoningTraceId: response.reasoningTraceId,
    } as ConversationMessage["metadata"]);

    // Note: Reasoning traces are saved within processComplexQuery
    // Simple queries (fast-path) don't generate full traces, so we skip saving them

    this.logger.info(`\n✓ Request completed in ${totalDuration}ms\n`);

    return response;
  }

  /**
   * Full reasoning path for complex queries.
   * Optimized with simplified reasoning for non-critical queries.
   */
  private async processComplexQuery(input: UserInput): Promise<JarvisResponse> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    this.logger.info(`Processing complex query: "${input.text}"`);

    try {
      // Step 1: Parse goal
      const goalStart = Date.now();
      const goal = await this.parseGoal(input);
      timings.goalParsing = Date.now() - goalStart;
      this.logger.info(`✓ Goal parsing: ${timings.goalParsing}ms`);
      this.logger.info(`Goal parsed: ${goal.primaryObjective}`, {
        goalId: goal.id,
        domains: goal.domains,
        riskLevel: goal.riskLevel,
        confidence: goal.confidence,
        researchDepth: goal.researchDepth,
      });

      // Step 2: Assess criticality
      const criticalityStart = Date.now();
      const criticality = this.assessCriticality(goal);
      timings.criticalityAssessment = Date.now() - criticalityStart;
      this.logger.info(`✓ Criticality: ${criticality} (${timings.criticalityAssessment}ms)`);

      // Step 3: Generate reasoning - use simplified version for LOW criticality + QUICK/MEDIUM depth
      const reasoningStart = Date.now();
      let traces: ReasoningTrace[];

      const useSimplifiedReasoning =
        criticality === "LOW" &&
        (goal.researchDepth === "QUICK" || goal.researchDepth === "MEDIUM");

      if (criticality === "CRITICAL") {
        this.logger.info("Multi-path reasoning (3 paths)...");
        traces = await this.generateMultiPathReasoning(goal, 3);
        this.logger.info(`Generated ${traces.length} reasoning paths`);
      } else if (useSimplifiedReasoning) {
        this.logger.info("Simplified reasoning (optimized)...");
        traces = [await this.generateSimplifiedReasoningTrace(goal)];
      } else {
        this.logger.info("Standard reasoning...");
        traces = [await this.generateReasoningTrace(goal)];
      }
      timings.reasoningGeneration = Date.now() - reasoningStart;
      this.logger.info(`✓ Reasoning: ${timings.reasoningGeneration}ms`);

      // Step 4: Select best trace
      const selectionStart = Date.now();
      const selectedTrace = await this.selectBestTrace(traces);
      timings.traceSelection = Date.now() - selectionStart;
      this.logger.info(`✓ Trace selection: ${timings.traceSelection}ms`);
      this.logger.info(`Selected trace with confidence: ${selectedTrace.confidence.toFixed(2)}`, {
        traceId: selectedTrace.id,
        approach: selectedTrace.approach,
        steps: selectedTrace.plan.steps.length,
      });

      // Step 5: Verify before execution
      const verificationStart = Date.now();
      this.logger.info("Verifying plan before execution...");
      const verification = await this.verify(selectedTrace);
      timings.verification = Date.now() - verificationStart;
      this.logger.info(`✓ Verification: ${timings.verification}ms`);

      if (!verification.passed) {
        this.logger.warn("Verification failed", {
          blockers: verification.blockers,
          failedChecks: verification.checks.filter((c) => !c.passed).map((c) => c.name),
        });
        const response = this.handleVerificationFailure(verification, selectedTrace);
        const totalDuration = Date.now() - startTime;
        this.logger.info(`Request completed in ${totalDuration}ms (verification failed)`);
        return response;
      }
      this.logger.info("✓ Verification passed", {
        checks: verification.checks.length,
        passed: verification.checks.filter((c) => c.passed).length,
      });

      // Step 6: Execute plan
      const executionStart = Date.now();
      this.logger.info("Executing plan...", {
        stepCount: selectedTrace.plan.steps.length,
      });
      const agentOutputs = await this.executePlan(selectedTrace.plan);
      timings.planExecution = Date.now() - executionStart;
      this.logger.info(`✓ Plan execution: ${timings.planExecution}ms`);

      // Step 7: Synthesize response
      const synthesisStart = Date.now();
      this.logger.info("Synthesizing response...");
      const response = await this.synthesize(selectedTrace, agentOutputs);
      timings.responseSynthesis = Date.now() - synthesisStart;
      this.logger.info(`✓ Response synthesis: ${timings.responseSynthesis}ms`);

      const totalDuration = Date.now() - startTime;

      // Log performance summary (using multiple logger calls for better visibility)
      this.logger.info("");
      this.logger.info("═══════════════════════════════════════════════════════════");
      this.logger.info("Performance Summary:");
      this.logger.info(`  Goal parsing:        ${timings.goalParsing}ms`);
      this.logger.info(`  Criticality:         ${timings.criticalityAssessment}ms`);
      this.logger.info(`  Reasoning:           ${timings.reasoningGeneration}ms`);
      this.logger.info(`  Trace selection:     ${timings.traceSelection}ms`);
      this.logger.info(`  Verification:        ${timings.verification}ms`);
      this.logger.info(`  Plan execution:      ${timings.planExecution}ms`);
      this.logger.info(`  Response synthesis:  ${timings.responseSynthesis}ms`);
      this.logger.info(`  ───────────────────────────────────────────────────────`);
      this.logger.info(
        `  TOTAL:               ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`,
      );
      this.logger.info("═══════════════════════════════════════════════════════════");
      this.logger.info("");

      response.metadata = {
        ...response.metadata,
        reasoning: selectedTrace.reasoningSteps,
        duration: totalDuration,
        timings,
      };

      // Save reasoning trace to database
      if (this.reasoningRepo) {
        try {
          await this.reasoningRepo.saveTrace(
            selectedTrace,
            input.sessionId,
            input.userId,
            input.text,
            response.text,
            totalDuration,
          );
        } catch (error) {
          this.logger.warn("Failed to save reasoning trace:", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return response;
    } catch (error) {
      this.logger.error("Error processing input", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return this.handleError(error as Error, input);
    }
  }

  /**
   * Parses user input into a structured Goal using LLM.
   *
   * @param input - User input to parse
   * @returns Promise resolving to structured Goal
   */
  private async parseGoal(input: UserInput): Promise<Goal> {
    this.logger.info("Parsing goal from user input...");

    // Get conversation context
    const conversationSummary = this.contextManager.getConversationSummary(input.sessionId);
    const contextNote =
      conversationSummary !== "No previous conversation."
        ? `\n\nConversation context:\n${conversationSummary}`
        : "";

    const prompt = `You are Jarvis's Goal Parser. Convert user input into a structured goal.

User input: "${input.text}"${contextNote}

Analyze the input and extract:
1. Primary objective (what does the user want?)
2. Sub-goals (steps to achieve the objective)
3. Domains involved (finance, web, calendar, system, security, privacy, knowledge, etc.)
4. Risk level (LOW/MEDIUM/HIGH - consider financial impact, system changes, security implications)
5. Success criteria (how to know if we succeeded?)
6. Research depth needed (QUICK: simple facts/definitions, MEDIUM: standard research, DEEP: comprehensive analysis)

QUICK depth examples: "What is X?", "Define Y", "Explain Z briefly"
MEDIUM depth examples: "Research X", "Tell me about Y", "How does Z work?"
DEEP depth examples: "Comprehensive analysis of X", "Deep dive into Y", "Should I invest in Z?"

Respond in JSON format:
{
  "primaryObjective": "clear statement of what user wants",
  "subGoals": ["step 1", "step 2", ...],
  "domains": ["domain1", "domain2", ...],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "confidence": 0.0-1.0,
  "successCriteria": ["criterion 1", "criterion 2", ...],
  "researchDepth": "QUICK" | "MEDIUM" | "DEEP"
}

Only respond with valid JSON, no additional text.`;

    try {
      const response = await this.llm.complete(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in LLM response");
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        primaryObjective: string;
        subGoals: string[];
        domains: string[];
        riskLevel: "LOW" | "MEDIUM" | "HIGH";
        confidence: number;
        successCriteria: string[];
        researchDepth?: "QUICK" | "MEDIUM" | "DEEP";
      };

      // Generate goal ID
      const goalId = randomUUID();

      // Extract time constraints if mentioned
      const timeConstraints = this.extractTimeConstraints(input.text);

      return {
        id: goalId,
        primaryObjective: parsed.primaryObjective,
        subGoals: parsed.subGoals || [],
        domains: parsed.domains || [],
        timeConstraints,
        successCriteria: parsed.successCriteria || [],
        riskLevel: parsed.riskLevel || "MEDIUM",
        confidence: parsed.confidence || 0.7,
        researchDepth: parsed.researchDepth || "MEDIUM",
      };
    } catch (error) {
      this.logger.warn("Goal parsing failed, using fallback", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback goal
      return {
        id: randomUUID(),
        primaryObjective: input.text,
        subGoals: [],
        domains: ["general"],
        successCriteria: ["User request addressed"],
        riskLevel: "LOW",
        confidence: 0.5,
        researchDepth: "MEDIUM",
      };
    }
  }

  /**
   * Extracts time constraints from text if mentioned.
   *
   * @param text - Input text to analyze
   * @returns Time constraints if found, undefined otherwise
   */
  private extractTimeConstraints(text: string): Goal["timeConstraints"] | undefined {
    // Look for deadline mentions
    const deadlinePatterns = [
      /by (\d{1,2}\/\d{1,2}\/\d{4})/i,
      /before (\d{1,2}\/\d{1,2}\/\d{4})/i,
      /deadline.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ];

    for (const pattern of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const deadline = new Date(match[1]);
          if (!Number.isNaN(deadline.getTime())) {
            return { deadline };
          }
        } catch {
          // Invalid date, continue
        }
      }
    }

    // Look for duration mentions
    const durationPatterns = [
      /within (\d+) (minutes?|hours?|days?)/i,
      /in (\d+) (minutes?|hours?|days?)/i,
    ];

    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        let durationMs = 0;

        if (unit.startsWith("minute")) {
          durationMs = value * 60 * 1000;
        } else if (unit.startsWith("hour")) {
          durationMs = value * 60 * 60 * 1000;
        } else if (unit.startsWith("day")) {
          durationMs = value * 24 * 60 * 60 * 1000;
        }

        if (durationMs > 0) {
          return { duration: durationMs };
        }
      }
    }

    return undefined;
  }

  /**
   * Assesses the criticality of a goal to determine reasoning approach.
   *
   * @param goal - Goal to assess
   * @returns Criticality level
   */
  private assessCriticality(goal: Goal): Criticality {
    const criticalDomains = ["finance", "system", "security", "privacy"];
    const hasCriticalDomain = goal.domains.some((d) =>
      criticalDomains.some((cd) => d.toLowerCase().includes(cd)),
    );

    if (hasCriticalDomain || goal.riskLevel === "HIGH") {
      this.logger.debug("Criticality: CRITICAL", {
        reason: hasCriticalDomain ? "Critical domain" : "High risk level",
      });
      return "CRITICAL";
    }

    if (goal.confidence < 0.7) {
      this.logger.debug("Criticality: MEDIUM", { reason: "Low confidence" });
      return "MEDIUM";
    }

    this.logger.debug("Criticality: LOW", { reason: "Standard goal" });
    return "LOW";
  }

  /**
   * Generates a reasoning trace with chain-of-thought reasoning.
   *
   * @param goal - Goal to reason about
   * @param approach - Optional approach description (for multi-path)
   * @returns Promise resolving to ReasoningTrace
   */
  private async generateReasoningTrace(goal: Goal, approach?: string): Promise<ReasoningTrace> {
    const prompt = `You are Jarvis's Reasoning Engine. Think step-by-step about how to achieve this goal.

GOAL: ${goal.primaryObjective}
SUB-GOALS: ${goal.subGoals.join(", ")}
DOMAINS: ${goal.domains.join(", ")}
${approach ? `APPROACH: ${approach}` : ""}

Available agents:
- Dialogue: General conversation, greetings
- Web: Web search, finding current information
- Knowledge: Research, fact-checking, summarization

RULES:
- Never guess - declare uncertainty if information is missing
- All agent calls must be justified
- Consider failure scenarios
- Bounded retries (max 3 attempts per step)

FORMAT:

<reasoning>
Step 1: [What is the user really asking for?]
Step 2: [What information do I need? From which agents?]
Step 3: [What's the correct sequence of actions?]
Step 4: [What could go wrong? How to handle failures?]
Step 5: [How will I verify success?]
Step 6: [What am I uncertain about?]
</reasoning>

<plan>
STEPS:
1. Agent: [AgentName], Action: [action], Input: {key: "value"}, Expected: [output type], Critical: [true/false]
2. Agent: [AgentName], Action: [action], Input: {key: "value"}, Expected: [output type], Critical: [true/false]

DEPENDENCIES:
- step-2 depends on step-1
(list any dependencies)

PARALLELIZABLE:
- [step-1, step-2] can run in parallel
(list any steps that can run simultaneously)

CONFIDENCE: [0.0-1.0]
UNCERTAINTIES: [List anything unclear or missing]
</plan>`;

    try {
      // Adjust max_tokens based on depth
      const maxTokens =
        goal.researchDepth === "QUICK" ? 2048 : goal.researchDepth === "DEEP" ? 4096 : 3072;

      this.logger.debug(
        `Generating reasoning trace (max_tokens: ${maxTokens}, depth: ${goal.researchDepth})`,
      );

      const response = await this.llm.complete(prompt, {
        temperature: 0.3,
        maxTokens,
      });

      // Extract reasoning section
      const reasoningMatch = response.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
      const reasoningSteps = reasoningMatch ? this.parseReasoningSteps(reasoningMatch[1]) : [];

      // Extract plan section
      const planMatch = response.match(/<plan>([\s\S]*?)<\/plan>/);
      const plan: EnhancedExecutionPlan = planMatch
        ? this.parseExecutionPlan(planMatch[1], goal)
        : this.createFallbackPlan(goal);

      // Extract confidence and uncertainties
      const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9.]+)/);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;

      // Extract uncertainties (not used in trace, but available for logging)
      const uncertaintiesMatch = response.match(/UNCERTAINTIES:\s*(.+?)(?:\n|$)/);
      if (uncertaintiesMatch) {
        const uncertainties = uncertaintiesMatch[1]
          .split(",")
          .map((u) => u.trim())
          .filter((u) => u);
        this.logger.debug("Uncertainties identified", { uncertainties });
      }

      const traceId = randomUUID();

      return {
        id: traceId,
        goal,
        reasoningSteps,
        plan,
        approach,
        timestamp: new Date(),
        confidence,
        estimatedDuration: plan.steps.length * 500, // Rough estimate
      };
    } catch (error) {
      this.logger.error("Failed to generate reasoning trace", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parses reasoning steps from text.
   *
   * @param thinkContent - Content from <reasoning> section
   * @returns Array of ReasoningStep objects
   */
  private parseReasoningSteps(thinkContent: string): ReasoningStep[] {
    const steps: ReasoningStep[] = [];
    const stepPattern = /Step\s+(\d+):\s*(.+?)(?=Step\s+\d+:|$)/gs;
    let match: RegExpExecArray | null = stepPattern.exec(thinkContent);

    while (match !== null) {
      const stepNumber = parseInt(match[1], 10);
      const content = match[2].trim();

      // Infer type from content
      let type: ReasoningStep["type"] = "ANALYSIS";
      if (content.toLowerCase().includes("plan") || content.toLowerCase().includes("sequence")) {
        type = "PLANNING";
      } else if (
        content.toLowerCase().includes("verify") ||
        content.toLowerCase().includes("check")
      ) {
        type = "VERIFICATION";
      } else if (
        content.toLowerCase().includes("decide") ||
        content.toLowerCase().includes("choose")
      ) {
        type = "DECISION";
      }

      // Estimate confidence from language
      let confidence = 0.7;
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes("definitely") || lowerContent.includes("certain")) {
        confidence = 0.9;
      } else if (lowerContent.includes("probably") || lowerContent.includes("likely")) {
        confidence = 0.7;
      } else if (lowerContent.includes("maybe") || lowerContent.includes("possibly")) {
        confidence = 0.5;
      } else if (lowerContent.includes("uncertain") || lowerContent.includes("unclear")) {
        confidence = 0.3;
      }

      steps.push({
        stepNumber,
        type,
        content,
        confidence,
        justification: `Step ${stepNumber} of reasoning process`,
      });
      match = stepPattern.exec(thinkContent);
    }

    return steps;
  }

  /**
   * Parses execution plan from text.
   *
   * @param planContent - Content from <plan> section
   * @param goal - Goal to extract depth preferences from
   * @returns EnhancedExecutionPlan object
   */
  private parseExecutionPlan(planContent: string, goal: Goal): EnhancedExecutionPlan {
    const steps: import("../types/agent").PlanStep[] = [];
    const dependencies = new Map<string, string[]>();
    const parallelizable: string[][] = [];

    // Parse STEPS section
    const stepsMatch = planContent.match(
      /STEPS:\s*([\s\S]*?)(?=DEPENDENCIES:|PARALLELIZABLE:|CONFIDENCE:|$)/,
    );
    if (stepsMatch) {
      const stepLines = stepsMatch[1]
        .split("\n")
        .filter((line) => line.trim() && /^\d+\./.test(line.trim()));

      stepLines.forEach((line, index) => {
        const stepId = `step-${index + 1}`;

        // Parse: Agent: [AgentName], Action: [action], Input: {key: "value"}, Expected: [output type], Critical: [true/false]
        const agentMatch = line.match(/Agent:\s*(\w+)/i);
        const actionMatch = line.match(/Action:\s*(\w+)/i);
        const inputMatch = line.match(/Input:\s*(\{[^}]+\})/i);

        const agentId = agentMatch ? agentMatch[1] : "Dialogue";
        const action = actionMatch ? actionMatch[1] : "respond";
        let inputs: Record<string, unknown> = {};

        if (inputMatch) {
          try {
            inputs = JSON.parse(inputMatch[1]);
          } catch {
            // If JSON parse fails, extract key-value pairs manually
            const kvMatches = inputMatch[1].matchAll(/(\w+):\s*"([^"]+)"/g);
            for (const kv of kvMatches) {
              inputs[kv[1]] = kv[2];
            }
          }
        }

        // Add depth for Knowledge agent operations
        if (agentId === "Knowledge" && goal.researchDepth && !inputs.depth) {
          inputs.depth = this.mapDepthToAgentDepth(goal.researchDepth);
        }

        steps.push({
          id: stepId,
          agentId,
          action,
          inputs,
        });
      });
    }

    // Parse DEPENDENCIES section
    const depsMatch = planContent.match(
      /DEPENDENCIES:\s*([\s\S]*?)(?=PARALLELIZABLE:|CONFIDENCE:|$)/,
    );
    if (depsMatch) {
      const depLines = depsMatch[1]
        .split("\n")
        .filter((line) => line.trim() && line.includes("depends"));
      depLines.forEach((line) => {
        const match = line.match(/(\w+-\d+)\s+depends\s+on\s+(\w+-\d+)/i);
        if (match) {
          const dependent = match[1];
          const dependency = match[2];
          if (!dependencies.has(dependent)) {
            dependencies.set(dependent, []);
          }
          dependencies.get(dependent)!.push(dependency);
        }
      });
    }

    // Parse PARALLELIZABLE section
    const parallelMatch = planContent.match(/PARALLELIZABLE:\s*([\s\S]*?)(?=CONFIDENCE:|$)/);
    if (parallelMatch) {
      const parallelLines = parallelMatch[1]
        .split("\n")
        .filter((line) => line.trim() && line.includes("["));
      parallelLines.forEach((line) => {
        const match = line.match(/\[([^\]]+)\]/);
        if (match) {
          const stepIds = match[1].split(",").map((s) => s.trim());
          parallelizable.push(stepIds);
        }
      });
    }

    return {
      id: randomUUID(),
      steps,
      canRunInParallel: parallelizable.length > 0 ? parallelizable : [steps.map((s) => s.id)],
      estimatedDuration: steps.length * 500,
      dependencies,
      parallelizable,
    };
  }

  /**
   * Map goal research depth to agent-specific depth parameter.
   *
   * @param researchDepth - Goal research depth
   * @returns Agent-specific depth string
   */
  private mapDepthToAgentDepth(researchDepth: string): string {
    switch (researchDepth) {
      case "QUICK":
        return "quick";
      case "DEEP":
        return "deep";
      default:
        return "medium";
    }
  }

  /**
   * Creates a fallback plan if parsing fails.
   *
   * @param goal - Goal to create plan for
   * @returns Fallback ExecutionPlan
   */
  private createFallbackPlan(goal: Goal): EnhancedExecutionPlan {
    const stepId = randomUUID();
    const step: import("../types/agent").PlanStep = {
      id: stepId,
      agentId: "Dialogue",
      action: "respond",
      inputs: {
        message: goal.primaryObjective,
      },
    };

    const parallelGroup = [[stepId]];

    return {
      id: randomUUID(),
      steps: [step],
      canRunInParallel: parallelGroup,
      estimatedDuration: 500,
      dependencies: new Map(),
      parallelizable: parallelGroup,
    };
  }

  /**
   * Generates multiple reasoning paths for critical decisions.
   *
   * @param goal - Goal to reason about
   * @param numPaths - Number of paths to generate
   * @returns Promise resolving to array of ReasoningTrace objects
   */
  private async generateMultiPathReasoning(
    goal: Goal,
    numPaths: number,
  ): Promise<ReasoningTrace[]> {
    const approaches = [
      "conservative approach - minimize risk",
      "balanced approach - optimize for speed and accuracy",
      "thorough approach - maximize information gathering",
    ];

    const traces: ReasoningTrace[] = [];

    for (let i = 0; i < Math.min(numPaths, approaches.length); i++) {
      const approach = approaches[i];
      this.logger.debug(`Generating path ${i + 1}: ${approach}`);

      try {
        const trace = await this.generateReasoningTrace(goal, approach);
        traces.push(trace);
      } catch (error) {
        this.logger.warn(`Failed to generate path ${i + 1}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return traces;
  }

  /**
   * Selects the best reasoning trace from multiple options.
   *
   * @param traces - Array of reasoning traces to choose from
   * @returns Best ReasoningTrace
   */
  private async selectBestTrace(traces: ReasoningTrace[]): Promise<ReasoningTrace> {
    if (traces.length === 1) {
      return traces[0];
    }

    // Score each trace
    const scored = traces.map((trace) => {
      const confidenceScore = trace.confidence * 0.6;
      const durationScore = trace.estimatedDuration
        ? (1 / (trace.estimatedDuration / 1000)) * 0.2
        : 0;
      const complexityScore = trace.plan.steps.length < 5 ? 0.2 : 0.1;
      const score = confidenceScore + durationScore + complexityScore;

      this.logger.debug(`Trace score: ${score.toFixed(2)}`, {
        traceId: trace.id,
        confidence: trace.confidence,
        steps: trace.plan.steps.length,
        approach: trace.approach,
      });

      return { trace, score };
    });

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    this.logger.info(`Selected trace with score: ${best.score.toFixed(2)}`, {
      traceId: best.trace.id,
      approach: best.trace.approach,
    });

    return best.trace;
  }

  /**
   * Verifies the plan before execution.
   *
   * @param trace - Reasoning trace to verify
   * @returns Promise resolving to VerificationResult
   */
  private async verify(trace: ReasoningTrace): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];

    // Safety check
    const safetyCheck = this.checkSafety(trace);
    checks.push(safetyCheck);

    // Permissions check
    const permissionsCheck = await this.checkPermissions(trace);
    checks.push(permissionsCheck);

    // Feasibility check
    const feasibilityCheck = this.checkFeasibility(trace);
    checks.push(feasibilityCheck);

    // Goal alignment check
    const alignmentCheck = this.checkGoalAlignment(trace);
    checks.push(alignmentCheck);

    const passed = checks.every((c) => c.passed);
    const blockers = checks
      .filter((c) => !c.passed && c.severity === "ERROR")
      .map((c) => c.details);

    return {
      passed,
      checks,
      timestamp: new Date(),
      blockers: blockers.length > 0 ? blockers : undefined,
    };
  }

  /**
   * Checks if plan involves destructive operations.
   *
   * @param trace - Reasoning trace to check
   * @returns VerificationCheck result
   */
  private checkSafety(trace: ReasoningTrace): VerificationCheck {
    const destructiveKeywords = ["delete", "remove", "drop", "destroy", "format", "wipe"];
    const planText = JSON.stringify(trace.plan).toLowerCase();
    const hasDestructiveOps = destructiveKeywords.some((keyword) => planText.includes(keyword));

    // Check for financial transactions
    const hasFinancialOps = trace.goal.domains.some((d) => d.toLowerCase().includes("finance"));

    if (hasDestructiveOps || hasFinancialOps) {
      return {
        name: "Safety Check",
        passed: false,
        details: hasDestructiveOps
          ? "Plan contains potentially destructive operations"
          : "Plan involves financial operations - requires explicit user confirmation",
        severity: "ERROR",
      };
    }

    return {
      name: "Safety Check",
      passed: true,
      details: "No destructive operations detected",
      severity: "INFO",
    };
  }

  /**
   * Checks if required agents are available and operations are permitted.
   *
   * @param trace - Reasoning trace to check
   * @returns Promise resolving to VerificationCheck result
   */
  private async checkPermissions(trace: ReasoningTrace): Promise<VerificationCheck> {
    const requiredAgents = new Set(
      trace.plan.steps.map((s: import("../types/agent").PlanStep) => s.agentId),
    );
    const unavailableAgents: string[] = [];

    for (const agentId of requiredAgents) {
      // Check if agent is registered and available
      // This is a simplified check - in production, would query registry
      const isAvailable = true; // Placeholder - would check actual registry
      if (!isAvailable) {
        unavailableAgents.push(agentId);
      }
    }

    if (unavailableAgents.length > 0) {
      return {
        name: "Permissions Check",
        passed: false,
        details: `Required agents unavailable: ${unavailableAgents.join(", ")}`,
        severity: "ERROR",
      };
    }

    return {
      name: "Permissions Check",
      passed: true,
      details: "All required agents are available",
      severity: "INFO",
    };
  }

  /**
   * Checks if plan steps are feasible and inputs are complete.
   *
   * @param trace - Reasoning trace to check
   * @returns VerificationCheck result
   */
  private checkFeasibility(trace: ReasoningTrace): VerificationCheck {
    const missingInputs: string[] = [];

    for (const step of trace.plan.steps) {
      // Check if critical inputs are missing
      if (step.action === "search" && !step.inputs.query) {
        missingInputs.push(`Step ${step.id}: missing query`);
      }
      if (step.action === "research" && !step.inputs.topic) {
        missingInputs.push(`Step ${step.id}: missing topic`);
      }
    }

    if (missingInputs.length > 0) {
      return {
        name: "Feasibility Check",
        passed: false,
        details: `Missing required inputs: ${missingInputs.join("; ")}`,
        severity: "ERROR",
      };
    }

    return {
      name: "Feasibility Check",
      passed: true,
      details: "All plan steps are feasible",
      severity: "INFO",
    };
  }

  /**
   * Verifies that plan will achieve goal's success criteria.
   *
   * @param trace - Reasoning trace to check
   * @returns VerificationCheck result
   */
  private checkGoalAlignment(trace: ReasoningTrace): VerificationCheck {
    // Simple heuristic: check if plan steps align with goal domains
    const goalDomains = trace.goal.domains.map((d) => d.toLowerCase());
    const planAgents = trace.plan.steps.map((s: import("../types/agent").PlanStep) =>
      s.agentId.toLowerCase(),
    );

    // Check if we're using appropriate agents for the domains
    const hasKnowledgeDomain = goalDomains.some(
      (d) => d.includes("knowledge") || d.includes("research"),
    );
    const usesKnowledgeAgent = planAgents.includes("knowledge");

    if (hasKnowledgeDomain && !usesKnowledgeAgent) {
      return {
        name: "Goal Alignment Check",
        passed: false,
        details: "Goal requires knowledge/research but plan does not use Knowledge agent",
        severity: "WARNING",
      };
    }

    return {
      name: "Goal Alignment Check",
      passed: true,
      details: "Plan aligns with goal success criteria",
      severity: "INFO",
    };
  }

  /**
   * Executes the plan with dependency handling and retry logic.
   *
   * @param plan - Execution plan to execute
   * @returns Promise resolving to Map of step IDs to outputs
   */
  private async executePlan(plan: EnhancedExecutionPlan): Promise<Map<string, AgentOutput>> {
    const outputs = new Map<string, AgentOutput>();
    const startTime = Date.now();

    // Build execution order respecting dependencies
    const executionOrder = this.buildExecutionOrder(plan);

    this.logger.info(`Executing plan with ${plan.steps.length} steps`);
    this.logger.info(`Execution order: ${executionOrder.length} groups (parallel where possible)`);

    // Execute in order, parallelizing where possible
    for (const group of executionOrder) {
      const groupStartTime = Date.now();

      if (group.length === 1) {
        // Single step - execute directly
        const step = plan.steps.find((s) => s.id === group[0]);
        if (step) {
          await this.executeStepWithRetry(step, outputs);
        }
      } else {
        // Multiple steps - execute in parallel
        this.logger.info(`Executing ${group.length} steps in parallel`);
        await Promise.all(
          group.map((stepId) => {
            const step = plan.steps.find((s) => s.id === stepId);
            if (!step) return Promise.resolve();
            return this.executeStepWithRetry(step, outputs);
          }),
        );
      }

      const groupDuration = Date.now() - groupStartTime;
      this.logger.debug(`Group completed in ${groupDuration}ms`);
    }

    const totalDuration = Date.now() - startTime;
    this.logger.info(`Plan execution completed in ${totalDuration}ms`);

    return outputs;
  }

  /**
   * Builds execution order respecting dependencies and maximizing parallelization.
   * Returns array of step ID groups where each group can execute in parallel.
   *
   * @param plan - Execution plan
   * @returns Array of step ID groups (each group can run in parallel)
   */
  private buildExecutionOrder(plan: EnhancedExecutionPlan): string[][] {
    const executionOrder: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(plan.steps.map((s) => s.id));

    while (remaining.size > 0) {
      // Find all steps whose dependencies are satisfied
      const readySteps = plan.steps.filter((step) => {
        if (!remaining.has(step.id)) return false;

        const dependencies = plan.dependencies.get(step.id) || [];
        return dependencies.every((depId) => completed.has(depId));
      });

      if (readySteps.length === 0) {
        // No steps ready - circular dependency or error
        this.logger.error("Circular dependency detected or invalid plan");
        // Execute remaining steps anyway
        const remainingIds = Array.from(remaining);
        if (remainingIds.length > 0) {
          executionOrder.push(remainingIds);
          remainingIds.forEach((id) => {
            completed.add(id);
            remaining.delete(id);
          });
        }
        break;
      }

      // Add ready steps as a parallel group
      const readyIds = readySteps.map((s) => s.id);
      executionOrder.push(readyIds);

      // Mark as completed
      readyIds.forEach((id) => {
        completed.add(id);
        remaining.delete(id);
      });
    }

    return executionOrder;
  }

  /**
   * Execute a single step with retry logic and exponential backoff.
   *
   * @param step - Plan step to execute
   * @param outputs - Map to store outputs
   */
  private async executeStepWithRetry(
    step: import("../types/agent").PlanStep,
    outputs: Map<string, AgentOutput>,
  ): Promise<void> {
    let attempt = 0;
    let success = false;
    const stepStartTime = Date.now();
    const timeout = step.timeout || 30000; // 30s default

    while (attempt < this.MAX_RETRIES && !success) {
      try {
        const attemptStart = Date.now();

        this.logger.debug(
          `[${step.id}] Executing ${step.agentId}.${step.action} (attempt ${attempt + 1}/${this.MAX_RETRIES}, timeout: ${timeout}ms)`,
        );

        const response: AgentResponse = await this.executeWithTimeout(
          this.orchestrator.executeRequest(
            step.agentId,
            step.action,
            step.inputs,
            "advanced-reasoning-engine",
            "HIGH",
          ),
          timeout,
          `${step.agentId}.${step.action}`,
        );

        const duration = Date.now() - attemptStart;

        outputs.set(step.id, {
          stepId: step.id,
          agentId: step.agentId,
          success: response.success,
          data: response.data,
          error: response.error,
          duration,
        });

        success = true;
        this.logger.debug(`[${step.id}] ✓ Success in ${duration}ms`);
      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (attempt < this.MAX_RETRIES) {
          const backoffMs = this.BASE_BACKOFF_MS * 2 ** (attempt - 1);
          this.logger.warn(`[${step.id}] ✗ Attempt ${attempt} failed: ${errorMessage}`);
          this.logger.warn(`[${step.id}] Retrying in ${backoffMs}ms...`);
          await this.sleep(backoffMs);
        } else {
          const totalDuration = Date.now() - stepStartTime;
          this.logger.error(
            `[${step.id}] ✗ All ${this.MAX_RETRIES} attempts failed after ${totalDuration}ms`,
          );

          outputs.set(step.id, {
            stepId: step.id,
            agentId: step.agentId,
            success: false,
            error: errorMessage,
            duration: totalDuration,
          });
        }
      }
    }
  }

  /**
   * Execute request with timeout protection.
   *
   * @param promise - Promise to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param operationName - Name of operation for error messages
   * @returns Promise resolving to result or rejecting on timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Synthesizes agent outputs into a natural response.
   *
   * @param trace - Reasoning trace
   * @param agentOutputs - Map of step IDs to outputs
   * @returns Promise resolving to JarvisResponse
   */
  private async synthesize(
    trace: ReasoningTrace,
    agentOutputs: Map<string, AgentOutput>,
  ): Promise<JarvisResponse> {
    // Detect conflicts and resolve
    const successfulOutputs = Array.from(agentOutputs.values()).filter((o) => o.success);

    if (successfulOutputs.length === 0) {
      this.logger.warn("No successful agent outputs - generating error response");
      return this.handleAllAgentsFailed(trace, agentOutputs);
    }

    const prompt = `You are Jarvis. Synthesize agent outputs into a natural, helpful response.

User's goal: ${trace.goal.primaryObjective}

Reasoning steps:
${trace.reasoningSteps.map((s) => `${s.stepNumber}. ${s.content}`).join("\n")}

Agent outputs:
${Array.from(agentOutputs.entries())
  .map(([id, output]) =>
    output.success ? `✓ ${id}: ${JSON.stringify(output.data)}` : `✗ ${id}: ${output.error}`,
  )
  .join("\n")}

Provide a clear, natural response that:
- Directly addresses the user's goal
- Summarizes key information from agent outputs
- Maintains conversational tone
- Cites sources when applicable
- Mentions uncertainties if any exist

Response:`;

    try {
      // Adjust synthesis token limit based on depth
      const maxTokens =
        trace.goal.researchDepth === "QUICK"
          ? 500
          : trace.goal.researchDepth === "DEEP"
            ? 1500
            : 1000;

      this.logger.debug(
        `Synthesizing response (max_tokens: ${maxTokens}, depth: ${trace.goal.researchDepth})`,
      );

      const synthesized = await this.llm.complete(prompt, {
        temperature: 0.7,
        maxTokens,
      });

      // Extract uncertainties from trace and outputs
      const uncertainties: string[] = [];

      // Add uncertainties from failed outputs
      agentOutputs.forEach((output, stepId) => {
        if (!output.success) {
          uncertainties.push(`${stepId}: ${output.error}`);
        }
      });

      // Add uncertainties from trace
      if (trace.confidence < 0.7) {
        uncertainties.push("Low confidence in reasoning trace");
      }

      // Calculate final confidence
      const successRate = successfulOutputs.length / agentOutputs.size;
      const finalConfidence = trace.confidence * 0.6 + successRate * 0.4;

      return {
        text: synthesized.trim(),
        reasoningTraceId: trace.id,
        confidence: finalConfidence,
        agentsUsed: Array.from(
          new Set(
            Array.from(agentOutputs.entries())
              .filter(([_, output]) => output.success)
              .map(([stepId, _]) => {
                const step = trace.plan.steps.find((s) => s.id === stepId);
                return step?.agentId || "unknown";
              }),
          ),
        ),
        timestamp: new Date(),
        uncertainties: uncertainties.length > 0 ? uncertainties : undefined,
        metadata: {
          intentType: trace.goal.domains[0] || "general",
        },
      };
    } catch (error) {
      this.logger.error("Synthesis failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback response
      return {
        text: `I've processed your request about "${trace.goal.primaryObjective}", but encountered an error while formatting the response. Please try again.`,
        reasoningTraceId: trace.id,
        confidence: 0.3,
        agentsUsed: [],
        timestamp: new Date(),
        uncertainties: ["Failed to synthesize response"],
      };
    }
  }

  /**
   * Handle case where all agent calls failed.
   *
   * @param trace - Reasoning trace
   * @param agentOutputs - Map of step IDs to outputs
   * @returns JarvisResponse with error message
   */
  private handleAllAgentsFailed(
    trace: ReasoningTrace,
    agentOutputs: Map<string, AgentOutput>,
  ): JarvisResponse {
    const errors = Array.from(agentOutputs.values())
      .filter((o) => !o.success)
      .map((o) => o.error)
      .join("; ");

    return {
      text: `I encountered issues completing your request. ${errors}. Please try again or rephrase your question.`,
      reasoningTraceId: trace.id,
      confidence: 0.0,
      agentsUsed: [],
      timestamp: new Date(),
      uncertainties: [`All agent calls failed: ${errors}`],
    };
  }

  /**
   * Handles verification failure by returning explanatory response.
   *
   * @param verification - Verification result
   * @param trace - Reasoning trace that failed verification
   * @returns JarvisResponse explaining the failure
   */
  private handleVerificationFailure(
    verification: VerificationResult,
    trace: ReasoningTrace,
  ): JarvisResponse {
    const blockers = verification.blockers || [];
    const failedChecks = verification.checks.filter((c) => !c.passed);

    const explanation = `I cannot proceed with this request because:

${failedChecks.map((c) => `- ${c.name}: ${c.details}`).join("\n")}

${blockers.length > 0 ? `\nBlockers:\n${blockers.map((b) => `- ${b}`).join("\n")}` : ""}

Please revise your request or provide additional information.`;

    return {
      text: explanation,
      reasoningTraceId: trace.id,
      confidence: 0.0,
      agentsUsed: [],
      timestamp: new Date(),
      uncertainties: blockers,
      metadata: {
        intentType: trace.goal.domains[0] || "general",
      },
    };
  }

  /**
   * Handles errors gracefully.
   *
   * @param error - Error that occurred
   * @param input - Original user input
   * @returns JarvisResponse with error message
   */
  private handleError(error: Error, input: UserInput): JarvisResponse {
    return {
      text: `I encountered an error while processing your request: "${input.text}". Please try again or rephrase your question.`,
      reasoningTraceId: randomUUID(),
      confidence: 0.0,
      agentsUsed: [],
      timestamp: new Date(),
      uncertainties: [error.message],
      metadata: {
        intentType: "UNKNOWN",
      },
    };
  }

  /**
   * Sleeps for the specified number of milliseconds.
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the sleep duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique ID.
   */
  private generateId(): string {
    return randomUUID();
  }

  /**
   * Detect if query is simple enough for fast-path processing (no complex reasoning needed).
   * Uses pattern matching - no LLM call required.
   */
  private isSimpleQuery(text: string): boolean {
    const lowerText = text.toLowerCase().trim();

    // Simple question patterns
    const simplePatterns = [
      /^what is\s+\w+\??$/i, // "What is X?"
      /^what are\s+\w+\??$/i, // "What are X?"
      /^define\s+\w+$/i, // "Define X"
      /^who is\s+[\w\s]+\??$/i, // "Who is X?"
      /^when is\s+[\w\s]+\??$/i, // "When is X?"
      /^where is\s+[\w\s]+\??$/i, // "Where is X?"
      /^how do you\s+[\w\s]{1,30}\??$/i, // "How do you X?" (short)
      /^explain\s+\w+\s+briefly$/i, // "Explain X briefly"
      /^tell me about\s+\w+$/i, // "Tell me about X"
    ];

    // Check patterns
    if (simplePatterns.some((pattern) => pattern.test(lowerText))) {
      // Additional checks: must be short (< 50 chars), single sentence
      if (text.length < 50 && !text.includes(".") && !text.includes(";")) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract topic from simple query using regex.
   */
  private extractSimpleQueryTopic(text: string): string {
    const patterns = [
      { regex: /what is\s+(\w+)/i, group: 1 },
      { regex: /what are\s+([\w\s]+)/i, group: 1 },
      { regex: /define\s+(\w+)/i, group: 1 },
      { regex: /who is\s+([\w\s]+)/i, group: 1 },
      { regex: /explain\s+([\w\s]+)/i, group: 1 },
      { regex: /tell me about\s+([\w\s]+)/i, group: 1 },
    ];

    for (const { regex, group } of patterns) {
      const match = text.match(regex);
      if (match?.[group]) {
        return match[group].trim();
      }
    }

    return text; // Fallback
  }

  /**
   * Generate cache key from user input.
   */
  private getCacheKey(input: UserInput): string {
    // Normalize text (lowercase, trim, remove extra spaces)
    const normalizedText = input.text.toLowerCase().trim().replace(/\s+/g, " ");

    // Include userId and hour-based timestamp for personalized cache
    const hourTimestamp = Math.floor(Date.now() / this.CACHE_TTL_MS);

    return `${input.userId}:${normalizedText}:${hourTimestamp}`;
  }

  /**
   * Check cache for existing response.
   */
  private getCachedResponse(input: UserInput): JarvisResponse | null {
    const key = this.getCacheKey(input);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      this.logger.info("✓ Cache hit - returning cached response");
      return {
        ...cached.response,
        timestamp: new Date(), // Update timestamp
        metadata: {
          ...cached.response.metadata,
          cached: true,
          cacheAge: Date.now() - cached.timestamp,
        },
      };
    }

    if (cached) {
      this.cache.delete(key); // Remove expired
    }

    return null;
  }

  /**
   * Store response in cache.
   * Stores in both in-memory and database cache.
   */
  private async cacheResponse(input: UserInput, response: JarvisResponse): Promise<void> {
    const key = this.getCacheKey(input);

    // Store in memory
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    // Store in database
    if (this.cacheRepo) {
      try {
        await this.cacheRepo.saveQueryCache(key, input.text, response);
      } catch (error) {
        this.logger.warn("Failed to save to database cache:", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info(`✓ Response cached: ${key.substring(0, 50)}...`);
  }

  /**
   * Clear expired cache entries.
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiresAt <= now) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.info(`Cache cleanup: removed ${cleared} expired entries`);
    }
  }

  /**
   * Get cache statistics.
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: track hits/misses
    };
  }

  /**
   * Fast-path processing for simple queries.
   * Single LLM call instead of 3 (goal parsing + reasoning + synthesis).
   * Target: 5-8s instead of 15-20s.
   * Includes conversation context for natural follow-ups.
   */
  private async processSimpleQuery(input: UserInput): Promise<JarvisResponse> {
    const startTime = Date.now();
    const topic = this.extractSimpleQueryTopic(input.text);

    this.logger.info("🚀 Fast-path: Simple query detected");
    this.logger.info(`   Topic: "${topic}"`);

    try {
      // Get conversation context
      const conversationSummary = this.contextManager.getConversationSummary(input.sessionId);

      // Build context-aware prompt
      const prompt =
        conversationSummary !== "No previous conversation."
          ? `You are Jarvis, an AI assistant. Answer this question using conversation context.

${conversationSummary}

New question: "${input.text}"

Provide a clear, accurate answer in 2-4 sentences. Build on previous context if relevant.

Answer:`
          : `You are Jarvis, an AI assistant. Answer this simple question clearly and concisely.

Question: "${input.text}"

Provide a clear, accurate answer in 2-4 sentences. If you need current information, say so.

Answer:`;

      const responseStart = Date.now();
      const answer = await this.llm.complete(prompt, {
        temperature: 0.7,
        maxTokens: 300, // Keep it brief
      });
      const responseDuration = Date.now() - responseStart;

      const totalDuration = Date.now() - startTime;

      this.logger.info(`✓ Fast-path completed in ${totalDuration}ms`);
      this.logger.info(`  LLM response: ${responseDuration}ms`);

      // Check if answer indicates need for live data
      const needsLiveData = /I don't have|I cannot|would need to|current information/i.test(answer);

      if (needsLiveData) {
        this.logger.info("  Answer indicates need for live data - routing to agents");
        // Fall back to full reasoning path
        return this.processComplexQuery(input);
      }

      return {
        text: answer,
        reasoningTraceId: this.generateId(),
        confidence: 0.85, // High confidence for simple queries
        agentsUsed: ["LLM-FastPath"],
        timestamp: new Date(),
        metadata: {
          duration: totalDuration,
          timings: {
            total: totalDuration,
            llmCall: responseDuration,
          },
          fastPath: true,
        },
      };
    } catch (_error) {
      this.logger.warn("Fast-path failed, falling back to full reasoning");
      return this.processComplexQuery(input);
    }
  }

  /**
   * Build inputs object for agent action.
   */
  private buildInputsForAction(
    action: string,
    inputText: string,
    goal: Goal,
  ): Record<string, unknown> {
    const depth = goal.researchDepth?.toLowerCase() || "medium";

    switch (action) {
      case "search":
        return { query: inputText };
      case "research":
        return { topic: inputText, depth };
      case "factcheck":
        return { claim: inputText };
      case "summarize":
        return { text: inputText };
      case "respond":
        return { message: inputText };
      default:
        return { query: inputText };
    }
  }

  /**
   * Generate simplified reasoning trace for non-critical queries.
   * Uses condensed prompt, fewer tokens, faster generation.
   * Target: 3-5s instead of 12-19s.
   */
  private async generateSimplifiedReasoningTrace(goal: Goal): Promise<ReasoningTrace> {
    const prompt = `You are Jarvis. Quickly plan how to answer this query.

Query: ${goal.primaryObjective}
Domains: ${goal.domains.join(", ")}

Available agents:
- Dialogue: conversation
- Web: search current info
- Knowledge: research, fact-check

Respond in format:
AGENT: [name]
ACTION: [action]
INPUT: [key parameter]
CONFIDENCE: [0.0-1.0]

Plan:`;

    const llmResponse = await this.llm.complete(prompt, {
      temperature: 0.3,
      maxTokens: 300, // Much smaller than 4096
    });

    // Parse simplified response
    const agentMatch = llmResponse.match(/AGENT:\s*(\w+)/i);
    const actionMatch = llmResponse.match(/ACTION:\s*(\w+)/i);
    const inputMatch = llmResponse.match(/INPUT:\s*(.+?)(?:\n|$)/i);
    const confidenceMatch = llmResponse.match(/CONFIDENCE:\s*([\d.]+)/i);

    const agentId = agentMatch ? agentMatch[1] : "Knowledge";
    const action = actionMatch ? actionMatch[1].toLowerCase() : "research";
    const inputText = inputMatch ? inputMatch[1].trim() : goal.primaryObjective;
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;

    // Build simplified trace
    const step: import("../types/agent").PlanStep = {
      id: this.generateId(),
      agentId,
      action,
      inputs: this.buildInputsForAction(action, inputText, goal),
    };

    const trace: ReasoningTrace = {
      id: this.generateId(),
      goal,
      reasoningSteps: [
        {
          stepNumber: 1,
          type: "ANALYSIS",
          content: `Query requires ${agentId} agent`,
          confidence: 0.8,
          justification: "Pattern-based routing",
        },
        {
          stepNumber: 2,
          type: "PLANNING",
          content: `Execute ${agentId}.${action}("${inputText}")`,
          confidence,
          justification: "Direct agent call",
        },
      ],
      plan: {
        id: this.generateId(),
        steps: [step],
        dependencies: new Map(),
        parallelizable: [[step.id]],
        canRunInParallel: [[step.id]],
        estimatedDuration: 15000,
      },
      timestamp: new Date(),
      confidence,
    };

    return trace;
  }
}
