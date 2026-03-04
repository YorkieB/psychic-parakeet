import { ListeningAgent } from './agents/listening-agent';
import { LLMAgent } from './agents/llm-agent';
import { PersonalityAgent } from './agents/personality-agent';
import { SpeechAgent } from './agents/speech-agent';
import { VoiceCommandAgent } from './agents/voice-command-agent';
import { AgentRegistry } from './orchestrator/agent-registry';
import { AgentStatus } from './types/agent';
import { createLogger } from './utils/logger';

// Minimal agent config to test VoiceCommand issue
const AGENT_CONFIGS = [
  { id: 'Personality', Agent: PersonalityAgent, port: 3029, priority: 3 },
  { id: 'Listening', Agent: ListeningAgent, port: 3030, priority: 3 },
  { id: 'Speech', Agent: SpeechAgent, port: 3031, priority: 3 },
  { id: 'VoiceCommand', Agent: VoiceCommandAgent, port: 3032, priority: 3 },
  { id: 'LLM', Agent: LLMAgent, port: 3033, priority: 3 },
];

const getAgentCapabilities = (agentId: string): string[] => {
  // Return minimal capabilities
  return [];
};

async function testMinimalSpark() {
  const logger = createLogger('TestMinimalSpark');
  const startTime = Date.now();

  logger.info('🔥 Testing minimal agent startup...\n');

  // Create registry
  const registry = new AgentRegistry(logger);

  // Start agents in parallel
  const agentPromises = AGENT_CONFIGS.map(async config => {
    const agentStartTime = Date.now();

    try {
      // Set port environment variable
      const envVarName =
        config.id
          .replace(/([A-Z])/g, '_$1')
          .toUpperCase()
          .replace(/^_/, '') + '_AGENT_PORT';
      process.env[envVarName] = config.port.toString();

      logger.info(`⚡ Starting ${config.id} (port ${config.port})...`);
      logger.info(`   Environment variable: ${envVarName}=${process.env[envVarName]}`);

      // Create agent
      const agent = new config.Agent(logger);

      // Start agent (start() calls initialize() internally)
      await agent.start();

      const duration = Date.now() - agentStartTime;
      logger.info(`✅ ${config.id} started in ${duration}ms`);

      // Register
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

      return { id: config.id, success: true, duration };
    } catch (error) {
      logger.error(`❌ ${config.id} failed:`, error);
      if (error instanceof Error && error.stack) {
        logger.error(`   Stack: ${error.stack}`);
      }
      throw error;
    }
  });

  // Wait for all agents
  const results = await Promise.allSettled(agentPromises);

  // Report results
  const failed = results.filter(r => r.status === 'rejected');
  const succeeded = results.filter(r => r.status === 'fulfilled');

  logger.info(`\n📊 Results: ${succeeded.length} succeeded, ${failed.length} failed`);

  if (failed.length > 0) {
    logger.error('Failed agents:');
    failed.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`  - ${AGENT_CONFIGS[index].id}: ${result.reason}`);
      }
    });
  }

  const totalDuration = Date.now() - startTime;
  logger.info(`\n⚡ Total time: ${(totalDuration / 1000).toFixed(2)}s`);
}

testMinimalSpark().catch(console.error);
