/*
  Test ReliabilityAgent specifically with spark-start parameters.
*/

import { ReliabilityAgent } from './agents/reliability-agent';
import { createLogger } from './utils/logger';

const logger = createLogger('TestReliability');

async function testReliability(): Promise<void> {
  try {
    console.log('Testing ReliabilityAgent with spark-start parameters...');

    // Use exact same parameters as spark-start
    const agent = new ReliabilityAgent('Reliability', '1.0.0', 3034, logger);

    console.log('Agent created, starting...');
    await agent.start();

    console.log('✅ ReliabilityAgent started successfully!');

    // Stop it
    await agent.stop();
    console.log('Agent stopped.');
  } catch (error: any) {
    console.error('❌ Failed to start ReliabilityAgent:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testReliability();
