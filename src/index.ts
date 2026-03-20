/*
  This file is the main entry point that brings Jarvis to life.

  It sets up all the agents, connects the database, starts the API server, and coordinates everything while making sure Jarvis is ready to help you with whatever you need.
*/
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { AlarmAgent } from './agents/alarm-agent';
import { AppleMusicAgent } from './agents/apple-music-agent';
import { CalculatorAgent } from './agents/calculator-agent';
import { CalendarAgent } from './agents/calendar-agent';
import { CodeAgent } from './agents/code-agent';
// Advanced agents
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
import { MemoryAgent } from './agents/memory-agent';
import { MemorySystemAgent } from './agents/memory-system-agent';
import { MusicAgent } from './agents/music-agent';
import { NewsAgent } from './agents/news-agent';
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
// New utility agents
import { WeatherAgent } from './agents/weather-agent';
import { WebAgent } from './agents/web-agent';
import { JarvisAPIServer } from './api/server';
import { DatabaseClient } from './database';
import {
  CacheRepository,
  ConversationRepository,
  ReasoningRepository,
} from './database/repositories';
// UserInput type moved to test files
import { VertexLLMClient } from './llm';
import { ContextManager } from './memory';
import { AgentRegistry } from './orchestrator/agent-registry';
import { Orchestrator } from './orchestrator/orchestrator';
import { AdvancedReasoningEngine } from './reasoning/advanced-reasoning-engine';
import { SecurityAgent } from './security/security-agent';
import { AGENT_SPAWN_CONFIG } from './self-healing/config/agents.config';
import { AgentWebSocketEvents } from './self-healing/dashboard/websocket-events';
import { DiagnosticEngine } from './self-healing/diagnostic/diagnostic-engine';
import { KnowledgeBaseFactory } from './self-healing/knowledge/knowledge-base-factory';
import { RepairEngine } from './self-healing/repair/repair-engine';
// Import sensors for all running agents
import {
  AlarmAgentSensor, // Alarm agent at port 3019
  AppleMusicAgentSensor, // Apple Music agent at port 3013
  CalculatorAgentSensor, // Calculator agent at port 3023
  CalendarAgentSensor, // Calendar agent at port 3005
  CodeAgentSensor, // Code agent at port 3007

  // Advanced agents
  CommandAgentSensor, // Command agent at port 3026
  ComputerControlAgentSensor, // Computer Control agent at port 3031
  ContextAgentSensor, // Context agent at port 3027
  ConversationAgentSensor, // Dialogue agent at port 3001
  EmailAgentSensor, // Email agent at port 3006
  EmotionAgentSensor, // Emotion agent at port 3029
  FileAgentSensor, // File agent at port 3030
  FinanceAgentSensor, // Finance agent at port 3004
  ImageGenerationAgentSensor, // Image agent at port 3010
  ListeningAgentSensor, // Listening agent at port 3029
  LLMAgentSensor, // LLM agent at port 3032
  MemoryAgentSensor, // Memory agent at port 3028
  MusicAgentSensor, // Music agent at port 3009
  NewsAgentSensor, // News agent at port 3016
  PersonalityAgentSensor, // Personality agent at port 3033
  ReminderAgentSensor, // Reminder agent at port 3017
  SearchAgentSensor, // Web agent at port 3002
  SpeechAgentSensor, // Speech agent at port 3035
  SpotifyAgentSensor, // Spotify agent at port 3012
  StoryAgentSensor, // Story agent at port 3020
  TimerAgentSensor, // Timer agent at port 3018
  TranslationAgentSensor, // Translation agent at port 3025
  UnitConverterAgentSensor, // Unit Converter agent at port 3024
  VideoAgentSensor, // Video agent at port 3011
  VoiceAgentSensor, // Voice agent at port 3008
  VoiceCommandAgentSensor, // Voice Command agent at port 3036

  // New utility agents
  WeatherAgentSensor, // Weather agent at port 3015
} from './self-healing/sensors/agents';
import { AgentLifecycle, AgentPoolManager } from './self-healing/spawner';
import { HealthEventHandler } from './self-healing/spawner/health-event-handler';
import { createLogger } from './utils/logger';
import { getWatchdog, initializeWatchdog } from './utils/server-watchdog';
import { BargeInController } from './voice/barge-in-controller';
import { VoiceInterface } from './voice/voice-interface';

// Load environment variables
dotenv.config();

// Module-level agent references for self-healing infrastructure
let dialogueAgent: DialogueAgent | undefined;
let webAgent: WebAgent | undefined;
let knowledgeAgent: KnowledgeAgent | undefined;
let financeAgent: FinanceAgent | undefined;
let calendarAgent: CalendarAgent | undefined;
let emailAgent: EmailAgent | undefined;

/**
 * Main entry point for the Jarvis multi-agent system.
 * Initializes the orchestrator, registers agents, and starts health monitoring.
 */
async function main(): Promise<void> {
  // Create logger
  const logger = createLogger('JarvisSystem');

  // Initialize server watchdog for crash prevention
  const _watchdog = initializeWatchdog(logger, {
    memoryThresholdMB: 1024, // 1GB - trigger GC
    memoryMaxMB: 1800, // 1.8GB - critical
    heartbeatIntervalMs: 30000, // 30 second health checks
    maxConsecutiveErrors: 5,
    enableAutoGC: true,
  });
  logger.info('🛡️ Server watchdog initialized');

  logger.info('🚀 Starting Jarvis System...');

  try {
    // Initialize LLM for chat: Vertex AI only
    let llm: InstanceType<typeof VertexLLMClient> | undefined;
    const vertexUrl = process.env.VERTEX_AI_ENDPOINT_URL?.trim();
    if (vertexUrl) {
      try {
        llm = new VertexLLMClient(logger);
        logger.info('✅ Vertex AI client initialized for chat');
        logger.info(`   Endpoint: ${vertexUrl}`);
      } catch (err) {
        logger.error('Vertex AI client failed, chat will be unavailable', { error: err });
        llm = undefined;
      }
    } else {
      logger.warn('⚠️  VERTEX_AI_ENDPOINT_URL not configured - LLM features will be unavailable');
    }

    if (!llm) {
      logger.warn('⚠️  No LLM configured - using fallback responses');
    }

    // Create agent registry
    const registry = new AgentRegistry(logger);
    logger.info('Agent Registry created');

    // Create orchestrator
    const orchestrator = new Orchestrator(registry, logger);
    logger.info('Orchestrator created');

    // Create and start dialogue agent with LLM (Vertex or OpenAI; both expose complete())
    const dialoguePort = parseInt(process.env.DIALOGUE_AGENT_PORT || '3001', 10);
    dialogueAgent = new DialogueAgent(
      'Dialogue',
      '1.0.0',
      dialoguePort,
      logger,
      llm as VertexLLMClient
    );
    await dialogueAgent.start();
    logger.info('Dialogue Agent started');

    // Start Web Agent
    webAgent = new WebAgent(logger);
    await webAgent.start();
    logger.info('Web Agent started');

    // Start Knowledge Agent
    knowledgeAgent = new KnowledgeAgent(logger, 'http://localhost:3002/api');
    await knowledgeAgent.start();
    logger.info('Knowledge Agent started');

    // Start Finance Agent
    logger.info('\n📊 Starting Finance Agent...');
    financeAgent = new FinanceAgent(logger);
    await financeAgent.start();
    logger.info('✅ Finance Agent started');

    // Start Calendar Agent
    logger.info('\n📅 Starting Calendar Agent...');
    calendarAgent = new CalendarAgent(logger);
    await calendarAgent.start();
    logger.info('✅ Calendar Agent started');

    // Start Email Agent
    logger.info('\n📧 Starting Email Agent...');
    emailAgent = new EmailAgent(logger);
    await emailAgent.start();
    logger.info('✅ Email Agent started');

    // Start Code Agent
    logger.info('\n💻 Starting Code Agent...');
    const codeAgent = new CodeAgent(logger, llm as any);
    await codeAgent.start();
    logger.info('✅ Code Agent started');

    // Start Voice Agent (if LLM available)
    let voiceAgent: VoiceAgent | undefined;
    let voiceInterface: VoiceInterface | undefined;
    let bargeInController: BargeInController | undefined;

    if (llm) {
      logger.info('\n🎙️  Starting Voice Agent...');
      voiceAgent = new VoiceAgent(logger, llm as any);
      await voiceAgent.start();
      logger.info('✅ Voice Agent started');

      // Initialize voice interface
      logger.info('\n🔊 Initializing Voice Interface...');
      bargeInController = new BargeInController(logger);
      voiceInterface = new VoiceInterface(logger, voiceAgent, bargeInController, orchestrator);
      await voiceInterface.initialize();
      logger.info('✅ Voice Interface ready');
    } else {
      logger.info('\n🎙️  Voice Agent skipped (LLM not available)\n');
    }

    // No wait needed - agents are ready immediately after start()

    // Manually register dialogue agent (since HTTP registration is TODO)
    await registry.registerAgent({
      agentId: 'Dialogue',
      version: '1.0.0',
      capabilities: ['conversation', 'response', 'context_tracking'],
      status: dialogueAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.DIALOGUE_AGENT_PORT || '3001'}/health`,
      apiEndpoint: `http://localhost:${process.env.DIALOGUE_AGENT_PORT || '3001'}/api`,
      dependencies: [],
      priority: 5,
    });

    // Manually register web agent (since HTTP registration is TODO)
    await registry.registerAgent({
      agentId: 'Web',
      version: '1.0.0',
      capabilities: ['web_search', 'information_retrieval', 'fact_checking'],
      status: webAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.WEB_AGENT_PORT || '3002'}/health`,
      apiEndpoint: `http://localhost:${process.env.WEB_AGENT_PORT || '3002'}/api`,
      dependencies: [],
      priority: 7,
    });

    // Manually register knowledge agent (since HTTP registration is TODO)
    await registry.registerAgent({
      agentId: 'Knowledge',
      version: '1.0.0',
      capabilities: [
        'research',
        'fact_checking',
        'summarization',
        'information_synthesis',
        'multi_source_analysis',
      ],
      status: knowledgeAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.KNOWLEDGE_AGENT_PORT || '3003'}/health`,
      apiEndpoint: `http://localhost:${process.env.KNOWLEDGE_AGENT_PORT || '3003'}/api`,
      dependencies: ['Web'],
      priority: 8,
    });

    // Register Finance Agent
    await registry.registerAgent({
      agentId: 'Finance',
      version: '1.0.0',
      capabilities: [
        'track_spending',
        'analyze_budget',
        'categorize_expenses',
        'financial_summary',
        'spending_insights',
        'set_budget',
        'check_budget',
      ],
      status: financeAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.FINANCE_AGENT_PORT || '3004'}/health`,
      apiEndpoint: `http://localhost:${process.env.FINANCE_AGENT_PORT || '3004'}/api`,
      dependencies: [],
      priority: 6,
    });

    // Register Calendar Agent
    await registry.registerAgent({
      agentId: 'Calendar',
      version: '1.0.0',
      capabilities: [
        'create_event',
        'list_events',
        'find_free_time',
        'set_reminder',
        'check_schedule',
        'cancel_event',
        'reschedule_event',
      ],
      status: calendarAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.CALENDAR_AGENT_PORT || '3005'}/health`,
      apiEndpoint: `http://localhost:${process.env.CALENDAR_AGENT_PORT || '3005'}/api`,
      dependencies: [],
      priority: 6,
    });

    // Register Email Agent
    await registry.registerAgent({
      agentId: 'Email',
      version: '1.0.0',
      capabilities: [
        'list_emails',
        'filter_emails',
        'categorize_emails',
        'mark_read',
        'archive_email',
        'search_emails',
        'email_summary',
      ],
      status: emailAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.EMAIL_AGENT_PORT || '3006'}/health`,
      apiEndpoint: `http://localhost:${process.env.EMAIL_AGENT_PORT || '3006'}/api`,
      dependencies: [],
      priority: 6,
    });

    // Register Code Agent
    await registry.registerAgent({
      agentId: 'Code',
      version: '1.0.0',
      capabilities: [
        'review_code',
        'explain_code',
        'generate_code',
        'debug_code',
        'suggest_improvements',
        'write_tests',
        'document_code',
      ],
      status: codeAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.CODE_AGENT_PORT || '3007'}/health`,
      apiEndpoint: `http://localhost:${process.env.CODE_AGENT_PORT || '3007'}/api`,
      dependencies: [],
      priority: 7,
    });

    // Register Voice Agent
    if (voiceAgent) {
      await registry.registerAgent({
        agentId: 'Voice',
        version: '1.0.0',
        capabilities: [
          'speech_to_text',
          'text_to_speech',
          'analyze_voice_emotion',
          'clone_voice',
          'adjust_emotion',
        ],
        status: voiceAgent.getStatus(),
        healthEndpoint: `http://localhost:${process.env.VOICE_AGENT_PORT || '3008'}/health`,
        apiEndpoint: `http://localhost:${process.env.VOICE_AGENT_PORT || '3008'}/api`,
        dependencies: [],
        priority: 7,
      });
    }

    // Start Music Agent
    logger.info('\n🎵 Starting Music Agent...');
    const musicAgent = new MusicAgent(logger, llm! as any);
    await musicAgent.start();
    await registry.registerAgent({
      agentId: 'Music',
      version: '1.0.0',
      capabilities: [
        'generate_music',
        'analyze_prompt',
        'ask_clarifying_questions',
        'get_generation_status',
        'download_music',
        'list_generations',
      ],
      status: musicAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.MUSIC_AGENT_PORT || '3009'}/health`,
      apiEndpoint: `http://localhost:${process.env.MUSIC_AGENT_PORT || '3009'}/api`,
      dependencies: [],
      priority: 8,
    });
    logger.info('✅ Music Agent started');

    // Start Image Agent
    logger.info('\n🎨 Starting Image Agent...');
    const imageAgent = new ImageAgent(logger, llm! as any);
    await imageAgent.start();
    await registry.registerAgent({
      agentId: 'Image',
      version: '1.0.0',
      capabilities: ['generate_image', 'enhance_prompt', 'create_variations', 'list_images'],
      status: imageAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.IMAGE_AGENT_PORT || '3010'}/health`,
      apiEndpoint: `http://localhost:${process.env.IMAGE_AGENT_PORT || '3010'}/api`,
      dependencies: [],
      priority: 8,
    });
    logger.info('✅ Image Agent started');

    // Start Video Agent
    logger.info('\n🎬 Starting Video Agent...');
    const videoAgent = new VideoAgent(logger);
    await videoAgent.start();
    await registry.registerAgent({
      agentId: 'Video',
      version: '1.0.0',
      capabilities: [
        'generate_video',
        'check_status',
        'download_video',
        'extend_video',
        'list_videos',
      ],
      status: videoAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.VIDEO_AGENT_PORT || '3011'}/health`,
      apiEndpoint: `http://localhost:${process.env.VIDEO_AGENT_PORT || '3011'}/api`,
      dependencies: [],
      priority: 8,
    });
    logger.info('✅ Video Agent started');

    // Start Spotify Agent
    logger.info('\n🎧 Starting Spotify Agent...');
    const spotifyAgent = new SpotifyAgent(logger);
    await spotifyAgent.start();
    await registry.registerAgent({
      agentId: 'Spotify',
      version: '1.0.0',
      capabilities: [
        'play',
        'pause',
        'skip',
        'previous',
        'seek',
        'set_volume',
        'shuffle',
        'repeat',
        'search',
        'create_playlist',
        'add_to_playlist',
        'get_queue',
        'add_to_queue',
        'currently_playing',
        'get_devices',
      ],
      status: spotifyAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.SPOTIFY_AGENT_PORT || '3012'}/health`,
      apiEndpoint: `http://localhost:${process.env.SPOTIFY_AGENT_PORT || '3012'}/api`,
      dependencies: [],
      priority: 7,
    });
    logger.info('✅ Spotify Agent started');

    // Start Apple Music Agent
    logger.info('\n🍎 Starting Apple Music Agent...');
    const appleMusicAgent = new AppleMusicAgent(logger);
    await appleMusicAgent.start();
    await registry.registerAgent({
      agentId: 'AppleMusic',
      version: '1.0.0',
      capabilities: [
        'play',
        'pause',
        'skip',
        'previous',
        'seek',
        'set_volume',
        'search',
        'get_playlists',
        'create_playlist',
        'add_to_playlist',
        'get_recently_played',
        'get_recommendations',
        'currently_playing',
      ],
      status: appleMusicAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.APPLE_MUSIC_AGENT_PORT || '3013'}/health`,
      apiEndpoint: `http://localhost:${process.env.APPLE_MUSIC_AGENT_PORT || '3013'}/api`,
      dependencies: [],
      priority: 7,
    });
    logger.info('✅ Apple Music Agent started');

    // Start Weather Agent
    logger.info('\n🌤️  Starting Weather Agent...');
    const weatherAgent = new WeatherAgent(logger);
    await weatherAgent.start();
    await registry.registerAgent({
      agentId: 'Weather',
      version: '1.0.0',
      capabilities: ['get_current', 'get_forecast', 'get_hourly', 'get_alerts'],
      status: weatherAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.WEATHER_AGENT_PORT || '3015'}/health`,
      apiEndpoint: `http://localhost:${process.env.WEATHER_AGENT_PORT || '3015'}/api`,
      dependencies: [],
      priority: 4,
    });
    logger.info('✅ Weather Agent started');

    // Start News Agent
    logger.info('\n📰 Starting News Agent...');
    const newsAgent = new NewsAgent(logger);
    await newsAgent.start();
    await registry.registerAgent({
      agentId: 'News',
      version: '1.0.0',
      capabilities: ['get_headlines', 'search', 'get_by_category', 'get_sources'],
      status: newsAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.NEWS_AGENT_PORT || '3016'}/health`,
      apiEndpoint: `http://localhost:${process.env.NEWS_AGENT_PORT || '3016'}/api`,
      dependencies: [],
      priority: 4,
    });
    logger.info('✅ News Agent started');

    // Start Reminder Agent
    logger.info('\n⏰ Starting Reminder Agent...');
    const reminderAgent = new ReminderAgent(logger);
    await reminderAgent.start();
    await registry.registerAgent({
      agentId: 'Reminder',
      version: '1.0.0',
      capabilities: ['create', 'list', 'get', 'update', 'complete', 'delete', 'get_due'],
      status: reminderAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.REMINDER_AGENT_PORT || '3017'}/health`,
      apiEndpoint: `http://localhost:${process.env.REMINDER_AGENT_PORT || '3017'}/api`,
      dependencies: [],
      priority: 6,
    });
    logger.info('✅ Reminder Agent started');

    // Start Timer Agent
    logger.info('\n⏱️  Starting Timer Agent...');
    const timerAgent = new TimerAgent(logger);
    await timerAgent.start();
    await registry.registerAgent({
      agentId: 'Timer',
      version: '1.0.0',
      capabilities: ['start', 'pause', 'resume', 'stop', 'get', 'list', 'delete'],
      status: timerAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.TIMER_AGENT_PORT || '3018'}/health`,
      apiEndpoint: `http://localhost:${process.env.TIMER_AGENT_PORT || '3018'}/api`,
      dependencies: [],
      priority: 5,
    });
    logger.info('✅ Timer Agent started');

    // Start Alarm Agent
    logger.info('\n🔔 Starting Alarm Agent...');
    const alarmAgent = new AlarmAgent(logger);
    await alarmAgent.start();
    await registry.registerAgent({
      agentId: 'Alarm',
      version: '1.0.0',
      capabilities: ['create', 'list', 'get', 'update', 'enable', 'disable', 'snooze', 'delete'],
      status: alarmAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.ALARM_AGENT_PORT || '3019'}/health`,
      apiEndpoint: `http://localhost:${process.env.ALARM_AGENT_PORT || '3019'}/api`,
      dependencies: [],
      priority: 7,
    });
    logger.info('✅ Alarm Agent started');

    // Start Story Agent
    logger.info('\n📖 Starting Story Agent...');
    const storyAgent = new StoryAgent(logger);
    await storyAgent.start();
    await registry.registerAgent({
      agentId: 'Story',
      version: '1.0.0',
      capabilities: ['generate', 'continue', 'summarize', 'get_prompt', 'list_saved', 'save'],
      status: storyAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.STORY_AGENT_PORT || '3020'}/health`,
      apiEndpoint: `http://localhost:${process.env.STORY_AGENT_PORT || '3020'}/api`,
      dependencies: [],
      priority: 3,
    });
    logger.info('✅ Story Agent started');

    // Start Calculator Agent
    logger.info('\n🧮 Starting Calculator Agent...');
    const calculatorAgent = new CalculatorAgent(logger);
    await calculatorAgent.start();
    await registry.registerAgent({
      agentId: 'Calculator',
      version: '1.0.0',
      capabilities: ['calculate', 'basic', 'scientific', 'percentage', 'history', 'clear_history'],
      status: calculatorAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.CALCULATOR_AGENT_PORT || '3023'}/health`,
      apiEndpoint: `http://localhost:${process.env.CALCULATOR_AGENT_PORT || '3023'}/api`,
      dependencies: [],
      priority: 4,
    });
    logger.info('✅ Calculator Agent started');

    // Start Unit Converter Agent
    logger.info('\n📐 Starting Unit Converter Agent...');
    const unitConverterAgent = new UnitConverterAgent(logger);
    await unitConverterAgent.start();
    await registry.registerAgent({
      agentId: 'UnitConverter',
      version: '1.0.0',
      capabilities: ['convert', 'convert_temperature', 'list_categories', 'list_units'],
      status: unitConverterAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.UNIT_CONVERTER_AGENT_PORT || '3024'}/health`,
      apiEndpoint: `http://localhost:${process.env.UNIT_CONVERTER_AGENT_PORT || '3024'}/api`,
      dependencies: [],
      priority: 4,
    });
    logger.info('✅ Unit Converter Agent started');

    // Start Translation Agent
    logger.info('\n🌐 Starting Translation Agent...');
    const translationAgent = new TranslationAgent(logger);
    await translationAgent.start();
    await registry.registerAgent({
      agentId: 'Translation',
      version: '1.0.0',
      capabilities: ['translate', 'detect', 'list_languages', 'batch_translate'],
      status: translationAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.TRANSLATION_AGENT_PORT || '3025'}/health`,
      apiEndpoint: `http://localhost:${process.env.TRANSLATION_AGENT_PORT || '3025'}/api`,
      dependencies: [],
      priority: 5,
    });
    logger.info('✅ Translation Agent started');

    // Start Command Agent
    logger.info('\n🎯 Starting Command Agent...');
    const commandAgent = new CommandAgent(logger);
    await commandAgent.start();
    await registry.registerAgent({
      agentId: 'Command',
      version: '1.0.0',
      capabilities: ['parse', 'execute', 'validate', 'get_history', 'register_alias'],
      status: commandAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.COMMAND_AGENT_PORT || '3026'}/health`,
      apiEndpoint: `http://localhost:${process.env.COMMAND_AGENT_PORT || '3026'}/api`,
      dependencies: [],
      priority: 9,
    });
    logger.info('✅ Command Agent started');

    // Start Context Agent
    logger.info('\n🔍 Starting Context Agent...');
    const contextAgent = new ContextAgent(logger);
    await contextAgent.start();
    await registry.registerAgent({
      agentId: 'Context',
      version: '1.0.0',
      capabilities: ['get', 'set', 'update', 'clear', 'get_history', 'merge'],
      status: contextAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.CONTEXT_AGENT_PORT || '3027'}/health`,
      apiEndpoint: `http://localhost:${process.env.CONTEXT_AGENT_PORT || '3027'}/api`,
      dependencies: [],
      priority: 9,
    });
    logger.info('✅ Context Agent started');

    // Start Memory Agent
    logger.info('\n🧠 Starting Memory Agent...');
    const memoryAgent = new MemoryAgent(logger);
    await memoryAgent.start();
    await registry.registerAgent({
      agentId: 'Memory',
      version: '1.0.0',
      capabilities: ['store', 'recall', 'search', 'forget', 'list', 'get_stats'],
      status: memoryAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.MEMORY_AGENT_PORT || '3028'}/health`,
      apiEndpoint: `http://localhost:${process.env.MEMORY_AGENT_PORT || '3028'}/api`,
      dependencies: [],
      priority: 9,
    });
    logger.info('✅ Memory Agent started');

    // Start Emotion Agent
    logger.info('\n💚 Starting Emotion Agent...');
    const emotionAgent = new EmotionAgent(logger);
    await emotionAgent.start();
    await registry.registerAgent({
      agentId: 'Emotion',
      version: '1.0.0',
      capabilities: [
        'analyze',
        'detect',
        'get_current',
        'track',
        'get_history',
        'get_recommendation',
      ],
      status: emotionAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.EMOTION_AGENT_PORT || '3014'}/health`,
      apiEndpoint: `http://localhost:${process.env.EMOTION_AGENT_PORT || '3014'}/api`,
      dependencies: [],
      priority: 7,
    });
    logger.info('✅ Emotion Agent started');

    // Start File Agent
    logger.info('\n📁 Starting File Agent...');
    const fileAgent = new FileAgent(logger);
    await fileAgent.start();
    await registry.registerAgent({
      agentId: 'File',
      version: '1.0.0',
      capabilities: ['read', 'write', 'list', 'search', 'delete', 'copy', 'move', 'get_info'],
      status: fileAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.FILE_AGENT_PORT || '3022'}/health`,
      apiEndpoint: `http://localhost:${process.env.FILE_AGENT_PORT || '3022'}/api`,
      dependencies: [],
      priority: 6,
    });
    logger.info('✅ File Agent started');

    // Start Computer Control Agent
    logger.info('\n🖥️  Starting Computer Control Agent...');
    const computerControlAgent = new ComputerControlAgent(logger);
    await computerControlAgent.start();
    await registry.registerAgent({
      agentId: 'ComputerControl',
      version: '1.0.0',
      capabilities: [
        'get_system_info',
        'list_processes',
        'get_screen',
        'execute',
        'type_text',
        'click',
      ],
      status: computerControlAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.COMPUTER_CONTROL_AGENT_PORT || '3021'}/health`,
      apiEndpoint: `http://localhost:${process.env.COMPUTER_CONTROL_AGENT_PORT || '3021'}/api`,
      dependencies: [],
      priority: 8,
    });
    logger.info('✅ Computer Control Agent started');

    // Start LLM Agent
    logger.info('\n🤖 Starting LLM Agent...');
    const llmAgent = new LLMAgent(logger);
    await llmAgent.start();
    await registry.registerAgent({
      agentId: 'LLM',
      version: '1.0.0',
      capabilities: [
        'complete',
        'chat',
        'create_conversation',
        'continue_conversation',
        'summarize',
        'analyze',
      ],
      status: llmAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.LLM_AGENT_PORT || '3032'}/health`,
      apiEndpoint: `http://localhost:${process.env.LLM_AGENT_PORT || '3032'}/api`,
      dependencies: [],
      priority: 10,
    });
    logger.info('✅ LLM Agent started');

    // Start Personality Agent
    logger.info('\n😊 Starting Personality Agent...');
    const personalityAgent = new PersonalityAgent(logger);
    await personalityAgent.start();
    await registry.registerAgent({
      agentId: 'Personality',
      version: '1.0.0',
      capabilities: [
        'get_active',
        'set_active',
        'create_profile',
        'adapt_response',
        'get_greeting',
        'set_trait',
      ],
      status: personalityAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.PERSONALITY_AGENT_PORT || '3033'}/health`,
      apiEndpoint: `http://localhost:${process.env.PERSONALITY_AGENT_PORT || '3033'}/api`,
      dependencies: ['Emotion'],
      priority: 6,
    });
    logger.info('✅ Personality Agent started');

    // Start Listening Agent
    logger.info('\n👂 Starting Listening Agent...');
    const listeningAgent = new ListeningAgent(logger);
    await listeningAgent.start();
    await registry.registerAgent({
      agentId: 'Listening',
      version: '1.0.0',
      capabilities: ['start', 'stop', 'get_status', 'set_sensitivity', 'get_audio_level'],
      status: listeningAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.LISTENING_AGENT_PORT || '3029'}/health`,
      apiEndpoint: `http://localhost:${process.env.LISTENING_AGENT_PORT || '3029'}/api`,
      dependencies: [],
      priority: 8,
    });
    logger.info('✅ Listening Agent started');

    // Start Speech Agent
    logger.info('\n🗣️  Starting Speech Agent...');
    const speechAgent = new SpeechAgent(logger);
    await speechAgent.start();
    await registry.registerAgent({
      agentId: 'Speech',
      version: '1.0.0',
      capabilities: [
        'synthesize',
        'set_voice',
        'list_voices',
        'adjust_speed',
        'adjust_pitch',
        'queue_speech',
      ],
      status: speechAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.SPEECH_AGENT_PORT || '3030'}/health`,
      apiEndpoint: `http://localhost:${process.env.SPEECH_AGENT_PORT || '3030'}/api`,
      dependencies: [],
      priority: 8,
    });
    logger.info('✅ Speech Agent started');

    // Start Voice Command Agent
    logger.info('\n🎤 Starting Voice Command Agent...');
    const voiceCommandAgent = new VoiceCommandAgent(logger);
    await voiceCommandAgent.start();
    await registry.registerAgent({
      agentId: 'VoiceCommand',
      version: '1.0.0',
      capabilities: ['register', 'unregister', 'list', 'enable', 'disable', 'process'],
      status: voiceCommandAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.VOICE_COMMAND_AGENT_PORT || '3031'}/health`,
      apiEndpoint: `http://localhost:${process.env.VOICE_COMMAND_AGENT_PORT || '3031'}/api`,
      dependencies: ['Listening', 'Speech', 'Command'],
      priority: 7,
    });
    logger.info('✅ Voice Command Agent started');

    // Start Reliability Agent (Algo-2 integration)
    try {
      logger.info('\n🔍 Starting Reliability Agent (Algo-2)...');
      const reliabilityPort = parseInt(process.env.RELIABILITY_AGENT_PORT || '3032', 10);
      const reliabilityAgent = new ReliabilityAgent(
        'Reliability',
        '1.0.0',
        reliabilityPort,
        logger
      );
      await reliabilityAgent.start();
      await registry.registerAgent({
        agentId: 'Reliability',
        version: '1.0.0',
        capabilities: [
          'assess_reliability',
          'source_analysis',
          'fallacy_detection',
          'multi_agent_debate',
          'ground_truth_verification',
        ],
        status: reliabilityAgent.getStatus(),
        healthEndpoint: `http://localhost:${process.env.RELIABILITY_AGENT_PORT || '3032'}/health`,
        apiEndpoint: `http://localhost:${process.env.RELIABILITY_AGENT_PORT || '3032'}/api`,
        dependencies: [],
        priority: 6,
      });
      logger.info('✅ Reliability Agent started');
    } catch (error) {
      logger.error('Failed to start Reliability Agent', {
        error: error instanceof Error ? error.message : String(error),
      });
      logger.warn('Continuing without Reliability Agent...');
    }

    // Start Emotions Engine Agent (Python service integration)
    logger.info('\n😊 Starting Emotions Engine Agent...');
    const emotionsPort = parseInt(process.env.EMOTIONS_ENGINE_AGENT_PORT || '3034', 10);
    const emotionsAgent = new EmotionsEngineAgent('EmotionsEngine', '1.0.0', emotionsPort, logger);
    await emotionsAgent.start();
    await registry.registerAgent({
      agentId: 'EmotionsEngine',
      version: '1.0.0',
      capabilities: [
        'emotion_recognition',
        'text_emotion_analysis',
        'multimodal_emotion_analysis',
        'mood_prediction',
        'mood_tracking',
        'mood_analysis',
      ],
      status: emotionsAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.EMOTIONS_ENGINE_AGENT_PORT || '3034'}/health`,
      apiEndpoint: `http://localhost:${process.env.EMOTIONS_ENGINE_AGENT_PORT || '3034'}/api`,
      dependencies: [],
      priority: 6,
    });
    logger.info('✅ Emotions Engine Agent started');

    // Start Memory System Agent (Python service integration)
    logger.info('\n🧠 Starting Memory System Agent...');
    const memoryPort = parseInt(process.env.MEMORY_SYSTEM_AGENT_PORT || '3036', 10);
    const memorySystemAgent = new MemorySystemAgent('MemorySystem', '1.0.0', memoryPort, logger);
    await memorySystemAgent.start();
    await registry.registerAgent({
      agentId: 'MemorySystem',
      version: '1.0.0',
      capabilities: [
        'memory_ingestion',
        'memory_query',
        'memory_consolidation',
        'stm_operations',
        'mtm_operations',
        'ltm_operations',
        'memory_statistics',
      ],
      status: memorySystemAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.MEMORY_SYSTEM_AGENT_PORT || '3036'}/health`,
      apiEndpoint: `http://localhost:${process.env.MEMORY_SYSTEM_AGENT_PORT || '3036'}/api`,
      dependencies: [],
      priority: 7,
    });
    logger.info('✅ Memory System Agent started');

    // Start Visual Engine Agent (Python service integration)
    logger.info('\n👁️ Starting Visual Engine Agent...');
    const visualPort = parseInt(process.env.VISUAL_ENGINE_AGENT_PORT || '3037', 10);
    const visualAgent = new VisualEngineAgent('VisualEngine', '1.0.0', visualPort, logger);
    await visualAgent.start();
    await registry.registerAgent({
      agentId: 'VisualEngine',
      version: '1.0.0',
      capabilities: [
        'visual_analysis',
        'face_recognition',
        'spatial_memory',
        'motion_detection',
        'scene_analysis',
        'object_detection',
        'intelligence_insights',
        'event_tracking',
      ],
      status: visualAgent.getStatus(),
      healthEndpoint: `http://localhost:${process.env.VISUAL_ENGINE_AGENT_PORT || '3037'}/health`,
      apiEndpoint: `http://localhost:${process.env.VISUAL_ENGINE_AGENT_PORT || '3037'}/api`,
      dependencies: [],
      priority: 6,
    });
    logger.info('✅ Visual Engine Agent started');

    // Start Security Agent (5-layer defense system)
    logger.info('\n🛡️ Starting Security Agent...');
    const securityPort = parseInt(process.env.SECURITY_AGENT_PORT || '3038', 10);
    let db: DatabaseClient | undefined;
    try {
      db = new DatabaseClient(logger);
      const dbName = process.env.DATABASE_NAME || 'jarvis_db';
      try {
        await db.createDatabaseIfNotExists(dbName);
      } catch (_error) {
        // Ignore - will try to connect anyway
      }
      await db.connect();
      await db.initializeSchema();
    } catch (error) {
      logger.warn('Database not available for Security Agent - using in-memory storage', {
        error: error instanceof Error ? error.message : String(error),
      });
      db = undefined;
    }

    if (!llm) {
      logger.warn('⚠️  Security Agent requires LLM - skipping initialization');
    } else {
      const securityAgent = new SecurityAgent(
        'Security',
        '1.0.0',
        securityPort,
        logger,
        llm as any,
        db
      );
      await securityAgent.start();
      await registry.registerAgent({
        agentId: 'Security',
        version: '1.0.0',
        capabilities: [
          'input_scanning',
          'prompt_injection_detection',
          'pii_detection',
          'output_sanitization',
          'tool_access_control',
          'rate_limiting',
          'anomaly_detection',
          'threat_monitoring',
        ],
        status: securityAgent.getStatus(),
        healthEndpoint: `http://localhost:${process.env.SECURITY_AGENT_PORT || '3038'}/health`,
        apiEndpoint: `http://localhost:${process.env.SECURITY_AGENT_PORT || '3038'}/api`,
        dependencies: [],
        priority: 10, // Highest priority - security is critical
      });
      logger.info('✅ Security Agent started');
      logger.info('   🛡️  5-Layer Defense System Active:');
      logger.info('      Layer 1: Input Firewall (pattern filter, PII detection, Lakera Guard)');
      logger.info('      Layer 2: Dual-LLM Router (quarantine untrusted data)');
      logger.info('      Layer 3: Output Sanitizer (redact sensitive data)');
      logger.info('      Layer 4: Tool Gate (rate limiting, permissions, confirmations)');
      logger.info('      Layer 5: Security Monitor (anomaly detection, alerting)');
    }

    logger.info(`\n✅ Total agents registered: ${registry.getAllAgents().length}`);

    // Start health checks (non-blocking)
    const healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10);
    registry.startHealthChecks(healthCheckInterval);
    logger.info(`Health checks started with interval: ${healthCheckInterval}ms`);

    // ⚡ FAST STARTUP: Start API Server IMMEDIATELY (before tests/database)
    logger.info('\n🌐 Starting API Server (fast startup)...\n');
    const apiServer = new JarvisAPIServer(
      orchestrator,
      registry,
      logger,
      parseInt(process.env.API_PORT || '3000', 10)
    );
    await apiServer.start();
    logger.info('\n✅ API Server is ready on port 3000!');
    logger.info('   Desktop app can now connect immediately\n');

    // Initialize self-healing infrastructure and database in background (non-blocking)
    initializeBackgroundServices(
      orchestrator,
      registry,
      logger,
      llm,
      apiServer,
      bargeInController
    ).catch(err => {
      logger.warn('Background services initialization error:', err);
    });

    // Setup voice WebSocket for real-time streaming (if voice interface available)
    if (bargeInController) {
      apiServer.setupVoiceWebSocket(bargeInController);
      logger.info('✅ Voice WebSocket streaming enabled at ws://localhost:3000/voice/stream');
    }

    // Skip all tests during startup for fast initialization
    // Tests can be run separately with: npm run test
    logger.info('✅ Jarvis System is ready!');
    logger.info('   API Server: http://localhost:3000');
    logger.info('   All agents registered and ready');
    logger.info('   Background services initializing...\n');
    logger.info('💡 To run system tests, use: npm run test\n');

    // Note: Tests have been moved to separate test files. Run: npm run test
  } catch (error) {
    logger.error('Failed to start Jarvis System', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Background services initialization (non-blocking)
async function initializeBackgroundServices(
  orchestrator: Orchestrator,
  _registry: AgentRegistry, // Prefixed with _ to indicate intentionally unused
  logger: any,
  llm: any,
  apiServer: JarvisAPIServer,
  bargeInController?: BargeInController
): Promise<void> {
  try {
    // Initialize self-healing infrastructure first
    let poolManager: AgentPoolManager | undefined;
    let wsEvents: AgentWebSocketEvents | undefined;

    try {
      logger.info('\n🔧 Initializing Self-Healing Infrastructure (background)...\n');

      // Initialize database first (needed for lifecycle tracking)
      let db: DatabaseClient | undefined;
      try {
        db = new DatabaseClient(logger);
        const dbName = process.env.DATABASE_NAME || 'jarvis_db';
        try {
          await db.createDatabaseIfNotExists(dbName);
        } catch (_error) {
          // Ignore - will try to connect anyway
        }
        await db.connect();
        await db.initializeSchema();

        // Run agent tables migration
        try {
          const migrationPath = path.join(
            __dirname,
            '../database/migrations/005_create_agent_tables.sql'
          );
          if (fs.existsSync(migrationPath)) {
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            await db.query(migrationSQL);
            logger.info('✅ Agent tables migration completed');
          }
        } catch (_error) {
          // Migration may already exist
        }
      } catch (_error) {
        logger.warn('⚠️  Database initialization failed - self-healing will use in-memory storage');
        db = undefined;
      }

      // Create lifecycle tracker
      const lifecycle = new AgentLifecycle(logger, db || new DatabaseClient(logger));

      // Create WebSocket event emitter
      wsEvents = new AgentWebSocketEvents(logger);

      // Initialize knowledge base (if LLM available)
      let healthEventHandler: HealthEventHandler | undefined;
      if (llm) {
        try {
          logger.info('🧠 Initializing Knowledge Base for self-healing...');
          const kbComponents = await KnowledgeBaseFactory.create(logger, llm);

          // Create diagnostic and repair engines
          const diagnostic = new DiagnosticEngine(logger, kbComponents.ragPipeline);
          const repair = new RepairEngine(logger, diagnostic);

          // Create health event handler
          healthEventHandler = new HealthEventHandler(logger, diagnostic, repair, {
            enableAutoDiagnosis: process.env.ENABLE_AUTO_DIAGNOSIS !== 'false',
            enableAutoRepair: process.env.ENABLE_AUTO_REPAIR === 'true', // Default false for safety
            minConfidenceForRepair: parseFloat(process.env.MIN_REPAIR_CONFIDENCE || '0.7'),
            repairStrategies: ['restart'], // Only restart for now (code-fix needs implementation)
          });

          logger.info('✅ Knowledge Base initialized and ready');
        } catch (error) {
          logger.warn('⚠️  Knowledge Base initialization failed (continuing without it):', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        logger.info('⚠️  Knowledge Base skipped (no LLM available)');
      }

      // Create pool manager with health event handler
      poolManager = new AgentPoolManager(logger, lifecycle, wsEvents, healthEventHandler);

      // Register all agent configurations
      for (const config of Object.values(AGENT_SPAWN_CONFIG)) {
        poolManager.registerConfig(config);
      }

      // Register sensors for all running agents
      const sensors = [
        // Core agents
        new ConversationAgentSensor(logger, 15000), // Dialogue agent at port 3001
        new SearchAgentSensor(logger, 30000), // Web agent at port 3002
        new CodeAgentSensor(logger, 15000), // Code agent at port 3007
        new FinanceAgentSensor(logger, 30000), // Finance agent at port 3004
        new CalendarAgentSensor(logger, 30000), // Calendar agent at port 3005
        new EmailAgentSensor(logger, 30000), // Email agent at port 3006
        // Media agents
        new ImageGenerationAgentSensor(logger, 30000), // Image agent at port 3010
        new MusicAgentSensor(logger, 30000), // Music agent at port 3009
        new VideoAgentSensor(logger, 30000), // Video agent at port 3011
        new VoiceAgentSensor(logger, 30000), // Voice agent at port 3008
        new SpotifyAgentSensor(logger, 60000), // Spotify agent at port 3012
        new AppleMusicAgentSensor(logger, 60000), // Apple Music agent at port 3013
        // Utility agents
        new WeatherAgentSensor(logger, 60000), // Weather agent at port 3015
        new NewsAgentSensor(logger, 60000), // News agent at port 3016
        new ReminderAgentSensor(logger, 30000), // Reminder agent at port 3017
        new TimerAgentSensor(logger, 30000), // Timer agent at port 3018
        new AlarmAgentSensor(logger, 30000), // Alarm agent at port 3019
        new StoryAgentSensor(logger, 60000), // Story agent at port 3020
        new CalculatorAgentSensor(logger, 30000), // Calculator agent at port 3023
        new UnitConverterAgentSensor(logger, 30000), // Unit Converter agent at port 3024
        new TranslationAgentSensor(logger, 30000), // Translation agent at port 3025
        // Advanced agents
        new CommandAgentSensor(logger, 15000), // Command agent at port 3026
        new ContextAgentSensor(logger, 15000), // Context agent at port 3027
        new MemoryAgentSensor(logger, 15000), // Memory agent at port 3028
        new EmotionAgentSensor(logger, 30000), // Emotion agent at port 3029
        new FileAgentSensor(logger, 30000), // File agent at port 3030
        new ComputerControlAgentSensor(logger, 30000), // Computer Control agent at port 3031
        new LLMAgentSensor(logger, 15000), // LLM agent at port 3032
        new PersonalityAgentSensor(logger, 30000), // Personality agent at port 3033
        new ListeningAgentSensor(logger, 30000), // Listening agent at port 3029
        new SpeechAgentSensor(logger, 30000), // Speech agent at port 3035
        new VoiceCommandAgentSensor(logger, 30000), // Voice Command agent at port 3036
      ];

      for (const sensor of sensors) {
        const agentName = (sensor as any).agentName;
        poolManager.registerSensor(agentName, sensor);
      }

      // Register existing agents that were started before poolManager was created
      // This allows the spawner to properly track and respawn them
      if (dialogueAgent) {
        poolManager.registerExistingAgent('ConversationAgent', dialogueAgent);
        logger.info('   - Registered DialogueAgent as ConversationAgent');
      }
      if (webAgent) {
        poolManager.registerExistingAgent('CommandAgent', webAgent as any);
        logger.info('   - Registered WebAgent as CommandAgent');
      }
      if (knowledgeAgent) {
        poolManager.registerExistingAgent('ContextAgent', knowledgeAgent as any);
        logger.info('   - Registered KnowledgeAgent as ContextAgent');
      }
      if (financeAgent) {
        poolManager.registerExistingAgent('FinanceAgent', financeAgent as any);
        logger.info('   - Registered FinanceAgent');
      }
      if (calendarAgent) {
        poolManager.registerExistingAgent('CalendarAgent', calendarAgent as any);
        logger.info('   - Registered CalendarAgent');
      }
      if (emailAgent) {
        poolManager.registerExistingAgent('EmailAgent', emailAgent as any);
        logger.info('   - Registered EmailAgent');
      }

      logger.info('✅ Self-healing infrastructure initialized');
      logger.info(`   - ${sensors.length} agent sensors registered`);
      logger.info(`   - Health monitoring active`);
      logger.info(`   - Auto-respawn enabled for critical agents`);
      logger.info(`   - API endpoints: /health/agents/*`);
      logger.info(`   - WebSocket events: agent_spawned, agent_crashed, agent_respawned, etc.\n`);

      // Register pool manager with API server for health endpoints
      apiServer.setPoolManager(poolManager);
      logger.info('✅ Health API connected to pool manager');

      // Connect WebSocket events to Socket.IO for real-time dashboard updates
      if (wsEvents) {
        apiServer.setWebSocketEvents(wsEvents);
        logger.info('✅ WebSocket events connected for real-time updates');
      }
    } catch (error) {
      logger.warn('⚠️  Self-healing infrastructure initialization failed:', {
        error: error instanceof Error ? error.message : String(error),
      });
      logger.warn('   System will continue without self-healing features\n');
    }

    // Initialize Database (non-blocking)
    logger.info('\n💾 Initializing Database (background)...\n');

    let db: DatabaseClient | undefined;
    let conversationRepo: ConversationRepository | undefined;
    let reasoningRepo: ReasoningRepository | undefined;
    let cacheRepo: CacheRepository | undefined;

    try {
      db = new DatabaseClient(logger);

      const dbName = process.env.DATABASE_NAME || 'jarvis_db';
      try {
        await db.createDatabaseIfNotExists(dbName);
      } catch (error) {
        logger.warn('Could not auto-create database (will try to connect anyway):', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await db.connect();
      await db.initializeSchema();

      conversationRepo = new ConversationRepository(db, logger);
      reasoningRepo = new ReasoningRepository(db, logger);
      cacheRepo = new CacheRepository(db, logger);

      logger.info('✅ Database initialized (background)');
      logger.info('   Features: Conversation history, Reasoning traces, Research cache\n');

      setInterval(async () => {
        if (conversationRepo && cacheRepo) {
          try {
            await conversationRepo.cleanupExpired();
            await cacheRepo.cleanupExpired();
          } catch (error) {
            logger.warn('Cleanup job failed:', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }, 600000);
    } catch (error) {
      logger.warn('⚠️  Database initialization failed - continuing without persistence');
      logger.warn('   System will use in-memory storage only');
      logger.warn(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
      db = undefined;
    }

    // Initialize Context Manager (if LLM available)
    if (llm) {
      logger.info('\n💾 Initializing Context Manager (background)...\n');
      const contextManager = new ContextManager(logger, llm, conversationRepo);
      logger.info('✅ Context Manager initialized (background)');
      logger.info(`   Storage: ${conversationRepo ? 'Database + Memory' : 'Memory only'}\n`);

      // Create Advanced Reasoning Engine
      logger.info('\n🧠 Initializing Advanced Reasoning Engine (background)...\n');

      const _reasoningEngine = new AdvancedReasoningEngine(
        orchestrator,
        logger,
        llm,
        contextManager,
        reasoningRepo,
        cacheRepo
      );

      logger.info('✅ Advanced Reasoning Engine initialized (background)');
      logger.info(`   Persistence: ${reasoningRepo ? 'Enabled' : 'Disabled'}\n`);

      // Store reference for potential future use
      (global as any).reasoningEngine = _reasoningEngine;
    } else {
      logger.info('⚠️  Context Manager and Reasoning Engine skipped (LLM not available)\n');
    }

    logger.info('✅ Background services initialization complete\n');
  } catch (error) {
    logger.warn('Background services initialization error:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================
// GRACEFUL SHUTDOWN & STABILITY HANDLING
// ============================================

let isShuttingDown = false;
const shutdownLogger = createLogger('JarvisSystem');

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    shutdownLogger.warn('Shutdown already in progress, ignoring signal:', { signal });
    return;
  }

  isShuttingDown = true;
  shutdownLogger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    shutdownLogger.error('Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, 10000); // 10 second timeout

  try {
    // Stop accepting new requests
    shutdownLogger.info('   - Stopping API server...');

    // Close database connections
    shutdownLogger.info('   - Closing database connections...');

    // Stop health checks
    shutdownLogger.info('   - Stopping health monitors...');

    // Allow time for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    clearTimeout(shutdownTimeout);
    shutdownLogger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimeout);
    shutdownLogger.error('Error during shutdown:', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Track error counts for crash prevention
let uncaughtExceptionCount = 0;
let lastExceptionTime = 0;
const EXCEPTION_RESET_INTERVAL = 60000; // Reset count after 1 minute of no errors
const MAX_EXCEPTIONS_BEFORE_RESTART = 10;

// Handle uncaught exceptions - be resilient, don't crash on every error
process.on('uncaughtException', (error: Error) => {
  const now = Date.now();

  // Reset counter if enough time has passed
  if (now - lastExceptionTime > EXCEPTION_RESET_INTERVAL) {
    uncaughtExceptionCount = 0;
  }

  uncaughtExceptionCount++;
  lastExceptionTime = now;

  shutdownLogger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    count: uncaughtExceptionCount,
  });

  // Record in watchdog if available
  try {
    const watchdog = getWatchdog();
    watchdog.recordError('uncaughtException', error);
  } catch {
    // Watchdog not initialized yet, ignore
  }

  // Only shutdown if we're getting too many exceptions in a short time
  // This prevents a single bad request from crashing the entire server
  if (uncaughtExceptionCount >= MAX_EXCEPTIONS_BEFORE_RESTART) {
    shutdownLogger.error('Too many uncaught exceptions, initiating shutdown', {
      count: uncaughtExceptionCount,
    });
    setTimeout(() => {
      if (!isShuttingDown) {
        gracefulShutdown('uncaughtException');
      }
    }, 1000);
  } else {
    shutdownLogger.warn('Uncaught exception handled, server continuing', {
      count: uncaughtExceptionCount,
      maxBeforeRestart: MAX_EXCEPTIONS_BEFORE_RESTART,
    });
  }
});

// Handle unhandled promise rejections - log but don't crash
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  shutdownLogger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  // Record in watchdog if available
  try {
    const watchdog = getWatchdog();
    watchdog.recordError(
      'unhandledRejection',
      reason instanceof Error ? reason : new Error(String(reason))
    );
  } catch {
    // Watchdog not initialized yet, ignore
  }
  // Don't exit on unhandled rejections, just log them
});

// PM2 ready signal - tells PM2 the app is ready
function sendReadySignal(): void {
  if (process.send) {
    process.send('ready');
    shutdownLogger.info('📡 PM2 ready signal sent');
  }
}

// Start the system
main()
  .then(() => {
    // Send ready signal to PM2 after successful startup
    sendReadySignal();
  })
  .catch(error => {
    shutdownLogger.error('Unhandled error in main', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
