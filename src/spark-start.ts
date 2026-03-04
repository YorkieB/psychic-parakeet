/*
  This file makes Jarvis start up like a car engine - all agents fire at once like spark plugs!

  It starts all 40+ agents simultaneously in parallel for maximum speed, getting Jarvis fully operational in seconds.
*/

import dotenv from 'dotenv';
// Import ALL agents - the full fleet!
import { AlarmAgent } from './agents/alarm-agent';
import { AppleMusicAgent } from './agents/apple-music-agent';
import { CalculatorAgent } from './agents/calculator-agent';
import { CalendarAgent } from './agents/calendar-agent';
import { CodeAgent } from './agents/code-agent';
import { CommandAgent } from './agents/command-agent';
import { ComputerControlAgent } from './agents/computer-control-agent';
import { ContextAgent } from './agents/context-agent';
import { DialogueAgent } from './agents/dialogue-agent';
import { EmailAgent } from './agents/email-agent';
import { EmotionAgent } from './agents/emotion-agent';
import { EmotionsEngineAgent } from './agents/emotions-engine-agent';
import { FileAgent } from './agents/file-agent';
import { FinanceAgent } from './agents/finance-agent';
import { ImageAgent } from './agents/image-agent';
import { KnowledgeAgent } from './agents/knowledge-agent';
import { ListeningAgent } from './agents/listening-agent';
import { LLMAgent } from './agents/llm-agent';
import { LocalLLMAgent } from './agents/local-llm-agent';
import { MemoryAgent } from './agents/memory-agent';
import { MemorySystemAgent } from './agents/memory-system-agent';
import { MusicAgent } from './agents/music-agent';
import { NewsAgent } from './agents/news-agent';
import { OllamaLLMAgent } from './agents/ollama-llm-agent';
import { PersonalityAgent } from './agents/personality-agent';
import { ReliabilityAgent } from './agents/reliability-agent';
import { ReminderAgent } from './agents/reminder-agent';
import { SpeechAgent } from './agents/speech-agent';
import { SpotifyAgent } from './agents/spotify-agent';
import { StoryAgent } from './agents/story-agent';
import { TimerAgent } from './agents/timer-agent';
import { TranslationAgent } from './agents/translation-agent';
import { UnitConverterAgent } from './agents/unit-converter-agent';
import { VideoAgent } from './agents/video-agent';
import { VisualEngineAgent } from './agents/visual-engine-agent';
import { VoiceAgent } from './agents/voice-agent';
import { VoiceCommandAgent } from './agents/voice-command-agent';
import { WeatherAgent } from './agents/weather-agent';
import { WebAgent } from './agents/web-agent';
import { JarvisAPIServer } from './api/server';
import { isPortAvailable, retryWithBackoff, sleep } from './config/port-utils';
import { PORTS } from './config/ports';
import { VertexLLMClient } from './llm';
import { AgentRegistry } from './orchestrator/agent-registry';
import { Orchestrator } from './orchestrator/orchestrator';
import { HealthGuard } from './self-healing/health-guard';
import { AgentStatus } from './types/agent';
import { createLogger } from './utils/logger';

// Load environment
dotenv.config();

// Create logger
const logger = createLogger('SparkStart');

// Create the HealthGuard — the immovable foundation.
// Process guards are installed IMMEDIATELY so no crash can escape, even during startup.
const healthGuard = new HealthGuard(logger, {
  watchdogIntervalMs: 10000,
  healthLoopTimeoutMs: 90000,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 60000,
  agentPingTimeoutMs: 3000,
  maxGuardRestarts: 10,
});
healthGuard.installProcessGuards();
// Expose globally so the API server's /health/guard endpoint can read it
(global as any).__healthGuard = healthGuard;

// Agent configuration - all 40+ agents ready to fire!
// Ports are locked in src/config/ports.ts (Code Protection Dome)
const AGENT_CONFIGS = [
  // Core agents
  { id: 'Dialogue', Agent: DialogueAgent, port: PORTS.Dialogue, priority: 10 },
  { id: 'Web', Agent: WebAgent, port: PORTS.Web, priority: 9 },
  { id: 'Knowledge', Agent: KnowledgeAgent, port: PORTS.Knowledge, priority: 8 },

  // Productivity agents
  { id: 'Finance', Agent: FinanceAgent, port: PORTS.Finance, priority: 7 },
  { id: 'Calendar', Agent: CalendarAgent, port: PORTS.Calendar, priority: 7 },
  { id: 'Email', Agent: EmailAgent, port: PORTS.Email, priority: 7 },
  { id: 'Code', Agent: CodeAgent, port: PORTS.Code, priority: 6 },
  { id: 'Voice', Agent: VoiceAgent, port: PORTS.Voice, priority: 6 },

  // Media agents
  { id: 'Music', Agent: MusicAgent, port: PORTS.Music, priority: 5 },
  { id: 'Spotify', Agent: SpotifyAgent, port: PORTS.Spotify, priority: 5 },
  { id: 'AppleMusic', Agent: AppleMusicAgent, port: PORTS.AppleMusic, priority: 5 },
  { id: 'Image', Agent: ImageAgent, port: PORTS.Image, priority: 5 },
  { id: 'Video', Agent: VideoAgent, port: PORTS.Video, priority: 5 },

  // Utility agents
  { id: 'Weather', Agent: WeatherAgent, port: PORTS.Weather, priority: 4 },
  { id: 'News', Agent: NewsAgent, port: PORTS.News, priority: 4 },
  { id: 'Calculator', Agent: CalculatorAgent, port: PORTS.Calculator, priority: 4 },
  { id: 'UnitConverter', Agent: UnitConverterAgent, port: PORTS.UnitConverter, priority: 4 },
  { id: 'Translation', Agent: TranslationAgent, port: PORTS.Translation, priority: 4 },

  // Time & reminder agents
  { id: 'Timer', Agent: TimerAgent, port: PORTS.Timer, priority: 4 },
  { id: 'Alarm', Agent: AlarmAgent, port: PORTS.Alarm, priority: 4 },
  { id: 'Reminder', Agent: ReminderAgent, port: PORTS.Reminder, priority: 4 },
  { id: 'Story', Agent: StoryAgent, port: PORTS.Story, priority: 3 },

  // Advanced agents
  { id: 'Command', Agent: CommandAgent, port: PORTS.Command, priority: 3 },
  { id: 'Context', Agent: ContextAgent, port: PORTS.Context, priority: 3 },
  { id: 'Memory', Agent: MemoryAgent, port: PORTS.Memory, priority: 3 },
  { id: 'Emotion', Agent: EmotionAgent, port: PORTS.Emotion, priority: 3 },
  { id: 'File', Agent: FileAgent, port: PORTS.File, priority: 3 },
  { id: 'LLM', Agent: LLMAgent, port: PORTS.LLM, priority: 3 },
  { id: 'LocalLLM', Agent: LocalLLMAgent, port: PORTS.LocalLLM, priority: 1 },
  { id: 'OllamaLLM', Agent: OllamaLLMAgent, port: PORTS.OllamaLLM, priority: 2 },
  { id: 'Personality', Agent: PersonalityAgent, port: PORTS.Personality, priority: 3 },
  { id: 'Listening', Agent: ListeningAgent, port: PORTS.Listening, priority: 3 },
  { id: 'Speech', Agent: SpeechAgent, port: PORTS.Speech, priority: 3 },
  { id: 'VoiceCommand', Agent: VoiceCommandAgent, port: PORTS.VoiceCommand, priority: 3 },
  { id: 'Reliability', Agent: ReliabilityAgent, port: PORTS.Reliability, priority: 2 },
  { id: 'EmotionsEngine', Agent: EmotionsEngineAgent, port: PORTS.EmotionsEngine, priority: 2 },
  { id: 'MemorySystem', Agent: MemorySystemAgent, port: PORTS.MemorySystem, priority: 2 },
  { id: 'VisualEngine', Agent: VisualEngineAgent, port: PORTS.VisualEngine, priority: 2 },
  { id: 'ComputerControl', Agent: ComputerControlAgent, port: PORTS.ComputerControl, priority: 2 },
] as const;

// --- Fireproof Agent Launcher ---
// Creates an agent instance based on its config ID
function createAgentInstance(
  config: (typeof AGENT_CONFIGS)[number],
  logger: any,
  llm: VertexLLMClient | undefined
): any {
  if (config.id === 'Dialogue') {
    return new config.Agent(config.id, '1.0.0', config.port, logger, llm!);
  } else if (config.id === 'Knowledge') {
    return new config.Agent(logger, `http://localhost:${PORTS.Web}/api`);
  } else if (config.id === 'Code') {
    return new config.Agent(logger, llm as any);
  } else if (config.id === 'Voice') {
    return new config.Agent(logger, llm as any);
  } else if (config.id === 'Image') {
    return new config.Agent(logger, llm as any);
  } else if (config.id === 'Music') {
    return new config.Agent(logger, llm as any);
  } else if (
    config.id === 'Reliability' ||
    config.id === 'EmotionsEngine' ||
    config.id === 'MemorySystem' ||
    config.id === 'VisualEngine' ||
    config.id === 'LocalLLM' ||
    config.id === 'OllamaLLM'
  ) {
    return new config.Agent(config.id, '1.0.0', config.port, logger);
  } else {
    return new config.Agent(logger);
  }
}

// Starts a single agent with retry + port check, then registers it
async function startAgentWithRetry(
  config: (typeof AGENT_CONFIGS)[number],
  registry: AgentRegistry,
  logger: any,
  llm: VertexLLMClient | undefined,
  maxRetries: number = 3
): Promise<{ id: string; success: boolean; duration: number; error?: string; attempt: number }> {
  const agentStart = Date.now();

  // Set port environment variable
  const envVarName =
    config.id
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toUpperCase() + '_AGENT_PORT';
  process.env[envVarName] = config.port.toString();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Pre-flight: check if port is available
      const portFree = await isPortAvailable(config.port);
      if (!portFree) {
        logger.warn(`[Fireproof] Port ${config.port} busy for ${config.id} — waiting...`);
        // Wait up to 5s for port to free up (e.g., stale process releasing)
        let freed = false;
        for (let wait = 0; wait < 10; wait++) {
          await sleep(500);
          if (await isPortAvailable(config.port)) {
            freed = true;
            break;
          }
        }
        if (!freed) {
          throw new Error(`Port ${config.port} is occupied — cannot bind ${config.id}`);
        }
        logger.info(`[Fireproof] Port ${config.port} freed for ${config.id}`);
      }

      // Create and start agent
      const agent = createAgentInstance(config, logger, llm);
      logger.info(
        `⚡ Starting ${config.id} (port ${config.port})${attempt > 1 ? ` [retry ${attempt}/${maxRetries}]` : ''}...`
      );
      await agent.start();

      const duration = Date.now() - agentStart;
      logger.info(`⚡ ${config.id} fired up in ${duration}ms (port ${config.port})`);

      // Register with registry
      try {
        await registry.registerAgent({
          agentId: config.id,
          version: '1.0.0',
          capabilities: getAgentCapabilities(config.id),
          status: AgentStatus.ONLINE,
          healthEndpoint: `http://localhost:${config.port}/health`,
          apiEndpoint: `http://localhost:${config.port}/api`,
          dependencies: [],
          priority: config.priority,
        });
      } catch (regErr: any) {
        // Agent started fine but registry failed — log but don't crash
        logger.warn(`[Fireproof] ${config.id} started but registry failed: ${regErr.message}`);
      }

      return { id: config.id, success: true, duration, attempt };
    } catch (error: any) {
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        logger.warn(
          `[Fireproof] ${config.id} failed (attempt ${attempt}/${maxRetries}): ${error.message} — retrying in ${delay}ms`
        );
        await sleep(delay);
      } else {
        const duration = Date.now() - agentStart;
        logger.error(`❌ ${config.id} failed after ${maxRetries} attempts: ${error.message}`);
        return { id: config.id, success: false, duration, error: error.message, attempt };
      }
    }
  }

  // Unreachable but TypeScript wants it
  return {
    id: config.id,
    success: false,
    duration: Date.now() - agentStart,
    error: 'unknown',
    attempt: maxRetries,
  };
}

async function sparkStart(): Promise<void> {
  const startTime = Date.now();

  logger.info('🚀 Jarvis Spark Start - Firing all agents like spark plugs!\n');

  try {
    // ──────────────────────────────────────────
    // Phase 1: Core infrastructure (must succeed)
    // ──────────────────────────────────────────

    // Initialize LLM (non-fatal — agents degrade gracefully without it)
    let llm: VertexLLMClient | undefined;
    try {
      llm = new VertexLLMClient(logger);
      logger.info('⚡ LLM ready');
    } catch {
      logger.warn('⚠️  LLM failed, continuing without AI');
    }

    // Create core services
    const registry = new AgentRegistry(logger);
    const orchestrator = new Orchestrator(registry, logger);

    // Pre-flight: Check if API server port is free
    const apiPortFree = await isPortAvailable(PORTS.API_SERVER);
    if (!apiPortFree) {
      logger.warn(`[Fireproof] API port ${PORTS.API_SERVER} is busy — waiting up to 10s...`);
      let freed = false;
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (await isPortAvailable(PORTS.API_SERVER)) {
          freed = true;
          break;
        }
      }
      if (!freed) {
        logger.error(`❌ API port ${PORTS.API_SERVER} is still occupied. Cannot start.`);
        logger.error('   Kill the process using that port and try again.');
        return;
      }
      logger.info(`[Fireproof] API port ${PORTS.API_SERVER} freed`);
    }

    // Start API server with retry (3 attempts)
    logger.info('🌐 Starting API server...');
    await retryWithBackoff(
      async () => {
        const server = new JarvisAPIServer(orchestrator, registry, logger, PORTS.API_SERVER);
        await server.start();
        return server;
      },
      {
        maxRetries: 3,
        baseDelayMs: 2000,
        maxDelayMs: 10000,
        label: 'API Server',
        logger,
      }
    );
    logger.info(`✅ API server ready on port ${PORTS.API_SERVER}!\n`);

    // ──────────────────────────────────────────
    // Phase 2: Port collision detection
    // ──────────────────────────────────────────
    const portMap = new Map<number, string>();
    for (const config of AGENT_CONFIGS) {
      if (portMap.has(config.port)) {
        logger.error(
          `❌ Port collision in config: ${config.id} and ${portMap.get(config.port)} both assigned port ${config.port}`
        );
        throw new Error(
          `Port collision: ${config.id} and ${portMap.get(config.port)} on port ${config.port}`
        );
      }
      portMap.set(config.port, config.id);
    }

    // ──────────────────────────────────────────
    // Phase 3: Fire all agents with retry
    // ──────────────────────────────────────────
    logger.info(`🔥 FIRING ${AGENT_CONFIGS.length} AGENTS — each gets 3 attempts with backoff\n`);

    // Launch all agents in parallel — each one retries independently
    const firstWaveResults = await Promise.allSettled(
      AGENT_CONFIGS.map(config => startAgentWithRetry(config, registry, logger, llm, 3))
    );

    // Collect results
    let successCount = 0;
    let failCount = 0;
    const failedConfigs: (typeof AGENT_CONFIGS)[number][] = [];

    firstWaveResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        failCount++;
        failedConfigs.push(AGENT_CONFIGS[index]);
      }
    });

    // ──────────────────────────────────────────
    // Phase 4: Retry wave — give failed agents one more chance
    // ──────────────────────────────────────────
    if (failedConfigs.length > 0 && failedConfigs.length <= 10) {
      logger.info(
        `\n🔄 Retry wave: ${failedConfigs.length} agent(s) failed — giving them one more round...`
      );
      await sleep(3000); // Cool-down before retry wave

      const retryResults = await Promise.allSettled(
        failedConfigs.map(config => startAgentWithRetry(config, registry, logger, llm, 2))
      );

      retryResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
          failCount--;
          logger.info(`🔄 ${result.value.id} recovered on retry wave!`);
        }
      });
    }

    const totalDuration = Date.now() - startTime;

    // ──────────────────────────────────────────
    // Phase 5: Startup report
    // ──────────────────────────────────────────
    logger.info('\n╔══════════════════════════════════════════╗');
    logger.info('║        SPARK START — FINAL REPORT         ║');
    logger.info('╠══════════════════════════════════════════╣');
    logger.info(`║  Total time:  ${(totalDuration / 1000).toFixed(2)}s`);
    logger.info(`║  Agents:      ${successCount}/${AGENT_CONFIGS.length} online`);
    if (failCount > 0) {
      logger.warn(`║  Failed:      ${failCount} agent(s)`);
      const stillFailed = failedConfigs.filter(c => {
        // Check if it recovered in retry wave
        try {
          return !registry.getAgent(c.id);
        } catch {
          return true;
        }
      });
      if (stillFailed.length > 0) {
        logger.warn(`║  Dead agents: ${stillFailed.map(c => c.id).join(', ')}`);
      }
    } else {
      logger.info('║  Status:      ALL AGENTS FIRING ✅');
    }
    logger.info('╠══════════════════════════════════════════╣');
    logger.info(`║  API:     http://localhost:${PORTS.API_SERVER}`);
    logger.info(`║  Health:  http://localhost:${PORTS.API_SERVER}/health`);
    logger.info(`║  Guard:   http://localhost:${PORTS.API_SERVER}/health/guard`);
    logger.info(`║  Chat:    http://localhost:${PORTS.API_SERVER}/chat`);
    logger.info('╚══════════════════════════════════════════╝');

    // ──────────────────────────────────────────
    // Phase 6: HealthGuard watchdog
    // ──────────────────────────────────────────
    const agentConfigs = AGENT_CONFIGS;
    healthGuard.start(async () => {
      await Promise.allSettled(
        agentConfigs.map(async config => {
          const data = await healthGuard.pingAgent(config.id, config.port);
          if (!data && !healthGuard.isCircuitOpen(config.id)) {
            logger.warn(`[HealthGuard] ${config.id} (port ${config.port}) did not respond`);
          }
        })
      );

      let healthy = 0;
      let unhealthy = 0;
      for (const config of agentConfigs) {
        if (healthGuard.isCircuitOpen(config.id)) {
          unhealthy++;
        } else {
          healthy++;
        }
      }

      if (unhealthy > 0) {
        logger.warn(`[HealthGuard] Health sweep: ${healthy} healthy, ${unhealthy} circuits open`);
      }
    }, 30000);

    logger.info(
      '\n🛡️  HealthGuard is active — watchdog, circuit breakers, and process guards online'
    );
  } catch (error) {
    logger.error('❌ Spark start critical failure:', error);
    // Even on fatal startup error, the process guard keeps running.
    // Do NOT call process.exit — the guard will log the error and keep the process alive
    // so the user can see what happened.
    logger.error('   The process will stay alive so you can read the logs above.');
  }
}

function getAgentCapabilities(agentId: string): string[] {
  const capabilities: Record<string, string[]> = {
    Dialogue: ['conversation', 'response', 'context_tracking'],
    Web: ['web_search', 'information_retrieval', 'fact_checking'],
    Knowledge: ['research', 'fact_checking', 'summarization', 'knowledge_base'],
    Finance: ['analyze_spending', 'track_budget', 'financial_advice'],
    Calendar: ['list_events', 'create_event', 'update_event', 'delete_event'],
    Email: ['list_emails', 'send_email', 'read_email', 'delete_email'],
    Code: ['generate_code', 'analyze_code', 'debug_code', 'explain_code'],
    Voice: ['transcribe', 'synthesize', 'emotion_detection'],
    Music: ['play_music', 'search', 'create_playlist', 'recommend'],
    Spotify: ['play', 'search', 'playlist', 'recommend'],
    AppleMusic: ['play', 'search', 'playlist', 'recommend'],
    Image: ['generate_image', 'enhance_prompt', 'create_variations'],
    Video: ['generate_video', 'enhance', 'create_variations'],
    Weather: ['get_current', 'get_forecast', 'get_hourly', 'get_alerts'],
    News: ['get_headlines', 'search', 'get_by_category', 'get_sources'],
    Calculator: ['calculate', 'basic', 'scientific', 'percentage'],
    UnitConverter: ['convert', 'convert_temperature', 'list_categories'],
    Translation: ['translate', 'detect', 'list_languages', 'batch_translate'],
    Timer: ['start', 'pause', 'resume', 'stop', 'get', 'list'],
    Alarm: ['create', 'list', 'get', 'update', 'enable', 'disable'],
    Reminder: ['create', 'list', 'get', 'update', 'complete', 'delete'],
    Story: ['generate', 'continue', 'summarize', 'get_prompt'],
    Command: ['parse', 'execute', 'validate', 'get_history'],
    Context: ['get', 'set', 'update', 'clear', 'get_history'],
    Memory: ['store', 'recall', 'search', 'forget', 'list'],
    Emotion: ['analyze', 'detect', 'track', 'report'],
    File: ['read', 'write', 'list', 'search', 'delete', 'copy'],
    LLM: ['complete', 'chat', 'analyze', 'reason'],
    Personality: ['get_active', 'set_trait', 'analyze'],
    Listening: ['start', 'stop', 'get_status', 'set_sensitivity'],
    Speech: ['synthesize', 'speak', 'get_voices'],
    VoiceCommand: ['register', 'unregister', 'list', 'process'],
    Reliability: ['assess', 'monitor', 'report', 'heal'],
    EmotionsEngine: ['emotion_recognition', 'mood_analysis'],
    MemorySystem: ['memory_ingestion', 'search', 'retrieve'],
    VisualEngine: ['visual_analysis', 'image_understanding'],
    ComputerControl: ['get_system_info', 'control_apps'],
  };

  return capabilities[agentId] || [];
}

// Start the system — never exit on failure, HealthGuard keeps us alive
if (require.main === module) {
  sparkStart().catch(error => {
    logger.error('Spark start failed:', error);
    logger.error('Process will stay alive — HealthGuard is active. Check logs above.');
  });
}

export { sparkStart };
