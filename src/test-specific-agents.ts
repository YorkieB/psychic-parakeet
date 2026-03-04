/*
  Test specific agents that might be failing in spark start.
  Improved version with better error handling and port checks.
*/

import dotenv from 'dotenv';
import net from 'node:net';
import { EmotionsEngineAgent } from './agents/emotions-engine-agent';
import { MemorySystemAgent } from './agents/memory-system-agent';
import { ReliabilityAgent } from './agents/reliability-agent';
import { VisualEngineAgent } from './agents/visual-engine-agent';
import { createLogger } from './utils/logger';

dotenv.config();

const logger = createLogger('TestSpecificAgents');

async function testSpecificAgents(): Promise<void> {
  logger.info('🔍 Testing specific agents...\n');

  const agentsToTest = [
    { id: 'Reliability', Agent: ReliabilityAgent, port: 3034 },
    { id: 'EmotionsEngine', Agent: EmotionsEngineAgent, port: 3035 },
    { id: 'MemorySystem', Agent: MemorySystemAgent, port: 3036 },
    { id: 'VisualEngine', Agent: VisualEngineAgent, port: 3037 },
  ];

  const startedAgents: Array<{ id: string; agent: any }> = [];

  for (const config of agentsToTest) {
    try {
      logger.info(`\nTesting ${config.id} on port ${config.port}...`);

      // Quick port availability check
      const probe = net.createServer();
      await new Promise<void>((resolve, reject) => {
        probe.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${config.port} is already in use by another process`));
          } else {
            reject(err);
          }
        });
        probe.once('listening', () => {
          probe.close(() => resolve());
        });
        probe.listen(config.port);
      });

      // Create agent (add more params if your base class requires them)
      const agent = new config.Agent(config.id, '1.0.0', config.port, logger);

      await agent.start();
      logger.info(`✅ ${config.id} started successfully on port ${config.port}`);

      startedAgents.push({ id: config.id, agent });
    } catch (error: any) {
      logger.error(`❌ ${config.id} failed: ${error.message}`);
      logger.error(`   Stack: ${error.stack || error}`);
    }
  }

  // Graceful cleanup
  logger.info('\nCleaning up started agents...');
  for (const { id, agent } of startedAgents.reverse()) {
    try {
      if (agent.stop) {
        await agent.stop();
        logger.info(`Stopped ${id}`);
      }
    } catch (err: any) {
      logger.warn(`Failed to stop ${id}: ${err.message}`);
    }
  }

  logger.info('\nTest complete.');
}

if (require.main === module) {
  testSpecificAgents().catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });
}
