import { ListeningAgent } from './agents/listening-agent';
import { SpeechAgent } from './agents/speech-agent';
import { VoiceCommandAgent } from './agents/voice-command-agent';
import { createLogger } from './utils/logger';

async function testVoiceCommandParallel() {
  const logger = createLogger('TestVoiceCommandParallel');

  // Set environment variables
  process.env.LISTENING_AGENT_PORT = '3030';
  process.env.SPEECH_AGENT_PORT = '3031';
  process.env.VOICE_COMMAND_AGENT_PORT = '3032';

  // Start dependencies first
  logger.info('Starting dependencies...');

  const listening = new ListeningAgent(logger);
  const speech = new SpeechAgent(logger);

  await listening.start();
  logger.info('✅ Listening agent started');

  await speech.start();
  logger.info('✅ Speech agent started');

  // Now start VoiceCommand
  logger.info('Starting VoiceCommand...');
  try {
    const voiceCommand = new VoiceCommandAgent(logger);
    await voiceCommand.start();
    logger.info('✅ VoiceCommand agent started');

    // Clean up
    await voiceCommand.stop();
    await speech.stop();
    await listening.stop();
  } catch (error) {
    logger.error('❌ VoiceCommand failed:', error);
    console.error('Full error:', error);

    // Still try to clean up
    try {
      await speech.stop();
      await listening.stop();
    } catch {
      // Ignore cleanup errors
    }
  }
}

testVoiceCommandParallel().catch(console.error);
