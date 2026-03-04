/*
  Simple test to verify Jarvis startup and API functionality.
*/
require('dotenv').config();
const http = require('http');

async function testEndpoint(path, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          success: res.statusCode < 400,
          data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 'ERROR',
        success: false,
        error: error.message
      });
    });
    
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve({
        status: 'TIMEOUT',
        success: false,
        error: `Request timed out after ${timeout}ms`
      });
    });
  });
}

async function main() {
  console.log('🔍 Testing Jarvis startup...\n');
  
  // Test basic endpoints
  const endpoints = [
    '/',
    '/health',
    '/agents/status',
    '/chat'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    const result = await testEndpoint(endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint} - Status: ${result.status}`);
      if (result.data) console.log(`   Response: ${result.data}`);
    } else {
      console.log(`❌ ${endpoint} - ${result.error || 'Failed'}`);
    }
    console.log('');
  }
}

main().catch(console.error);
