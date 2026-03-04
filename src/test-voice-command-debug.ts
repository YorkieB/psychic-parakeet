import { VoiceCommandAgent } from './agents/voice-command-agent';
import { createLogger } from './utils/logger';

async function testVoiceCommandDebug() {
  const logger = createLogger('TestVoiceCommandDebug');

  // Set environment variable
  process.env.VOICE_COMMAND_AGENT_PORT = '3032';

  try {
    logger.info('Creating VoiceCommandAgent...');
    const agent = new VoiceCommandAgent(logger);
    logger.info('✅ Agent created');

    logger.info('Starting agent (initialize + server + register)...');
    await agent.start();
    logger.info('✅ VoiceCommand started successfully');

    // Clean up
    await agent.stop();
  } catch (error) {
    logger.error('❌ Error:', error);
    console.error('Full error details:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testVoiceCommandDebug().catch(console.error);
