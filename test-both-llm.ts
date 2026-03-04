import { LocalLLMAgent } from './src/agents/local-llm-agent';
import { OllamaLLMAgent } from './src/agents/ollama-llm-agent';
import { createLogger } from './src/utils/logger';

const logger = createLogger('LLM-Test');

console.log('=== Testing LocalLLM Agent ===');
const localAgent = new LocalLLMAgent('LocalLLM', '1.0.0', 3029, logger);

console.log('=== Testing OllamaLLM Agent ===');
const ollamaAgent = new OllamaLLMAgent('OllamaLLM', '1.0.0', 3030, logger);

console.log('=== Starting LocalLLM ===');
localAgent.start().then(() => {
  console.log('LocalLLM started successfully');
  
  console.log('=== Starting OllamaLLM ===');
  return ollamaAgent.start();
}).then(() => {
  console.log('OllamaLLM started successfully');
  console.log('=== Both agents started ===');
  
  // Test both agents
  setTimeout(() => {
    console.log('=== Testing LocalLLM Health ===');
    fetch('http://localhost:3029/health')
      .then(res => res.json())
      .then(data => {
        console.log('LocalLLM Health:', data);
        
        return fetch('http://localhost:3030/health');
      })
      .then(res => res.json())
      .then(data => {
        console.log('OllamaLLM Health:', data);
        
        // Test API endpoints
        return fetch('http://localhost:3029/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'test-1',
            action: 'chat',
            inputs: { messages: [{ role: 'user', content: 'Hello!' }] }
          })
        });
      })
      .then(res => res.json())
      .then(data => {
        console.log('LocalLLM API Response:', data);
        
        return fetch('http://localhost:3030/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'test-2',
            action: 'chat',
            inputs: { messages: [{ role: 'user', content: 'Help me code!' }] }
          })
        });
      })
      .then(res => res.json())
      .then(data => {
        console.log('OllamaLLM API Response:', data);
        console.log('=== All tests passed! ===');
        process.exit(0);
      })
      .catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
      });
  }, 3000);
}).catch(err => {
  console.error('Failed to start agents:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});
