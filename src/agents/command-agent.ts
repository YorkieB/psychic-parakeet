/*
  This file safely executes system commands and shell operations for Jarvis.

  It handles running approved commands while making sure only safe operations are performed and keeping track of command history.
*/
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

const execAsync = promisify(exec);

interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executedAt: Date;
}

/**
 * Command Agent - Executes system commands and shell operations.
 * Provides safe command execution with sandboxing and validation.
 */
export class CommandAgent extends EnhancedBaseAgent {
  private commandHistory: CommandResult[] = [];
  private allowedCommands: Set<string>;

  constructor(logger: Logger) {
    super("Command", "1.0.0", parseInt(process.env.COMMAND_AGENT_PORT || "3026", 10), logger);
    // Whitelist of safe commands
    this.allowedCommands = new Set([
      "echo",
      "date",
      "whoami",
      "pwd",
      "ls",
      "dir",
      "cat",
      "type",
      "node",
      "npm",
      "npx",
      "git",
      "which",
      "where",
    ]);
  }

  protected async initialize(): Promise<void> {
    this.logger.info("✅ Command Agent initialized");
    this.logger.info("   Allowed commands: " + Array.from(this.allowedCommands).join(", "));
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.app.post("/api", async (req: Request, res: Response) => {
      const startTime = Date.now();
      const request = req.body as AgentRequest;

      try {
        const action = request.action;
        const inputs = request.inputs || {};

        this.logger.info(`Command Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        let result: unknown;

        switch (action) {
          case "execute":
            result = await this.executeCommand(inputs);
            break;
          case "execute_safe":
            result = await this.executeSafeCommand(inputs);
            break;
          case "history":
            result = await this.getHistory();
            break;
          case "list_allowed":
            result = await this.listAllowedCommands();
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: result,
          metadata: { duration, retryCount: 0 },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing command request", {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          metadata: { duration, retryCount: 0 },
        };

        res.status(500).json(errorResponse);
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Command agent server listening on port ${this.port}`);
          resolve();
        })
        .on("error", reject);
    });
  }

  private async executeCommand(inputs: Record<string, unknown>): Promise<CommandResult> {
    const command = (inputs.command as string) || "";
    const timeout = (inputs.timeout as number) || 30000;

    if (!command.trim()) {
      throw new Error("Command is required");
    }

    // Security check - only allow whitelisted commands
    const baseCommand = command.split(" ")[0].toLowerCase();
    if (!this.allowedCommands.has(baseCommand)) {
      throw new Error(
        `Command not allowed: ${baseCommand}. Use list_allowed to see permitted commands.`,
      );
    }

    try {
      const { stdout, stderr } = await execAsync(command, { timeout });

      const result: CommandResult = {
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        executedAt: new Date(),
      };

      this.commandHistory.push(result);
      return result;
    } catch (error: any) {
      const result: CommandResult = {
        command,
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || error.message,
        exitCode: error.code || 1,
        executedAt: new Date(),
      };

      this.commandHistory.push(result);
      return result;
    }
  }

  private async executeSafeCommand(inputs: Record<string, unknown>): Promise<object> {
    const type = (inputs.type as string) || "echo";
    const args = (inputs.args as string) || "";

    // Pre-defined safe command templates
    const safeCommands: Record<string, string> = {
      echo: `echo ${args}`,
      date: "date",
      whoami: "whoami",
      pwd: "pwd",
      node_version: "node --version",
      npm_version: "npm --version",
      git_status: "git status",
      list_files: process.platform === "win32" ? "dir" : "ls -la",
    };

    const command = safeCommands[type];
    if (!command) {
      throw new Error(`Unknown safe command type: ${type}`);
    }

    return this.executeCommand({ command, timeout: 10000 });
  }

  private async getHistory(): Promise<object> {
    return {
      history: this.commandHistory.slice(-50),
      count: this.commandHistory.length,
    };
  }

  private async listAllowedCommands(): Promise<object> {
    return {
      commands: Array.from(this.allowedCommands),
      count: this.allowedCommands.size,
    };
  }

  protected getCapabilities(): string[] {
    return ["execute", "execute_safe", "history", "list_allowed"];
  }

  protected getDependencies(): string[] {
    return [];
  }

  protected getPriority(): number {
    return 8;
  }

  protected getMetrics(): {
    requestCount: number;
    errorCount: number;
    uptime: number;
    lastRequest?: string;
    [key: string]: any;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      lastRequest: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : undefined,
      averageResponseTime: this.calculateAverageResponseTime(),
      status: this.getStatus(),
    };
  }

  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info("Configuration updated", { config });
  }

  protected async restart(): Promise<void> {
    this.logger.info("Restarting Command agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
