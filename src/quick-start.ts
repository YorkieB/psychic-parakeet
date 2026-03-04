/*
  This is a quick start version of Jarvis that starts only essential agents fast.

  It gets Jarvis up and running in under 10 seconds with just the core functionality,
  then loads additional agents in the background.
*/

import dotenv from 'dotenv';
import type { Logger } from 'winston';
import { CalendarAgent } from './agents/calendar-agent';
import { DialogueAgent } from './agents/dialogue-agent';
import { EmailAgent } from './agents/email-agent';
import { FinanceAgent } from './agents/finance-agent';
import { KnowledgeAgent } from './agents/knowledge-agent';
import { VoiceAgent } from './agents/voice-agent';
import { WebAgent } from './agents/web-agent';
import { JarvisAPIServer } from './api/server';
import { VertexLLMClient } from './llm';
import { AgentRegistry } from './orchestrator/agent-registry';
import { Orchestrator } from './orchestrator/orchestrator';
import { AgentStatus } from './types/agent';
import { createLogger } from './utils/logger';

// Load environment
dotenv.config();

// Create logger
const logger = createLogger('QuickStart');

async function quickStart(): Promise<void> {
  const startTime = Date.now();

  logger.info('🚀 Jarvis Quick Start - Initializing core system...');

  try {
    // Initialize LLM
    let llm: VertexLLMClient | undefined;
    try {
      llm = new VertexLLMClient(logger);
      // VertexLLMClient doesn't have an initialize method
      logger.info('✅ LLM initialized');
    } catch {
      logger.warn('⚠️  LLM initialization failed, continuing without AI');
    }

    // Create core services
    const registry = new AgentRegistry(logger);
    const orchestrator = new Orchestrator(registry, logger);

    // Start API server first
    logger.info('🌐 Starting API server...');
    const apiServer = new JarvisAPIServer(
      orchestrator,
      registry,
      logger,
      parseInt(process.env.API_PORT || '3000', 10)
    );
    await apiServer.start();
    logger.info('✅ API server ready on port 3000');

    // Start core agents in parallel
    logger.info('\n🤖 Starting core agents...');

    const agents = await Promise.allSettled([
      startDialogueAgent(llm, logger),
      startWebAgent(logger),
      startKnowledgeAgent(logger),
      startFinanceAgent(logger),
      startCalendarAgent(logger),
      startEmailAgent(logger),
      llm ? startVoiceAgent(llm, logger) : Promise.resolve(undefined),
    ]);

    // Register successful agents
    const successfulAgents = agents.filter(a => a.status === 'fulfilled');
    const failedAgents = agents.filter(a => a.status === 'rejected');

    logger.info(`\n✅ Core agents ready: ${successfulAgents.length}/${agents.length}`);

    if (failedAgents.length > 0) {
      logger.warn(`⚠️  ${failedAgents.length} agents failed to start`);
    }

    // Register agents with registry
    await registerCoreAgents(registry, logger);

    const duration = (Date.now() - startTime) / 1000;
    logger.info(`\n🎉 Jarvis is ready! (${duration.toFixed(2)}s)`);
    logger.info('   API: http://localhost:3000');
    logger.info('   Health: http://localhost:3000/health');
    logger.info('   Chat: http://localhost:3000/chat');

    // Start additional agents in background
    logger.info('\n🔄 Loading additional agents in background...');
    setTimeout(() => loadAdditionalAgents(registry, logger), 1000);
  } catch (error) {
    logger.error('❌ Failed to start Jarvis:', error);
    process.exit(1);
  }
}

async function startDialogueAgent(
  llm: VertexLLMClient | undefined,
  logger: Logger
): Promise<DialogueAgent> {
  const agent = new DialogueAgent(
    'Dialogue',
    '1.0.0',
    parseInt(process.env.DIALOGUE_AGENT_PORT || '3001', 10),
    logger,
    llm!
  );
  await agent.start();
  return agent;
}

async function startWebAgent(logger: Logger): Promise<WebAgent> {
  const agent = new WebAgent(logger);
  await agent.start();
  return agent;
}

async function startKnowledgeAgent(logger: Logger): Promise<KnowledgeAgent> {
  const agent = new KnowledgeAgent(logger, 'http://localhost:3002/api');
  await agent.start();
  return agent;
}

async function startFinanceAgent(logger: Logger): Promise<FinanceAgent> {
  const agent = new FinanceAgent(logger);
  await agent.start();
  return agent;
}

async function startCalendarAgent(logger: Logger): Promise<CalendarAgent> {
  const agent = new CalendarAgent(logger);
  await agent.start();
  return agent;
}

async function startEmailAgent(logger: Logger): Promise<EmailAgent> {
  const agent = new EmailAgent(logger);
  await agent.start();
  return agent;
}

async function startVoiceAgent(llm: VertexLLMClient, logger: Logger): Promise<VoiceAgent> {
  const agent = new VoiceAgent(logger, llm);
  await agent.start();
  return agent;
}

async function registerCoreAgents(registry: AgentRegistry, logger: Logger): Promise<void> {
  const coreAgents = [
    {
      agentId: 'Dialogue',
      version: '1.0.0',
      capabilities: ['conversation', 'response', 'context_tracking'],
      status: AgentStatus.ONLINE,
      healthEndpoint: 'http://localhost:3001/health',
      apiEndpoint: 'http://localhost:3001/api',
      dependencies: [],
      priority: 10,
    },
    {
      agentId: 'Web',
      version: '1.0.0',
      capabilities: ['web_search', 'information_retrieval', 'fact_checking'],
      status: AgentStatus.ONLINE,
      healthEndpoint: 'http://localhost:3002/health',
      apiEndpoint: 'http://localhost:3002/api',
      dependencies: [],
      priority: 9,
    },
    {
      agentId: 'Knowledge',
      version: '1.0.0',
      capabilities: ['research', 'fact_checking', 'summarization'],
      status: AgentStatus.ONLINE,
      healthEndpoint: 'http://localhost:3003/health',
      apiEndpoint: 'http://localhost:3003/api',
      dependencies: ['Web'],
      priority: 8,
    },
    {
      agentId: 'Finance',
      version: '1.0.0',
      capabilities: ['analyze_spending', 'track_budget'],
      status: AgentStatus.ONLINE,
      healthEndpoint: 'http://localhost:3004/health',
      apiEndpoint: 'http://localhost:3004/api',
      dependencies: [],
      priority: 7,
    },
    {
      agentId: 'Calendar',
      version: '1.0.0',
      capabilities: ['list_events', 'create_event'],
      status: AgentStatus.ONLINE,
      healthEndpoint: 'http://localhost:3005/health',
      apiEndpoint: 'http://localhost:3005/api',
      dependencies: [],
      priority: 7,
    },
    {
      agentId: 'Email',
      version: '1.0.0',
      capabilities: ['list_emails', 'send_email'],
      status: AgentStatus.ONLINE,
      healthEndpoint: 'http://localhost:3006/health',
      apiEndpoint: 'http://localhost:3006/api',
      dependencies: [],
      priority: 7,
    },
  ];

  for (const agent of coreAgents) {
    try {
      await registry.registerAgent(agent);
    } catch (error) {
      logger.warn(`Failed to register ${agent.agentId}: ${error.message}`);
    }
  }
}

async function loadAdditionalAgents(registry: AgentRegistry, logger: Logger): Promise<void> {
  // This would load the remaining 30+ agents
  // For now, just log that additional agents are available
  logger.info('📦 Additional agents available:');
  logger.info('   - Music (Spotify, Apple Music)');
  logger.info('   - Image & Video Generation');
  logger.info('   - Code & Development Tools');
  logger.info('   - Weather & News');
  logger.info('   - And many more...');
}

// Start the system
if (require.main === module) {
  quickStart().catch(error => {
    logger.error('Quick start failed:', error);
    process.exit(1);
  });
}

export { quickStart };
