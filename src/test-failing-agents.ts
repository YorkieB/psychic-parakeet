import { ComputerControlAgent } from './agents/computer-control-agent';
import { ContextAgent } from './agents/context-agent';
import { VideoAgent } from './agents/video-agent';
import { VoiceCommandAgent } from './agents/voice-command-agent';
import { createLogger } from './utils/logger';

const agents = [
  { id: 'Video', port: 3013, Agent: VideoAgent },
  { id: 'Context', port: 3024, Agent: ContextAgent },
  { id: 'VoiceCommand', port: 3032, Agent: VoiceCommandAgent },
  { id: 'ComputerControl', port: 3037, Agent: ComputerControlAgent },
];

async function testFailingAgents() {
  const logger = createLogger('TestFailingAgents');

  // Start agents in parallel like spark-start does
  const results = await Promise.allSettled(
    agents.map(async config => {
      const startTime = Date.now();

      try {
        // Set port environment variable
        process.env[`${config.id.toUpperCase()}_AGENT_PORT`] = config.port.toString();

        logger.info(`⚡ Starting ${config.id} (port ${config.port})...`);

        // Create agent
        const agent = new config.Agent(logger);

        // Start agent (start() calls initialize() internally)
        await agent.start();

        const duration = Date.now() - startTime;
        logger.info(`✅ ${config.id} started in ${duration}ms`);

        return { id: config.id, success: true, duration };
      } catch (error) {
        logger.error(`❌ ${config.id} failed:`, error);
        throw error;
      }
    })
  );

  // Report results
  const failed = results.filter(r => r.status === 'rejected');
  const succeeded = results.filter(r => r.status === 'fulfilled');

  logger.info(`\n📊 Results: ${succeeded.length} succeeded, ${failed.length} failed`);

  if (failed.length > 0) {
    logger.error('\n❌ Failed agents:');
    failed.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`  - ${agents[index].id}: ${result.reason}`);
      }
    });
  }

  // Stop all successful agents
  logger.info('\n🛑 Stopping agents...');
  // Note: We'd need to track the agent instances to properly stop them
}

testFailingAgents().catch(console.error);
