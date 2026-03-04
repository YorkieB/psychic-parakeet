import { createLogger } from './utils/logger';

const agents = [
  { id: 'Video', port: 3013 },
  { id: 'Context', port: 3024 },
  { id: 'VoiceCommand', port: 3032 },
  { id: 'ComputerControl', port: 3037 }
];

async function testParallelEnv() {
  const logger = createLogger('TestParallelEnv');
  
  // Simulate what spark-start does
  const promises = agents.map(async (agent) => {
    // Set environment variable
    process.env[`${agent.id.toUpperCase()}_AGENT_PORT`] = agent.port.toString();
    
    logger.info(`${agent.id}: Set ${agent.id.toUpperCase()}_AGENT_PORT=${process.env[`${agent.id.toUpperCase()}_AGENT_PORT`]}`);
    
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Check the environment variable again
    const current = process.env[`${agent.id.toUpperCase()}_AGENT_PORT`];
    logger.info(`${agent.id}: After delay, ${agent.id.toUpperCase()}_AGENT_PORT=${current}`);
    
    if (current !== agent.port.toString()) {
      logger.error(`${agent.id}: Environment variable was overwritten! Expected ${agent.port}, got ${current}`);
    }
  });
  
  await Promise.all(promises);
  
  logger.info('Final environment variables:');
  agents.forEach(agent => {
    logger.info(`  ${agent.id.toUpperCase()}_AGENT_PORT=${process.env[`${agent.id.toUpperCase()}_AGENT_PORT`]}`);
  });
}

testParallelEnv().catch(console.error);
