import type { AIAssessmentEngine } from "../ai-engine/ai-assessment-engine.js";
import type { ClaudeProvider } from "../ai-engine/claude-provider.js";
import type { GPTProvider } from "../ai-engine/gpt-provider.js";
import type { AIAssessmentRequest } from "../ai-engine/types.js";
import { COT_PROTOCOL } from "./cot-protocol.js";
import { DebateEngine } from "./debate-engine.js";
import type { DebateEngineConfig, DebateRequest, DebateResult } from "./debate-types.js";
import { FallacyDetector } from "./fallacy-detector.js";
import { KnowledgeSources } from "./knowledge-sources.js";
import { RAGVerifier } from "./rag-verifier.js";
import { SelfConsistency } from "./self-consistency.js";
import type {
  COTEngineConfig,
  MADTaskRequest,
  ThinkingTask,
  ThinkingTaskListener,
} from "./types.js";

/**
 * COT Engine - Asynchronous Background Thinking Module
 * Handles deep logic analysis and Multi-Agent Debate without blocking the main Jarvis flow
 */
export class COTEngine {
  private readonly tasks: Map<string, ThinkingTask> = new Map();
  private readonly listeners: ThinkingTaskListener[] = [];
  private readonly aiEngine: AIAssessmentEngine;
  private readonly config: COTEngineConfig;
  private readonly debateEngine?: DebateEngine;
  private readonly fallacyDetector?: FallacyDetector;
  private readonly ragVerifier?: RAGVerifier;
  private readonly selfConsistency?: SelfConsistency;

  constructor(
    aiEngine: AIAssessmentEngine,
    config: COTEngineConfig,
    claudeProvider?: ClaudeProvider,
    gptProvider?: GPTProvider,
    debateEngineConfig?: DebateEngineConfig,
  ) {
    this.aiEngine = aiEngine;
    this.config = config;

    // Always initialize analysis helpers so fallacy detection is available
    const knowledgeSources = new KnowledgeSources();
    this.fallacyDetector = new FallacyDetector();
    this.ragVerifier = new RAGVerifier(knowledgeSources);
    this.selfConsistency = new SelfConsistency();

    // Initialize MAD framework components if providers and config are available
    if (claudeProvider && gptProvider && debateEngineConfig) {
      this.debateEngine = new DebateEngine(
        debateEngineConfig,
        claudeProvider,
        gptProvider,
        this.fallacyDetector,
        this.ragVerifier,
        this.selfConsistency,
      );
    }
  }

  /**
   * Start a new background thinking task
   */
  public async startTask(
    sourceUrl: string,
    sourceContent: string,
    sourceAnalysis: any,
    instructionPayload: any,
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const task: ThinkingTask = {
      id: taskId,
      status: "pending",
      startTime: new Date(),
      progress: 0,
      request: {
        sourceUrl,
        sourceContent,
        sourceAnalysis,
        instructionPayload,
      },
    };

    this.tasks.set(taskId, task);
    this.notifyStarted(task);

    // Trigger background processing (do not await)
    this.processTask(taskId).catch((err) => {
      console.error(`Background task ${taskId} failed:`, err);
    });

    return taskId;
  }

  /**
   * Start a Multi-Agent Debate (MAD) task
   */
  public async startMADTask(
    claim: string,
    source?: string,
    context?: string,
    options?: {
      maxRounds?: number;
      temperature?: number;
      useRAGVerification?: boolean;
      useFallacyDetection?: boolean;
      useSelfConsistency?: boolean;
    },
  ): Promise<string> {
    if (!this.debateEngine) {
      throw new Error("MAD framework not initialized - requires Claude and GPT providers");
    }

    const taskId = `mad_task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const task: ThinkingTask = {
      id: taskId,
      status: "pending",
      startTime: new Date(),
      progress: 0,
      request: {
        claim,
        source,
        context,
        options,
        type: "mad", // Mark as MAD task
      },
    };

    this.tasks.set(taskId, task);
    this.notifyStarted(task);

    // Trigger MAD processing (do not await)
    this.processMADTask(taskId).catch((err) => {
      console.error(`MAD task ${taskId} failed:`, err);
    });

    return taskId;
  }

  /**
   * Check if MAD framework is available
   */
  public isMADAvailable(): boolean {
    return this.config.enableMAD !== false;
  }

  /**
   * Get the current state of a task
   */
  public getTask(taskId: string): ThinkingTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get MAD debate result from completed task
   */
  public getMADResult(taskId: string): DebateResult | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "completed" || task.request.type !== "mad") {
      return null;
    }
    return task.result as DebateResult;
  }

  /**
   * Get all active tasks
   */
  public getActiveTasks(): ThinkingTask[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.status === "pending" || task.status === "processing",
    );
  }

  /**
   * Get all completed tasks
   */
  public getCompletedTasks(): ThinkingTask[] {
    return Array.from(this.tasks.values()).filter((task) => task.status === "completed");
  }

  /**
   * Cancel a running task
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === "completed" || task.status === "failed") {
      return false;
    }

    task.status = "cancelled";
    task.endTime = new Date();
    task.error = "Task cancelled by user";

    this.notifyFailed(task, "Task cancelled");
    return true;
  }

  /**
   * Clear completed and failed tasks from memory
   */
  public clearCompletedTasks(): number {
    let cleared = 0;
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        this.tasks.delete(taskId);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Get task statistics
   */
  public getTaskStatistics(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    madTasks: number;
    cotTasks: number;
  } {
    const tasks = Array.from(this.tasks.values());

    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      processing: tasks.filter((t) => t.status === "processing").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      cancelled: tasks.filter((t) => t.status === "cancelled").length,
      madTasks: tasks.filter((t) => t.request.type === "mad").length,
      cotTasks: tasks.filter((t) => t.request.type !== "mad").length,
    };
  }

  /**
   * Add a listener for task events
   */
  public addListener(listener: ThinkingTaskListener): void {
    this.listeners.push(listener);
  }

  /**
   * Internal processing loop for background tasks
   */
  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      task.status = "processing";
      task.progress = 10;
      this.notifyProgress(task);

      // Check if this is a MAD task
      if (task.request.type === "mad") {
        return this.processMADTask(taskId);
      }

      // Standard COT processing
      // 1. Prepare the deep-thinking request
      const aiRequest: AIAssessmentRequest = {
        sourceUrl: task.request.sourceUrl,
        sourceContent: task.request.sourceContent,
        sourceAnalysis: task.request.sourceAnalysis,
        instructionPayload: {
          ...task.request.instructionPayload,
          // Inject the COT Protocol into the instructions
          specialNotes: [
            ...(task.request.instructionPayload.specialNotes || []),
            `COT_PROTOCOL_ACTIVE: Follow stages: ${COT_PROTOCOL.stages.map((s) => s.name).join(" -> ")}`,
          ],
          temperature: 0.1, // Low temperature for maximum logic
        },
        priority: "high",
        requireConsensus: this.config.useConsensus,
      };

      task.progress = 30;
      this.notifyProgress(task);

      // 2. Execute deep thinking via AI Engine
      const result = await this.aiEngine.assess(aiRequest);

      // 3. Finalize task
      task.status = "completed";
      task.progress = 100;
      task.endTime = new Date();
      task.result = result;

      this.notifyComplete(task);
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : String(error);
      this.notifyFailed(task, task.error);
    }
  }

  /**
   * Process Multi-Agent Debate task
   */
  private async processMADTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || !this.debateEngine) return;

    // Type guard to ensure this is a MAD task request
    if (task.request.type !== "mad") {
      task.status = "failed";
      task.error = "Invalid task type for MAD processing";
      this.notifyFailed(task, task.error);
      return;
    }

    const madRequest = task.request as MADTaskRequest;

    try {
      task.status = "processing";
      task.progress = 10;
      this.notifyProgress(task);

      // Prepare debate request
      const debateRequest: DebateRequest = {
        claim: madRequest.claim,
        source: madRequest.source,
        context: madRequest.context,
        maxRounds: madRequest.options?.maxRounds || 3,
        temperature: madRequest.options?.temperature || 0.7,
        useRAGVerification: madRequest.options?.useRAGVerification ?? true,
        useFallacyDetection: madRequest.options?.useFallacyDetection ?? true,
        useSelfConsistency: madRequest.options?.useSelfConsistency ?? false,
      };

      task.progress = 20;
      this.notifyProgress(task);

      // Execute Multi-Agent Debate
      const debateResult: DebateResult = await this.debateEngine.executeDebate(debateRequest);

      // Update progress throughout debate (this would be better with real-time updates)
      task.progress = 90;
      this.notifyProgress(task);

      // Finalize task
      task.status = "completed";
      task.progress = 100;
      task.endTime = new Date();
      task.result = debateResult;

      this.notifyComplete(task);
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : String(error);
      this.notifyFailed(task, task.error);
    }
  }

  private notifyStarted(task: ThinkingTask): void {
    this.listeners.forEach((l) => l.onTaskStarted?.(task));
  }

  private notifyProgress(task: ThinkingTask): void {
    this.listeners.forEach((l) => l.onTaskProgress?.(task));
  }

  private notifyComplete(task: ThinkingTask): void {
    this.listeners.forEach((l) => l.onTaskComplete?.(task));
  }

  private notifyFailed(task: ThinkingTask, error: string): void {
    this.listeners.forEach((l) => l.onTaskFailed?.(task, error));
  }
}
