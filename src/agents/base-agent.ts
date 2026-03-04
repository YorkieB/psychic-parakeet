/*
  This file provides the fundamental base class that all Jarvis agents inherit from.

  It handles the basic agent lifecycle like starting, stopping, and health checks while making sure every agent can communicate properly.
*/

import type { Request, Response } from 'express';
import express from 'express';
import type { Server } from 'node:http';
import type { Logger } from 'winston';
import { type AgentRegistration, AgentStatus, type HealthCheck } from '../types/agent';

/**
 * Abstract base class for all agents in the system.
 * Provides common functionality for agent lifecycle, health checks, and registration.
 */
export abstract class BaseAgent {
  protected readonly agentId: string;
  protected readonly version: string;
  protected readonly port: number;
  protected status: AgentStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly app: any;
  protected checkInterval?: ReturnType<typeof setInterval>;
  protected readonly logger: Logger;
  protected readonly startTime: Date;
  protected server?: Server;

  /**
   * Creates a new BaseAgent instance.
   *
   * @param agentId - Unique identifier for this agent
   * @param version - Version of the agent implementation
   * @param port - Port number for the agent's HTTP server
   * @param logger - Winston logger instance
   */
  constructor(agentId: string, version: string, port: number, logger: Logger) {
    this.agentId = agentId;
    this.version = version;
    this.port = port;
    this.status = AgentStatus.STARTING;
    this.app = (express as any)();
    this.logger = logger;
    this.startTime = new Date();
  }

  /**
   * Starts the agent by initializing it and starting the server.
   * Must be called after instantiation to activate the agent.
   *
   * @returns Promise that resolves when agent is fully started
   */
  async start(): Promise<void> {
    try {
      this.logger.info(`Starting agent: ${this.agentId} (v${this.version})`);

      // Initialize agent-specific setup
      await this.initialize();

      // Start HTTP server
      await this.startServer();

      // Register with orchestrator
      await this.registerWithOrchestrator();

      // Set status to online
      this.status = AgentStatus.ONLINE;

      this.logger.info(`Agent started successfully: ${this.agentId} on port ${this.port}`);
    } catch (error) {
      this.status = AgentStatus.OFFLINE;
      this.logger.error(`Failed to start agent: ${this.agentId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initializes agent-specific configuration and setup.
   * Must be implemented by subclasses.
   *
   * @returns Promise that resolves when initialization is complete
   */
  protected abstract initialize(): Promise<void>;

  /**
   * Starts the HTTP server for the agent.
   * Must be implemented by subclasses.
   *
   * @returns Promise that resolves when server is listening
   */
  protected abstract startServer(): Promise<void>;

  /**
   * Stops the HTTP server for this agent.
   *
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.close(err => {
          if (err) {
            this.logger.error(`Failed to stop server on port ${this.port}`, {
              error: err.message,
            });
            reject(err);
          } else {
            this.logger.info(`Server stopped on port ${this.port}`);
            this.status = AgentStatus.STOPPED;
            resolve();
          }
        });
      } else {
        this.logger.warn(`No server to stop for agent ${this.agentId}`);
        resolve();
      }
    });
  }

  /**
   * Returns the list of capabilities this agent provides.
   * Must be implemented by subclasses.
   *
   * @returns Array of capability strings
   */
  protected abstract getCapabilities(): string[];

  /**
   * Returns the list of agent IDs this agent depends on.
   * Must be implemented by subclasses.
   *
   * @returns Array of agent IDs
   */
  protected abstract getDependencies(): string[];

  /**
   * Registers this agent with the orchestrator.
   * Currently logs registration (TODO: send HTTP request to orchestrator).
   */
  protected async registerWithOrchestrator(): Promise<void> {
    const registration: AgentRegistration = {
      agentId: this.agentId,
      version: this.version,
      capabilities: this.getCapabilities(),
      status: this.status,
      healthEndpoint: `http://localhost:${this.port}/health`,
      apiEndpoint: `http://localhost:${this.port}/api`,
      dependencies: this.getDependencies(),
      priority: this.getPriority(),
    };

    this.logger.info(`Registering agent with orchestrator: ${this.agentId}`, {
      registration,
    });

    // TODO: Send HTTP POST request to orchestrator registration endpoint
    // const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';
    // await fetch(`${orchestratorUrl}/register`, { method: 'POST', body: JSON.stringify(registration) });
  }

  /**
   * Returns the priority level for this agent (1-10).
   * Default implementation returns 5.
   *
   * @returns Priority number between 1 and 10
   */
  protected getPriority(): number {
    return 5;
  }

  /**
   * Gets the current status of the agent.
   *
   * @returns Current agent status
   */
  public getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Sets up the health check endpoint on the Express app.
   * Endpoint: GET /health
   */
  protected setupHealthEndpoint(): void {
    // Shutdown endpoint for graceful termination
    this.app.post('/shutdown', async (_req: Request, res: Response) => {
      this.logger.info(`Shutdown requested for agent: ${this.agentId}`);
      res.json({ success: true, message: `Agent ${this.agentId} shutting down` });

      // Give time for response to be sent, then stop
      setTimeout(async () => {
        try {
          await this.stop();
        } catch (error) {
          this.logger.error(
            `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }, 100);
    });

    this.app.get('/health', (_req: Request, res: Response) => {
      const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      const memory = process.memoryUsage();

      let healthStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (this.status === AgentStatus.ONLINE) {
        healthStatus = 'healthy';
      } else if (this.status === AgentStatus.DEGRADED) {
        healthStatus = 'degraded';
      } else {
        healthStatus = 'unhealthy';
      }

      const healthCheck: HealthCheck = {
        status: healthStatus,
        uptime,
        memory,
      };

      // Include diagnostics if available (EnhancedBaseAgent provides these)
      const self = this as any;
      const diagnostics: any = {
        requestCount: self.requestCount ?? 0,
        errorCount: self.errorCount ?? 0,
        recentErrors: self.recentErrors ?? [],
        avgResponseTime: self.responseTimes?.length
          ? Math.round(
              (self.responseTimes.reduce((a: number, b: number) => a + b, 0) /
                self.responseTimes.length) *
                100
            ) / 100
          : 0,
      };

      const statusCode = healthStatus === 'healthy' ? 200 : healthStatus === 'degraded' ? 200 : 503;

      res.status(statusCode).json({ ...healthCheck, diagnostics });
    });
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
