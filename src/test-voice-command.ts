import { VoiceCommandAgent } from './agents/voice-command-agent';
import { createLogger } from './utils/logger';

async function testVoiceCommand() {
  const logger = createLogger('TestVoiceCommand');

  // Test with the correct environment variable name
  process.env.VOICE_COMMAND_AGENT_PORT = '3032';

  logger.info(`VOICE_COMMAND_AGENT_PORT=${process.env.VOICE_COMMAND_AGENT_PORT}`);

  try {
    const agent = new VoiceCommandAgent(logger);
    logger.info('VoiceCommandAgent created');

    await agent.start();
    logger.info('VoiceCommandAgent started');

    await agent.stop();
    logger.info('VoiceCommandAgent stopped');
  } catch (error) {
    logger.error('Error:', error);
    console.error('Full error:', error);
  }
}

testVoiceCommand().catch(console.error);
