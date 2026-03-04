import { VideoAgent } from './agents/video-agent';
import { createLogger } from './utils/logger';

async function testVideoAgent() {
  const logger = createLogger('TestVideoAgent');

  // Set environment variable like spark-start does
  process.env.VIDEO_AGENT_PORT = '3013';

  logger.info('Testing VideoAgent with port 3013...');
  logger.info(`Environment variable VIDEO_AGENT_PORT=${process.env.VIDEO_AGENT_PORT}`);

  try {
    const agent = new VideoAgent(logger);
    logger.info('VideoAgent created successfully');

    await agent.start();
    logger.info('VideoAgent started successfully on port 3013');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    await agent.stop();
    logger.info('VideoAgent stopped successfully');
  } catch (error) {
    logger.error('VideoAgent failed:', error);
    console.error('Full error:', error);
  }
}

testVideoAgent().catch(console.error);
