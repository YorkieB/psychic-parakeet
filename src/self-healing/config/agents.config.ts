/**
 * Agent spawn configuration
 * Defines spawn strategies, limits, and dependencies for all 29 agents
 */

import express from "express";
import { AppleMusicAgent } from "../../agents/apple-music-agent";
import { BaseAgent } from "../../agents/base-agent";
import { CalendarAgent } from "../../agents/calendar-agent";
import { CodeAgent } from "../../agents/code-agent";
import { DialogueAgent } from "../../agents/dialogue-agent";
import { EmailAgent } from "../../agents/email-agent";
import { EmotionsEngineAgent } from "../../agents/emotions-engine-agent";
import { FinanceAgent } from "../../agents/finance-agent";
import { ImageAgent } from "../../agents/image-agent";
import { KnowledgeAgent } from "../../agents/knowledge-agent";
import { MemorySystemAgent } from "../../agents/memory-system-agent";
import { MusicAgent } from "../../agents/music-agent";
import { ReliabilityAgent } from "../../agents/reliability-agent";
import { SpotifyAgent } from "../../agents/spotify-agent";
import { VideoAgent } from "../../agents/video-agent";
import { VisualEngineAgent } from "../../agents/visual-engine-agent";
import { VoiceAgent } from "../../agents/voice-agent";
import { WebAgent } from "../../agents/web-agent";
import type { SpawnConfig } from "../types/spawn.types";

/**
 * Placeholder agent class for agents not yet implemented
 * This allows the spawner to register configurations for future agents
 */
class PlaceholderAgent extends BaseAgent {
  protected async initialize(): Promise<void> {
    this.logger.warn(`${this.agentId} is a placeholder - agent not yet implemented`);
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    return new Promise<void>((resolve) => {
      this.app.listen(this.port, () => {
        this.logger.info(`Placeholder agent ${this.agentId} listening on port ${this.port}`);
        resolve();
      });
    });
  }

  protected getCapabilities(): string[] {
    return ["placeholder"];
  }

  protected getDependencies(): string[] {
    return [];
  }
}

/**
 * Agent spawn configurations for all 29 agents
 * Maps agent names to their spawn configurations
 */
export const AGENT_SPAWN_CONFIG: Record<string, SpawnConfig> = {
  // ========== CRITICAL AGENTS (5) - Spawn immediately on startup ==========
  ConversationAgent: {
    agentName: "ConversationAgent",
    agentClass: DialogueAgent as any,
    maxRestarts: 5,
    restartDelay: 0,
    healthCheckInterval: 15000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "pre-spawn",
    criticalAgent: true,
    sourceFile: "src/agents/dialogue-agent.ts",
  },

  CommandAgent: {
    agentName: "CommandAgent",
    agentClass: WebAgent as any,
    maxRestarts: 5,
    restartDelay: 0,
    healthCheckInterval: 15000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "pre-spawn",
    criticalAgent: true,
    sourceFile: "src/agents/command-agent.ts",
  },

  ContextAgent: {
    agentName: "ContextAgent",
    agentClass: KnowledgeAgent as any,
    maxRestarts: 5,
    restartDelay: 0,
    healthCheckInterval: 15000,
    spawnTimeout: 10000,
    dependencies: ["CommandAgent"],
    spawnStrategy: "pre-spawn",
    criticalAgent: true,
    sourceFile: "src/agents/context-agent.ts",
  },

  MemoryAgent: {
    agentName: "MemoryAgent",
    agentClass: KnowledgeAgent as any,
    maxRestarts: 5,
    restartDelay: 0,
    healthCheckInterval: 15000,
    spawnTimeout: 10000,
    dependencies: ["ContextAgent"],
    spawnStrategy: "pre-spawn",
    criticalAgent: true,
    sourceFile: "src/agents/memory-agent.ts",
  },

  CodeAgent: {
    agentName: "CodeAgent",
    agentClass: CodeAgent as any,
    maxRestarts: 5,
    restartDelay: 5000,
    healthCheckInterval: 15000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "pre-spawn",
    criticalAgent: true,
    sourceFile: "src/agents/code-agent.ts",
  },

  // ========== SPECIALIZED AGENTS (6) - Spawn on demand ==========
  FinanceAgent: {
    agentName: "FinanceAgent",
    agentClass: FinanceAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/finance-agent.ts",
  },

  WeatherAgent: {
    agentName: "WeatherAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/weather-agent.ts",
  },

  NewsAgent: {
    agentName: "NewsAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/news-agent.ts",
  },

  CalendarAgent: {
    agentName: "CalendarAgent",
    agentClass: CalendarAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/calendar-agent.ts",
  },

  EmailAgent: {
    agentName: "EmailAgent",
    agentClass: EmailAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/email-agent.ts",
  },

  ReminderAgent: {
    agentName: "ReminderAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: ["CalendarAgent"],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/reminder-agent.ts",
  },

  // ========== TIMER/ALARM AGENTS (2) ==========
  TimerAgent: {
    agentName: "TimerAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/timer-agent.ts",
  },

  AlarmAgent: {
    agentName: "AlarmAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/alarm-agent.ts",
  },

  // ========== CREATIVE AGENTS (4) ==========
  ImageGenerationAgent: {
    agentName: "ImageGenerationAgent",
    agentClass: ImageAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/image-agent.ts",
  },

  MusicAgent: {
    agentName: "MusicAgent",
    agentClass: MusicAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/music-agent.ts",
  },

  VideoAgent: {
    agentName: "VideoAgent",
    agentClass: VideoAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/video-agent.ts",
  },

  StoryAgent: {
    agentName: "StoryAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/story-agent.ts",
  },

  // ========== TECHNICAL AGENTS (7) ==========
  ComputerControlAgent: {
    agentName: "ComputerControlAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/computer-control-agent.ts",
  },

  FileAgent: {
    agentName: "FileAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/file-agent.ts",
  },

  SearchAgent: {
    agentName: "SearchAgent",
    agentClass: WebAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/web-agent.ts",
  },

  CalculatorAgent: {
    agentName: "CalculatorAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/calculator-agent.ts",
  },

  UnitConverterAgent: {
    agentName: "UnitConverterAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/unit-converter-agent.ts",
  },

  TranslationAgent: {
    agentName: "TranslationAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/translation-agent.ts",
  },

  // ========== VOICE/AUDIO AGENTS (4) ==========
  SpeechAgent: {
    agentName: "SpeechAgent",
    agentClass: VoiceAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/speech-agent.ts",
  },

  ListeningAgent: {
    agentName: "ListeningAgent",
    agentClass: VoiceAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/listening-agent.ts",
  },

  VoiceCommandAgent: {
    agentName: "VoiceCommandAgent",
    agentClass: VoiceAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: ["SpeechAgent", "ListeningAgent"],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/voice-command-agent.ts",
  },

  VoiceAgent: {
    agentName: "VoiceAgent",
    agentClass: VoiceAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/voice-agent.ts",
  },

  // ========== AI/LLM AGENTS (2) ==========
  LLMAgent: {
    agentName: "LLMAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/llm-agent.ts",
  },

  PersonalityAgent: {
    agentName: "PersonalityAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/personality-agent.ts",
  },

  // ========== ADDITIONAL AGENTS (3) ==========
  EmotionAgent: {
    agentName: "EmotionAgent",
    agentClass: PlaceholderAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 30000,
    spawnTimeout: 10000,
    dependencies: ["ConversationAgent"],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/emotion-agent.ts",
  },

  SpotifyAgent: {
    agentName: "SpotifyAgent",
    agentClass: SpotifyAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/spotify-agent.ts",
  },

  AppleMusicAgent: {
    agentName: "AppleMusicAgent",
    agentClass: AppleMusicAgent as any,
    maxRestarts: 3,
    restartDelay: 10000,
    healthCheckInterval: 60000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/apple-music-agent.ts",
  },

  ReliabilityAgent: {
    agentName: "ReliabilityAgent",
    agentClass: ReliabilityAgent as any,
    maxRestarts: 3,
    restartDelay: 5000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/reliability-agent.ts",
  },

  EmotionsEngineAgent: {
    agentName: "EmotionsEngineAgent",
    agentClass: EmotionsEngineAgent as any,
    maxRestarts: 3,
    restartDelay: 5000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/emotions-engine-agent.ts",
  },

  MemorySystemAgent: {
    agentName: "MemorySystemAgent",
    agentClass: MemorySystemAgent as any,
    maxRestarts: 3,
    restartDelay: 5000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/memory-system-agent.ts",
  },

  VisualEngineAgent: {
    agentName: "VisualEngineAgent",
    agentClass: VisualEngineAgent as any,
    maxRestarts: 3,
    restartDelay: 5000,
    healthCheckInterval: 30000,
    spawnTimeout: 15000,
    dependencies: [],
    spawnStrategy: "on-demand",
    criticalAgent: false,
    sourceFile: "src/agents/visual-engine-agent.ts",
  },
};
