/*
  This file provides a fast startup system for Jarvis using parallel agent initialization.

  It replaces the slow sequential startup with a parallel system that can start
  all agents up to 10x faster, making Jarvis ready for use much quicker.
*/

import type { Logger } from 'winston';
import { AlarmAgent } from './agents/alarm-agent';
import { CalculatorAgent } from './agents/calculator-agent';
import { CalendarAgent } from './agents/calendar-agent';
import { CodeAgent } from './agents/code-agent';
import { DialogueAgent } from './agents/dialogue-agent';
import { EmailAgent } from './agents/email-agent';
import { FinanceAgent } from './agents/finance-agent';
import { KnowledgeAgent } from './agents/knowledge-agent';
import { NewsAgent } from './agents/news-agent';
import { ReminderAgent } from './agents/reminder-agent';
import { TimerAgent } from './agents/timer-agent';
import { TranslationAgent } from './agents/translation-agent';
import { UnitConverterAgent } from './agents/unit-converter-agent';
import { VoiceAgent } from './agents/voice-agent';
import { WeatherAgent } from './agents/weather-agent';
import { WebAgent } from './agents/web-agent';
import type { VertexLLMClient } from './llm';
import { AgentRegistry } from './orchestrator/agent-registry';
import { ParallelAgentStarter } from './parallel-agent-starter';

export async function fastStartJarvis(
  logger: Logger,
  registry: AgentRegistry,
  llm: VertexLLMClient | undefined
): Promise<void> {
  const starter = new ParallelAgentStarter(logger);

  // Core agents that must start first
  const coreAgents = [
    {
      id: 'Dialogue',
      name: 'Dialogue Agent',
      agent: new DialogueAgent(
        'Dialogue',
        '1.0.0',
        parseInt(process.env.DIALOGUE_AGENT_PORT || '3001', 10),
        logger,
        llm!
      ),
      port: parseInt(process.env.DIALOGUE_AGENT_PORT || '3001', 10),
      dependencies: [],
      priority: 10,
      critical: true,
    },
    {
      id: 'Web',
      name: 'Web Agent',
      agent: new WebAgent(logger),
      port: parseInt(process.env.WEB_AGENT_PORT || '3002', 10),
      dependencies: [],
      priority: 9,
      critical: true,
    },
    {
      id: 'Knowledge',
      name: 'Knowledge Agent',
      agent: new KnowledgeAgent(logger, 'http://localhost:3002/api'),
      port: parseInt(process.env.KNOWLEDGE_AGENT_PORT || '3003', 10),
      dependencies: ['Web'],
      priority: 8,
      critical: true,
    },
  ];

  // Utility agents (can start in parallel)
  const utilityAgents = [
    {
      id: 'Finance',
      name: 'Finance Agent',
      agent: new FinanceAgent(logger),
      port: parseInt(process.env.FINANCE_AGENT_PORT || '3004', 10),
      dependencies: [],
      priority: 7,
      critical: false,
    },
    {
      id: 'Calendar',
      name: 'Calendar Agent',
      agent: new CalendarAgent(logger),
      port: parseInt(process.env.CALENDAR_AGENT_PORT || '3005', 10),
      dependencies: [],
      priority: 7,
      critical: false,
    },
    {
      id: 'Email',
      name: 'Email Agent',
      agent: new EmailAgent(logger),
      port: parseInt(process.env.EMAIL_AGENT_PORT || '3006', 10),
      dependencies: [],
      priority: 7,
      critical: false,
    },
    {
      id: 'Code',
      name: 'Code Agent',
      agent: new CodeAgent(logger, llm as any),
      port: parseInt(process.env.CODE_AGENT_PORT || '3007', 10),
      dependencies: [],
      priority: 6,
      critical: false,
    },
    {
      id: 'Voice',
      name: 'Voice Agent',
      agent: new VoiceAgent(logger, llm as any),
      port: parseInt(process.env.VOICE_AGENT_PORT || '3008', 10),
      dependencies: ['Dialogue'],
      priority: 6,
      critical: false,
    },
    {
      id: 'Calculator',
      name: 'Calculator Agent',
      agent: new CalculatorAgent(logger),
      port: parseInt(process.env.CALCULATOR_AGENT_PORT || '3023', 10),
      dependencies: [],
      priority: 5,
      critical: false,
    },
    {
      id: 'UnitConverter',
      name: 'Unit Converter Agent',
      agent: new UnitConverterAgent(logger),
      port: parseInt(process.env.UNIT_CONVERTER_AGENT_PORT || '3024', 10),
      dependencies: [],
      priority: 5,
      critical: false,
    },
    {
      id: 'Translation',
      name: 'Translation Agent',
      agent: new TranslationAgent(logger),
      port: parseInt(process.env.TRANSLATION_AGENT_PORT || '3025', 10),
      dependencies: [],
      priority: 5,
      critical: false,
    },
    {
      id: 'Weather',
      name: 'Weather Agent',
      agent: new WeatherAgent(logger),
      port: parseInt(process.env.WEATHER_AGENT_PORT || '3010', 10),
      dependencies: [],
      priority: 4,
      critical: false,
    },
    {
      id: 'News',
      name: 'News Agent',
      agent: new NewsAgent(logger),
      port: parseInt(process.env.NEWS_AGENT_PORT || '3011', 10),
      dependencies: [],
      priority: 4,
      critical: false,
    },
    {
      id: 'Timer',
      name: 'Timer Agent',
      agent: new TimerAgent(logger),
      port: parseInt(process.env.TIMER_AGENT_PORT || '3012', 10),
      dependencies: [],
      priority: 4,
      critical: false,
    },
    {
      id: 'Alarm',
      name: 'Alarm Agent',
      agent: new AlarmAgent(logger),
      port: parseInt(process.env.ALARM_AGENT_PORT || '3013', 10),
      dependencies: [],
      priority: 4,
      critical: false,
    },
    {
      id: 'Reminder',
      name: 'Reminder Agent',
      agent: new ReminderAgent(logger),
      port: parseInt(process.env.REMINDER_AGENT_PORT || '3014', 10),
      dependencies: [],
      priority: 4,
      critical: false,
    },
  ];

  // Register all agents
  [...coreAgents, ...utilityAgents].forEach(agentConfig => {
    starter.registerAgent(agentConfig);
  });

  // Start all agents in parallel
  await starter.startAll();

  // Register successful agents with the registry
  const stats = starter.getStats();
  for (const agentId of stats.started) {
    // Find the agent config to get registration details
    const config = [...coreAgents, ...utilityAgents].find(a => a.id === agentId);
    if (config) {
      try {
        await registry.registerAgent({
          agentId: config.id,
          version: '1.0.0',
          capabilities: getAgentCapabilities(config.id),
          status: config.agent.getStatus(),
          healthEndpoint: `http://localhost:${config.port}/health`,
          apiEndpoint: `http://localhost:${config.port}/api`,
          dependencies: config.dependencies,
          priority: config.priority,
        });
      } catch (error) {
        logger.warn(`Failed to register ${config.id}: ${error.message}`);
      }
    }
  }

  logger.info(`\n✅ Fast startup complete: ${stats.started.length} agents ready`);
  if (stats.failed.length > 0) {
    logger.warn(`⚠️  ${stats.failed.length} agents failed to start: ${stats.failed.join(', ')}`);
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
    Calculator: ['calculate', 'basic', 'scientific', 'percentage'],
    UnitConverter: ['convert', 'convert_temperature', 'list_categories'],
    Translation: ['translate', 'detect', 'list_languages'],
    Weather: ['get_current', 'get_forecast', 'get_hourly'],
    News: ['get_headlines', 'search', 'get_by_category'],
    Timer: ['start', 'pause', 'resume', 'stop'],
    Alarm: ['create', 'list', 'get', 'update', 'enable', 'disable'],
    Reminder: ['create', 'list', 'get', 'update', 'complete'],
  };

  return capabilities[agentId] || [];
}
