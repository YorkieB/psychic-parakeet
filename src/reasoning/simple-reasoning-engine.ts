import { randomUUID } from "node:crypto";
import type { Logger } from "winston";
import type { VertexLLMClient } from "../llm";
import type { Orchestrator } from "../orchestrator/orchestrator";
import type {
  AgentOutput,
  AgentResponse,
  ExecutionPlan,
  FactCheckResult,
  Intent,
  JarvisResponse,
  PlanStep,
  ReasoningTrace,
  ResearchResult,
  SearchResponse,
  Summary,
  UserInput,
} from "../types/agent";

/**
 * Simple Reasoning Engine that provides intent detection, plan creation,
 * and response synthesis. Uses rule-based keyword matching for intent detection
 * (no LLM required). Provides intelligent routing to appropriate agents based
 * on user intent.
 *
 * This is a simplified version that will be enhanced with LLM-powered reasoning
 * in future iterations.
 */
export class SimpleReasoningEngine {
  private readonly orchestrator: Orchestrator;
  private readonly logger: Logger;
  private readonly llm?: VertexLLMClient;

  /**
   * Creates a new SimpleReasoningEngine instance.
   *
   * @param orchestrator - Orchestrator instance for executing agent requests
   * @param logger - Winston logger instance for logging operations
   * @param llm - Optional Vertex AI client for LLM-powered intent detection and response synthesis
   */
  constructor(orchestrator: Orchestrator, logger: Logger, llm?: VertexLLMClient) {
    this.orchestrator = orchestrator;
    this.logger = logger;
    this.llm = llm;

    if (llm) {
      this.logger.info("Reasoning Engine initialized with LLM support");
    } else {
      this.logger.info("Reasoning Engine initialized with keyword-based fallback");
    }
  }

  /**
   * Processes user input through the complete reasoning pipeline:
   * 1. Intent detection
   * 2. Plan creation
   * 3. Plan execution
   * 4. Response synthesis
   *
   * @param input - User input to process
   * @returns Promise resolving to Jarvis response
   */
  async processInput(input: UserInput): Promise<JarvisResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    this.logger.info(`Processing user input: "${input.text}"`, {
      traceId,
      userId: input.userId,
      sessionId: input.sessionId,
    });

    try {
      // Step 1: Detect intent
      const intent = await this.detectIntent(input.text);
      this.logger.debug("Intent detected", {
        traceId,
        intentType: intent.type,
        confidence: intent.confidence,
        suggestedAgent: intent.suggestedAgent,
      });

      // Step 2: Create execution plan
      const plan = this.createPlan(intent);
      this.logger.debug("Plan created", {
        traceId,
        planId: plan.id,
        stepCount: plan.steps.length,
        estimatedDuration: plan.estimatedDuration,
      });

      // Step 3: Execute plan
      const agentOutputs = await this.executePlan(plan);
      this.logger.debug("Plan executed", {
        traceId,
        stepsCompleted: agentOutputs.length,
        successfulSteps: agentOutputs.filter((o) => o.success).length,
      });

      // Step 4: Synthesize response
      const responseText = await this.synthesizeResponse(intent, agentOutputs);
      const duration = Date.now() - startTime;

      // Build reasoning trace (for audit trail - in future, store in database)
      const trace: ReasoningTrace = {
        id: traceId,
        userInput: input,
        detectedIntent: intent,
        plan,
        agentOutputs,
        finalResponse: responseText,
        confidence: intent.confidence,
        timestamp: new Date(),
        duration,
      };

      // Log trace for audit (in future, store in database)
      this.logger.info("Reasoning trace completed", {
        traceId: trace.id,
        intentType: trace.detectedIntent.type,
        confidence: trace.confidence,
        agentsUsed: trace.agentOutputs.map((o) => o.agentId),
        duration: trace.duration,
      });

      // Build and return response
      const response: JarvisResponse = {
        text: responseText,
        reasoningTraceId: traceId,
        confidence: intent.confidence,
        agentsUsed: Array.from(new Set(agentOutputs.map((o) => o.agentId))),
        timestamp: new Date(),
        metadata: {
          intentType: intent.type,
          planSteps: plan.steps.length,
          totalDuration: duration,
        },
      };

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error("Error processing user input", {
        traceId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      // Return error response
      return {
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        reasoningTraceId: traceId,
        confidence: 0.0,
        agentsUsed: [],
        timestamp: new Date(),
        metadata: {
          intentType: "UNKNOWN",
          planSteps: 0,
          totalDuration: duration,
        },
      };
    }
  }

  /**
   * Detects user intent from text using LLM (if available) or keyword-based pattern matching.
   * LLM-based detection is more accurate and understands context. Falls back to keyword
   * matching if LLM is unavailable or fails.
   *
   * @param text - User input text
   * @returns Detected intent with confidence score and entities
   */
  private async detectIntent(text: string): Promise<Intent> {
    // Try LLM-based detection first (if available)
    if (this.llm) {
      try {
        const result = await (this.llm as any).detectIntent(text);
        this.logger.info(
          `LLM Intent Detection: ${result.intent} (confidence: ${result.confidence})`,
          {
            intent: result.intent,
            confidence: result.confidence,
            suggestedAgent: result.suggestedAgent,
            entities: result.entities,
            reasoning: result.reasoning,
          },
        );

        return {
          type: result.intent,
          confidence: result.confidence,
          entities: result.entities,
          suggestedAgent: result.suggestedAgent,
          requiresMultiAgent: false,
        };
      } catch (error) {
        this.logger.warn("LLM intent detection failed, falling back to keyword matching", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall through to keyword matching
      }
    }

    // Fallback to keyword-based detection
    const lowerText = text.toLowerCase().trim();
    const entities: Record<string, string> = {};
    let intentType: Intent["type"] = "UNKNOWN";
    let confidence = 0.3;
    let suggestedAgent = "Dialogue";
    const requiresMultiAgent = false;

    // GREETING intent
    const greetingPatterns = [
      "hello",
      "hi",
      "hey",
      "greetings",
      "good morning",
      "good afternoon",
      "good evening",
    ];
    if (greetingPatterns.some((pattern) => lowerText.includes(pattern))) {
      intentType = "GREETING";
      confidence = 0.9;
      suggestedAgent = "Dialogue";
    }
    // RESEARCH intent (check before SEARCH since "research" contains "search")
    else if (
      lowerText.includes("research") ||
      lowerText.includes("investigate") ||
      lowerText.includes("learn about") ||
      lowerText.includes("tell me about")
    ) {
      intentType = "RESEARCH";
      confidence = 0.9;
      suggestedAgent = "Knowledge";

      // Extract topic
      const researchKeywords = ["research", "investigate", "learn about", "tell me about"];
      for (const keyword of researchKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          const topic = text.substring(index + keyword.length).trim();
          if (topic) {
            entities.topic = topic;
            break;
          }
        }
      }
      if (!entities.topic) {
        const words = text.split(/\s+/);
        if (words.length > 1) {
          entities.topic = words.slice(1).join(" ");
        }
      }
    }
    // SEARCH intent
    else if (
      lowerText.includes("search") ||
      lowerText.includes("find") ||
      lowerText.includes("look up") ||
      lowerText.includes("google")
    ) {
      intentType = "SEARCH";
      confidence = 0.9;
      suggestedAgent = "Web";

      // Extract query
      const searchKeywords = ["search for", "search", "find", "look up", "google"];
      for (const keyword of searchKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          const query = text.substring(index + keyword.length).trim();
          if (query) {
            entities.query = query;
            break;
          }
        }
      }
      if (!entities.query) {
        // Fallback: use entire text after first word
        const words = text.split(/\s+/);
        if (words.length > 1) {
          entities.query = words.slice(1).join(" ");
        }
      }
    }
    // FACT_CHECK intent
    else if (
      lowerText.includes("fact check") ||
      lowerText.includes("verify") ||
      lowerText.includes("is it true") ||
      lowerText.includes("confirm")
    ) {
      intentType = "FACT_CHECK";
      confidence = 0.8;
      suggestedAgent = "Knowledge";

      // Extract claim
      const factCheckKeywords = ["fact check", "verify", "is it true that", "confirm that"];
      for (const keyword of factCheckKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          const claim = text.substring(index + keyword.length).trim();
          if (claim) {
            entities.claim = claim;
            break;
          }
        }
      }
      // Handle "is it true" pattern
      if (!entities.claim && lowerText.includes("is it true")) {
        const match = text.match(/is it true\s+(.+)/i);
        if (match) {
          entities.claim = match[1].trim();
        }
      }
      if (!entities.claim) {
        const words = text.split(/\s+/);
        if (words.length > 2) {
          entities.claim = words.slice(2).join(" ");
        }
      }
    }
    // SUMMARIZE intent
    else if (
      lowerText.includes("summarize") ||
      lowerText.includes("summary") ||
      lowerText.includes("brief me on") ||
      lowerText.includes("overview")
    ) {
      intentType = "SUMMARIZE";
      confidence = 0.8;
      suggestedAgent = "Knowledge";

      // Extract query
      const summarizeKeywords = ["summarize", "summary of", "brief me on", "overview of"];
      for (const keyword of summarizeKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          const query = text.substring(index + keyword.length).trim();
          if (query) {
            entities.query = query;
            break;
          }
        }
      }
      if (!entities.query) {
        const words = text.split(/\s+/);
        if (words.length > 1) {
          entities.query = words.slice(1).join(" ");
        }
      }
    }
    // CONVERSATION intent (fallback for questions)
    else if (
      ["what", "why", "how", "when", "who", "where", "which"].some((word) =>
        lowerText.startsWith(word),
      )
    ) {
      intentType = "CONVERSATION";
      confidence = 0.6;
      suggestedAgent = "Dialogue";
    }

    return {
      type: intentType,
      confidence,
      entities,
      suggestedAgent,
      requiresMultiAgent,
    };
  }

  /**
   * Creates an execution plan based on the detected intent.
   * Plans can be single-step or multi-step depending on intent complexity.
   *
   * @param intent - Detected user intent
   * @returns Execution plan with steps and parallelization hints
   */
  private createPlan(intent: Intent): ExecutionPlan {
    const planId = this.generateTraceId();
    const steps: PlanStep[] = [];
    const canRunInParallel: string[][] = [];

    switch (intent.type) {
      case "GREETING": {
        const stepId = this.generateTraceId();
        steps.push({
          id: stepId,
          agentId: "Dialogue",
          action: "respond",
          inputs: {
            message: intent.entities.message || "Hello! How can I help you?",
          },
        });
        canRunInParallel.push([stepId]);
        break;
      }

      case "SEARCH": {
        const stepId = this.generateTraceId();
        steps.push({
          id: stepId,
          agentId: "Web",
          action: "search",
          inputs: {
            query: intent.entities.query || "",
            maxResults: 10,
          },
        });
        canRunInParallel.push([stepId]);
        break;
      }

      case "RESEARCH": {
        const stepId = this.generateTraceId();
        const topic = intent.entities.topic || "";
        // Determine depth based on topic complexity
        const depth = topic.includes(" and ") || topic.split(/\s+/).length > 5 ? "medium" : "quick";

        steps.push({
          id: stepId,
          agentId: "Knowledge",
          action: "research",
          inputs: {
            topic,
            depth,
          },
        });
        canRunInParallel.push([stepId]);
        break;
      }

      case "FACT_CHECK": {
        const stepId = this.generateTraceId();
        steps.push({
          id: stepId,
          agentId: "Knowledge",
          action: "fact-check",
          inputs: {
            claim: intent.entities.claim || "",
            sources: 3,
          },
        });
        canRunInParallel.push([stepId]);
        break;
      }

      case "SUMMARIZE": {
        const stepId = this.generateTraceId();
        steps.push({
          id: stepId,
          agentId: "Knowledge",
          action: "summarize",
          inputs: {
            query: intent.entities.query || "",
            maxSources: 5,
          },
        });
        canRunInParallel.push([stepId]);
        break;
      }

      case "CONVERSATION": {
        const stepId = this.generateTraceId();
        steps.push({
          id: stepId,
          agentId: "Dialogue",
          action: "respond",
          inputs: {
            message: intent.entities.message || "",
          },
        });
        canRunInParallel.push([stepId]);
        break;
      }
      default: {
        // Fallback to conversation
        const stepId = this.generateTraceId();
        steps.push({
          id: stepId,
          agentId: "Dialogue",
          action: "respond",
          inputs: {
            message: intent.entities.message || "",
          },
        });
        canRunInParallel.push([stepId]);
        break;
      }
    }

    // Calculate estimated duration (500ms baseline per step)
    const estimatedDuration = steps.length * 500;

    return {
      id: planId,
      steps,
      canRunInParallel,
      estimatedDuration,
    };
  }

  /**
   * Executes an execution plan by running each step through the orchestrator.
   * Handles dependencies and parallel execution where possible.
   *
   * @param plan - Execution plan to execute
   * @returns Array of agent outputs from each step
   */
  private async executePlan(plan: ExecutionPlan): Promise<AgentOutput[]> {
    const outputs: AgentOutput[] = [];

    for (const step of plan.steps) {
      this.logger.debug(`Executing step ${step.id}: ${step.agentId}.${step.action}`, {
        stepId: step.id,
        agentId: step.agentId,
        action: step.action,
      });

      const startTime = Date.now();

      try {
        const response: AgentResponse = await this.orchestrator.executeRequest(
          step.agentId,
          step.action,
          step.inputs,
          "reasoning-engine",
          "HIGH",
        );

        const duration = Date.now() - startTime;

        outputs.push({
          stepId: step.id,
          agentId: step.agentId,
          success: response.success,
          data: response.data,
          error: response.error,
          duration,
        });

        if (!response.success) {
          this.logger.warn(`Step ${step.id} failed`, {
            stepId: step.id,
            agentId: step.agentId,
            error: response.error,
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(`Error executing step ${step.id}`, {
          stepId: step.id,
          agentId: step.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        outputs.push({
          stepId: step.id,
          agentId: step.agentId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          duration,
        });
      }
    }

    return outputs;
  }

  /**
   * Synthesizes a human-readable response from agent outputs based on intent type.
   * Uses LLM for natural synthesis if available, otherwise falls back to template-based formatting.
   *
   * @param intent - Detected intent
   * @param outputs - Agent outputs from plan execution
   * @returns Formatted response text
   */
  private async synthesizeResponse(intent: Intent, outputs: AgentOutput[]): Promise<string> {
    // If no successful outputs, return error message
    const successfulOutputs = outputs.filter((o) => o.success);
    if (successfulOutputs.length === 0) {
      return "I'm sorry, I couldn't complete that request. Please try again or rephrase your question.";
    }

    // Try LLM-based synthesis first (if available)
    if (this.llm && successfulOutputs.length > 0) {
      try {
        const synthesized = await (this.llm as any).synthesizeResponse(
          intent.type,
          successfulOutputs,
        );
        this.logger.debug("Response synthesized via LLM", {
          intentType: intent.type,
          responseLength: synthesized.length,
        });
        return synthesized;
      } catch (error) {
        this.logger.warn("LLM synthesis failed, falling back to template-based", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall through to template-based logic
      }
    }

    // Fallback to template-based synthesis
    // Get the first successful output (for single-step plans)
    const output = successfulOutputs[0];
    if (!output.data) {
      return "I received a response, but it was empty. Please try again.";
    }

    switch (intent.type) {
      case "GREETING": {
        // Return dialogue response directly
        const dialogueData = output.data as { response?: string; message?: string };
        return dialogueData.response || dialogueData.message || "Hello! How can I help you today?";
      }

      case "SEARCH": {
        const searchData = output.data as SearchResponse;
        if (!searchData || !searchData.results || searchData.results.length === 0) {
          return `I couldn't find any results for "${intent.entities.query || "your search"}".`;
        }

        let response = `I found ${searchData.resultCount} result${searchData.resultCount !== 1 ? "s" : ""} for "${searchData.query}":\n\n`;

        // Show top 3 results
        const topResults = searchData.results.slice(0, 3);
        topResults.forEach((result, index) => {
          response += `${index + 1}. ${result.title}\n`;
          response += `   ${result.url}\n`;
          response += `   ${result.snippet.substring(0, 100)}${result.snippet.length > 100 ? "..." : ""}\n\n`;
        });

        return response.trim();
      }

      case "RESEARCH": {
        const researchData = output.data as ResearchResult;
        if (!researchData) {
          return `I couldn't find information about "${intent.entities.topic || "that topic"}".`;
        }

        let response = `Here's what I found about "${researchData.topic}":\n\n`;
        response += `${researchData.summary}\n\n`;

        if (researchData.keyPoints && researchData.keyPoints.length > 0) {
          response += `Key points:\n`;
          researchData.keyPoints.slice(0, 5).forEach((point, index) => {
            response += `${index + 1}. ${point}\n`;
          });
        }

        response += `\n\nBased on ${researchData.sources.length} source${researchData.sources.length !== 1 ? "s" : ""} (confidence: ${(researchData.confidence * 100).toFixed(0)}%).`;

        return response;
      }

      case "FACT_CHECK": {
        const factCheckData = output.data as FactCheckResult;
        if (!factCheckData) {
          return `I couldn't verify the claim "${intent.entities.claim || "that"}".`;
        }

        let response = `Fact check result: ${factCheckData.verdict} (confidence: ${(factCheckData.confidence * 100).toFixed(0)}%)\n\n`;
        response += `${factCheckData.explanation}\n\n`;

        if (factCheckData.confirmingSources.length > 0) {
          response += `Supporting sources: ${factCheckData.confirmingSources.length}\n`;
        }
        if (factCheckData.contradictingSources.length > 0) {
          response += `Contradicting sources: ${factCheckData.contradictingSources.length}\n`;
        }

        return response.trim();
      }

      case "SUMMARIZE": {
        const summaryData = output.data as Summary;
        if (!summaryData) {
          return `I couldn't create a summary for "${intent.entities.query || "that"}".`;
        }

        let response = `Summary:\n\n${summaryData.summary}\n\n`;
        response += `Based on ${summaryData.sources.length} source${summaryData.sources.length !== 1 ? "s" : ""} (${summaryData.wordCount} words).`;

        return response;
      }

      case "CONVERSATION": {
        const dialogueData = output.data as { response?: string; message?: string };
        return (
          dialogueData.response ||
          dialogueData.message ||
          "I understand your question, but I need more context to provide a helpful answer."
        );
      }
      default: {
        const dialogueData = output.data as { response?: string; message?: string };
        return (
          dialogueData.response ||
          dialogueData.message ||
          "I'm not sure how to help with that. Could you rephrase your request?"
        );
      }
    }
  }

  /**
   * Generates a unique trace ID for reasoning traces.
   *
   * @returns Unique identifier string
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${randomUUID().substring(0, 8)}`;
  }
}
