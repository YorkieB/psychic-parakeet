/*
  This file manages parallel startup of all Jarvis agents for faster boot times.

  It starts agents concurrently while respecting dependencies and port conflicts,
  making the system start up much faster than sequential initialization.
*/

import { EventEmitter } from 'events';
import type { Logger } from 'winston';
import type { BaseAgent } from './agents/base-agent';

export interface AgentConfig {
  id: string;
  name: string;
  agent: BaseAgent;
  port: number;
  dependencies: string[];
  priority: number;
  critical: boolean;
}

export class ParallelAgentStarter extends EventEmitter {
  private agents: Map<string, AgentConfig> = new Map();
  private startedAgents: Set<string> = new Set();
  private failedAgents: Set<string> = new Set();
  private logger: Logger;
  private maxConcurrency: number = 10; // Start up to 10 agents at once

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config);
  }

  async startAll(): Promise<void> {
    this.logger.info(
      `🚀 Starting ${this.agents.size} agents in parallel (max concurrency: ${this.maxConcurrency})`
    );

    const startTime = Date.now();
    const criticalAgents = Array.from(this.agents.values()).filter(a => a.critical);
    const optionalAgents = Array.from(this.agents.values()).filter(a => !a.critical);

    // Start critical agents first
    this.logger.info(`\n📋 Phase 1: Starting ${criticalAgents.length} critical agents`);
    await this.startPhase(criticalAgents);

    // Then start optional agents
    this.logger.info(`\n📋 Phase 2: Starting ${optionalAgents.length} optional agents`);
    await this.startPhase(optionalAgents);

    const duration = Date.now() - startTime;
    const successCount = this.startedAgents.size;
    const failedCount = this.failedAgents.size;

    this.logger.info(`\n✅ Agent startup complete in ${(duration / 1000).toFixed(2)}s`);
    this.logger.info(`   ✓ Success: ${successCount} agents`);
    if (failedCount > 0) {
      this.logger.warn(`   ✗ Failed: ${failedCount} agents`);
    }

    this.emit('complete', {
      successCount,
      failedCount,
      duration,
      startedAgents: Array.from(this.startedAgents),
      failedAgents: Array.from(this.failedAgents),
    });
  }

  private async startPhase(agents: AgentConfig[]): Promise<void> {
    // Sort by priority (higher priority starts first)
    agents.sort((a, b) => b.priority - a.priority);

    const batches: AgentConfig[][] = [];
    const currentBatch: AgentConfig[] = [];

    // Group agents into batches based on dependencies
    for (const agent of agents) {
      if (this.canStartAgent(agent, currentBatch)) {
        currentBatch.push(agent);
      } else {
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
          currentBatch.length = 0;
        }
        currentBatch.push(agent);
      }

      if (currentBatch.length >= this.maxConcurrency) {
        batches.push([...currentBatch]);
        currentBatch.length = 0;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    // Start each batch in parallel
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.info(`\n🔄 Batch ${i + 1}/${batches.length}: Starting ${batch.length} agents`);

      const promises = batch.map(agent => this.startAgent(agent));
      await Promise.allSettled(promises);

      // Small delay between batches to prevent overwhelming the system
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private canStartAgent(agent: AgentConfig, currentBatch: AgentConfig[]): boolean {
    // Check if any agent in the current batch has conflicting dependencies
    for (const other of currentBatch) {
      if (other.id === agent.id) continue;

      // If this agent depends on something in the current batch, it can't start now
      if (agent.dependencies.includes(other.id)) {
        return false;
      }

      // If something in the current batch depends on this agent, it can't start now
      if (other.dependencies.includes(agent.id)) {
        return false;
      }
    }

    return true;
  }

  private async startAgent(config: AgentConfig): Promise<void> {
    const { id, name, agent, port } = config;

    try {
      // Check if already started
      if (this.startedAgents.has(id)) {
        this.logger.debug(`Agent ${name} already started`);
        return;
      }

      // Check dependencies
      for (const dep of config.dependencies) {
        if (!this.startedAgents.has(dep)) {
          this.logger.warn(`Agent ${name} waiting for dependency: ${dep}`);
          // Wait for dependency with timeout
          await this.waitForDependency(dep, 5000);
        }
      }

      this.logger.info(`   Starting ${name} on port ${port}...`);

      // Start the agent with timeout
      await Promise.race([
        agent.start(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)),
      ]);

      this.startedAgents.add(id);
      this.logger.info(`   ✓ ${name} started successfully`);
      this.emit('agentStarted', { id, name, port });
    } catch (error) {
      this.failedAgents.add(id);
      this.logger.error(`   ✗ Failed to start ${name}: ${error.message}`);
      this.emit('agentFailed', { id, name, error });

      if (config.critical) {
        this.logger.error(`Critical agent ${name} failed! System may not function properly.`);
      }
    }
  }

  private async waitForDependency(depId: string, timeout: number): Promise<void> {
    const start = Date.now();

    while (!this.startedAgents.has(depId) && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!this.startedAgents.has(depId)) {
      throw new Error(`Dependency ${depId} not available after ${timeout}ms`);
    }
  }

  getStats(): { started: string[]; failed: string[]; total: number } {
    return {
      started: Array.from(this.startedAgents),
      failed: Array.from(this.failedAgents),
      total: this.agents.size,
    };
  }
}
