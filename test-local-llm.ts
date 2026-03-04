import { LocalLLMAgent } from './src/agents/local-llm-agent';
import { createLogger } from './src/utils/logger';

const logger = createLogger('LocalLLM-Test');

console.log('=== Creating LocalLLM Agent ===');
const agent = new LocalLLMAgent(logger);

console.log('=== Starting Agent ===');
agent
  .start()
  .then(() => {
    console.log('=== Agent Started Successfully ===');
    console.log('Agent should be listening on port 3029');

    // Test health endpoint
    setTimeout(() => {
      console.log('=== Testing Health Endpoint ===');
      fetch('http://localhost:3029/health')
        .then(res => res.json())
        .then(data => {
          console.log('Health check response:', data);
          process.exit(0);
        })
        .catch(err => {
          console.error('Health check failed:', err);
          process.exit(1);
        });
    }, 2000);
  })
  .catch(err => {
    console.error('=== FAILED TO START AGENT ===');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
