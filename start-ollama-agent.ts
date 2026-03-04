import { OllamaLLMAgent } from './src/agents/ollama-llm-agent';
import { createLogger, transports, format } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
  ),
  transports: [new transports.Console()]
});

const agent = new OllamaLLMAgent('OllamaLLM', '1.0.0', 3030, logger);

agent.start().catch((error) => {
  logger.error('Failed to start Ollama agent:', error);
  process.exit(1);
});
