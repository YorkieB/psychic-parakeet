import dotenv from 'dotenv';
import path from 'path';
import { LLMAgent } from './src/agents/llm-agent';
import { createLogger, transports, format } from 'winston';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
  ),
  transports: [new transports.Console()]
});

const agent = new LLMAgent(logger);
agent.start().catch((error) => {
  logger.error('Failed to start LLM agent:', error);
  process.exit(1);
});
