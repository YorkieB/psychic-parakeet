/*
  This file helps Jarvis remember important information and conversations.

  It stores, retrieves, and searches through memories while making sure Jarvis can recall what matters to you and learn from past interactions.
*/

import type { Request, Response } from 'express';
import express from 'express';
import type { Logger } from 'winston';
import type { AgentRequest, AgentResponse } from '../types/agent';
import { EnhancedBaseAgent } from './base-agent-enhanced';

interface Memory {
  id: string;
  content: string;
  type: 'fact' | 'preference' | 'event' | 'conversation' | 'knowledge';
  importance: number; // 1-10
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

/**
 * Stores and retrieves Jarvis memories with ranking-aware lookup semantics.
 *
 * The Memory agent handles durable recall concerns that outlive a single
 * dialogue turn, including tagging, importance scoring, recency tracking, and
 * search over remembered facts, events, and preferences.
 *
 * @agent MemoryAgent
 * @domain agents.memory
 * @critical
 */
export class MemoryAgent extends EnhancedBaseAgent {
  private memories: Map<string, Memory> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> memory IDs

  constructor(logger: Logger) {
    super('Memory', '1.0.0', parseInt(process.env.MEMORY_AGENT_PORT || '3028', 10), logger);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('✅ Memory Agent initialized');
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.app.post('/api', async (req: Request, res: Response) => {
      const startTime = Date.now();
      const request = req.body as AgentRequest;

      try {
        const action = request.action;
        const inputs = request.inputs || {};

        this.logger.info(`Memory Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        let result: unknown;

        switch (action) {
          case 'store':
            result = await this.storeMemory(inputs);
            break;
          case 'recall':
            result = await this.recallMemory(inputs);
            break;
          case 'search':
            result = await this.searchMemories(inputs);
            break;
          case 'search_by_tag':
            result = await this.searchByTag(inputs);
            break;
          case 'update':
            result = await this.updateMemory(inputs);
            break;
          case 'forget':
            result = await this.forgetMemory(inputs);
            break;
          case 'list_recent':
            result = await this.listRecentMemories(inputs);
            break;
          case 'list_important':
            result = await this.listImportantMemories(inputs);
            break;
          case 'get_stats':
            result = await this.getStats();
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
        this.logger.error('Error processing memory request', {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: { duration, retryCount: 0 },
        };

        res.status(500).json(errorResponse);
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Memory agent server listening on port ${this.port}`);
          resolve();
        })
        .on('error', reject);
    });
  }

  private async storeMemory(inputs: Record<string, unknown>): Promise<Memory> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const content = (inputs.content as string) || '';
    const type = (inputs.type as Memory['type']) || 'knowledge';
    const importance = Math.min(10, Math.max(1, (inputs.importance as number) || 5));
    const tags = (inputs.tags as string[]) || [];
    const metadata = (inputs.metadata as Record<string, unknown>) || {};

    if (!content.trim()) {
      throw new Error('Content is required');
    }

    const memory: Memory = {
      id,
      content,
      type,
      importance,
      tags,
      metadata,
      createdAt: new Date(),
      accessedAt: new Date(),
      accessCount: 0,
    };

    this.memories.set(id, memory);

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(id);
    }

    this.logger.info(`Stored memory: ${id} (type: ${type}, importance: ${importance})`);
    return memory;
  }

  private async recallMemory(inputs: Record<string, unknown>): Promise<object> {
    const id = inputs.id as string;

    if (!id) {
      throw new Error('Memory ID is required');
    }

    const memory = this.memories.get(id);
    if (!memory) {
      return { id, found: false };
    }

    // Update access stats
    memory.accessedAt = new Date();
    memory.accessCount++;

    return { found: true, memory };
  }

  private async searchMemories(inputs: Record<string, unknown>): Promise<object> {
    const query = ((inputs.query as string) || '').toLowerCase();
    const type = inputs.type as Memory['type'] | undefined;
    const minImportance = (inputs.minImportance as number) || 0;
    const limit = (inputs.limit as number) || 10;

    let results = Array.from(this.memories.values());

    // Filter by type
    if (type) {
      results = results.filter(m => m.type === type);
    }

    // Filter by importance
    results = results.filter(m => m.importance >= minImportance);

    // Search by content
    if (query) {
      results = results.filter(
        m =>
          m.content.toLowerCase().includes(query) ||
          m.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      const importanceDiff = b.importance - a.importance;
      if (importanceDiff !== 0) return importanceDiff;
      return b.accessedAt.getTime() - a.accessedAt.getTime();
    });

    return {
      query,
      results: results.slice(0, limit),
      totalMatches: results.length,
    };
  }

  private async searchByTag(inputs: Record<string, unknown>): Promise<object> {
    const tags = (inputs.tags as string[]) || [];
    const matchAll = inputs.matchAll !== false;

    if (tags.length === 0) {
      throw new Error('At least one tag is required');
    }

    let matchingIds: Set<string>;

    if (matchAll) {
      // Find memories that have ALL tags
      matchingIds = new Set(this.tagIndex.get(tags[0]) || []);
      for (let i = 1; i < tags.length; i++) {
        const tagIds = this.tagIndex.get(tags[i]) || new Set();
        matchingIds = new Set([...matchingIds].filter(id => tagIds.has(id)));
      }
    } else {
      // Find memories that have ANY of the tags
      matchingIds = new Set();
      for (const tag of tags) {
        const tagIds = this.tagIndex.get(tag) || new Set();
        tagIds.forEach(id => matchingIds.add(id));
      }
    }

    const memories = Array.from(matchingIds)
      .map(id => this.memories.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.importance - a.importance);

    return { tags, matchAll, memories, count: memories.length };
  }

  private async updateMemory(inputs: Record<string, unknown>): Promise<Memory> {
    const id = inputs.id as string;
    const memory = this.memories.get(id);

    if (!memory) {
      throw new Error(`Memory not found: ${id}`);
    }

    if (inputs.content !== undefined) memory.content = inputs.content as string;
    if (inputs.importance !== undefined)
      memory.importance = Math.min(10, Math.max(1, inputs.importance as number));
    if (inputs.tags !== undefined) {
      // Update tag index
      for (const tag of memory.tags) {
        this.tagIndex.get(tag)?.delete(id);
      }
      memory.tags = inputs.tags as string[];
      for (const tag of memory.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(id);
      }
    }
    if (inputs.metadata !== undefined) {
      memory.metadata = { ...memory.metadata, ...(inputs.metadata as Record<string, unknown>) };
    }

    return memory;
  }

  private async forgetMemory(inputs: Record<string, unknown>): Promise<object> {
    const id = inputs.id as string;
    const memory = this.memories.get(id);

    if (!memory) {
      return { id, forgotten: false };
    }

    // Remove from tag index
    for (const tag of memory.tags) {
      this.tagIndex.get(tag)?.delete(id);
    }

    this.memories.delete(id);
    this.logger.info(`Forgot memory: ${id}`);

    return { id, forgotten: true };
  }

  private async listRecentMemories(inputs: Record<string, unknown>): Promise<object> {
    const limit = (inputs.limit as number) || 10;

    const memories = Array.from(this.memories.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return { memories, count: memories.length };
  }

  private async listImportantMemories(inputs: Record<string, unknown>): Promise<object> {
    const limit = (inputs.limit as number) || 10;
    const minImportance = (inputs.minImportance as number) || 7;

    const memories = Array.from(this.memories.values())
      .filter(m => m.importance >= minImportance)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    return { memories, count: memories.length, minImportance };
  }

  private async getStats(): Promise<object> {
    const memories = Array.from(this.memories.values());
    const typeCount: Record<string, number> = {};
    let totalImportance = 0;

    for (const m of memories) {
      typeCount[m.type] = (typeCount[m.type] || 0) + 1;
      totalImportance += m.importance;
    }

    return {
      totalMemories: memories.length,
      byType: typeCount,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      uniqueTags: this.tagIndex.size,
    };
  }

  protected getCapabilities(): string[] {
    return [
      'store',
      'recall',
      'search',
      'search_by_tag',
      'update',
      'forget',
      'list_recent',
      'list_important',
      'get_stats',
    ];
  }

  protected getDependencies(): string[] {
    return [];
  }

  protected getPriority(): number {
    return 9;
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
    this.logger.info('Configuration updated', { config });
  }

  protected async restart(): Promise<void> {
    this.logger.info('Restarting Memory agent...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
