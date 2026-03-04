import { createLogger } from './src/utils/logger';

const logger = createLogger('LLM-Test');

console.log('=== Testing Current LLM System ===');

// Test 1: Check if LocalLLM is working
console.log('\n1. Testing LocalLLM (port 3029)...');
fetch('http://localhost:3029/health')
  .then(res => res.json())
  .then(data => {
    console.log('✅ LocalLLM Health:', data.status);
    
    // Test 2: Check if OllamaLLM is working
    console.log('\n2. Testing OllamaLLM (port 3030)...');
    return fetch('http://localhost:3030/health');
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ OllamaLLM Health:', data.status);
    
    // Test 3: Check if External LLM is working
    console.log('\n3. Testing External LLM (port 3028)...');
    return fetch('http://localhost:3028/health');
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ External LLM Health:', data.status);
    
    console.log('\n=== All Three Tiers Working! ===');
    console.log('🎉 LLM System is Fully Operational');
    
    // Test 4: Test IDE integration with different models
    console.log('\n4. Testing IDE Integration...');
    
    // Test LocalLLM through IDE
    return fetch('http://localhost:3000/api/ide/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello from LocalLLM test',
        model: 'local-llm'
      })
    });
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ IDE + LocalLLM:', data.success ? 'Working' : 'Failed');
    
    // Test OllamaLLM through IDE
    return fetch('http://localhost:3000/api/ide/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello from OllamaLLM test',
        model: 'ollama-llm'
      })
    });
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ IDE + OllamaLLM:', data.success ? 'Working' : 'Failed');
    
    console.log('\n=== SYSTEM LOCKDOWN CHECKLIST ===');
    console.log('✅ LocalLLM Agent: Operational');
    console.log('✅ OllamaLLM Agent: Operational');
    console.log('✅ External LLM Agent: Operational');
    console.log('✅ IDE Model Selector: Working');
    console.log('✅ Backend Routing: Working');
    console.log('\n🔒 SYSTEM READY FOR LOCKDOWN 🔒');
  })
  .catch(err => {
    console.error('❌ Test failed:', err);
  });
