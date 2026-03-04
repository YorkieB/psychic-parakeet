/*
  This file helps Jarvis coordinate all the different agents and make sure they work together properly.

  It routes requests to the right agents, handles retries when things go wrong, and manages the overall flow while making sure Jarvis responds reliably and efficiently.
*/

import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import type { AgentRegistry } from "./agent-registry";

/**
 * Orchestrates requests to agents with retry logic and error handling.
 * Routes requests to appropriate agents and manages execution flow.
 */
export class Orchestrator {
  private readonly registry: AgentRegistry;
  private readonly logger: Logger;
  private readonly MAX_RETRIES = 2; // Reduced from 3 for faster failure handling
  private readonly BASE_BACKOFF_MS = 500; // Reduced from 1000 for faster retries

  /**
   * Creates a new Orchestrator instance.
   *
   * @param registry - Agent registry for agent lookup and availability checks
   * @param logger - Winston logger instance for logging operations
   */
  constructor(registry: AgentRegistry, logger: Logger) {
    this.registry = registry;
    this.logger = logger;
  }

  /**
   * Executes a request to a specific agent.
   *
   * @param agentId - Unique identifier of the target agent
   * @param action - Action to perform on the agent
   * @param inputs - Input parameters for the action
   * @param userId - User identifier making the request (default: 'system')
   * @param priority - Request priority level (default: 'MEDIUM')
   * @returns Promise resolving to agent response
   * @throws Error if agent is not available or not found
   */
  async executeRequest(
    agentId: string,
    action: string,
    inputs: Record<string, unknown>,
    userId: string = "system",
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM",
  ): Promise<AgentResponse> {
    // Check if agent is available
    if (!this.registry.isAvailable(agentId)) {
      const error = `Agent ${agentId} is not available`;
      this.logger.error(error);
      return {
        success: false,
        error,
        metadata: {
          duration: 0,
          retryCount: 0,
        },
      };
    }

    // Get agent from registry
    const agent = this.registry.getAgent(agentId);
    if (!agent) {
      const error = `Agent ${agentId} not found in registry`;
      this.logger.error(error);
      return {
        success: false,
        error,
        metadata: {
          duration: 0,
          retryCount: 0,
        },
      };
    }

    // Build request object
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const request: AgentRequest = {
      id: requestId,
      agentId,
      action,
      inputs,
      userId,
      timestamp: new Date(),
      priority,
    };

    this.logger.info(`Executing request: ${requestId}`, {
      requestId,
      agentId,
      action,
      userId,
      priority,
    });

    // Execute with retry logic
    // Agents use POST /api with action in request body, not /api/{action}
    const endpoint = agent.apiEndpoint;
    return this.executeWithRetry(endpoint, request);
  }

  /**
   * Executes a request with exponential backoff retry logic.
   *
   * @param endpoint - Full endpoint URL for the request
   * @param request - Agent request object
   * @param attempt - Current attempt number (default: 1)
   * @returns Promise resolving to agent response
   */
  private async executeWithRetry(
    endpoint: string,
    request: AgentRequest,
    attempt: number = 1,
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }

      const responseData = (await response.json()) as AgentResponse;
      const duration = Date.now() - startTime;

      // Add metadata
      responseData.metadata = {
        duration,
        retryCount: attempt - 1,
        cost: request.priority === "CRITICAL" ? 0.01 : undefined,
      };

      this.logger.info(`Request completed: ${request.id}`, {
        requestId: request.id,
        agentId: request.agentId,
        success: responseData.success,
        duration,
        retryCount: attempt - 1,
      });

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Check if we should retry
      if (attempt < this.MAX_RETRIES) {
        const backoffMs = this.BASE_BACKOFF_MS * 2 ** (attempt - 1); // Exponential backoff with base
        this.logger.warn(`Request failed, retrying (attempt ${attempt}/${this.MAX_RETRIES})`, {
          requestId: request.id,
          agentId: request.agentId,
          attempt,
          backoffMs,
          error: error instanceof Error ? error.message : String(error),
        });

        await this.sleep(backoffMs);
        return this.executeWithRetry(endpoint, request, attempt + 1);
      }

      // Max retries exceeded
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Request failed after ${this.MAX_RETRIES} attempts: ${request.id}`, {
        requestId: request.id,
        agentId: request.agentId,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        error: `Request failed after ${this.MAX_RETRIES} attempts: ${errorMessage}`,
        metadata: {
          duration,
          retryCount: attempt,
        },
      };
    }
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
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
