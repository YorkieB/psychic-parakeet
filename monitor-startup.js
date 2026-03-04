/*
  Monitor Jarvis startup and test API when ready.
*/
require('dotenv').config();
const http = require('http');

console.log('🔍 Monitoring Jarvis startup...\n');

let apiReady = false;
let checkCount = 0;
const maxChecks = 60; // Check for 60 seconds

function checkAPI() {
  checkCount++;
  
  const req = http.get('http://localhost:3000/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const health = JSON.parse(data);
        console.log(`✅ API is ready! (check ${checkCount}/${maxChecks})`);
        console.log(`   Status: ${health.data.status}`);
        console.log(`   Agents: ${health.data.agents.online}/${health.data.agents.total} online`);
        console.log(`   Uptime: ${health.data.uptime.toFixed(2)}s`);
        apiReady = true;
        
        // Test a simple chat
        testChat();
      } catch (e) {
        console.log(`⚠️  API responding but invalid JSON (check ${checkCount}/${maxChecks})`);
      }
    });
  });
  
  req.on('error', () => {
    if (checkCount < maxChecks) {
      process.stdout.write(`.`);
      setTimeout(checkAPI, 1000);
    } else {
      console.log('\n❌ API not ready after 60 seconds');
      process.exit(1);
    }
  });
  
  req.setTimeout(2000, () => {
    req.destroy();
    if (checkCount < maxChecks) {
      process.stdout.write(`.`);
      setTimeout(checkAPI, 1000);
    } else {
      console.log('\n❌ API not ready after 60 seconds');
      process.exit(1);
    }
  });
}

function testChat() {
  console.log('\n📨 Testing chat endpoint...');
  
  const postData = JSON.stringify({
    message: 'Hello Jarvis',
    userId: 'test-user'
  });
  
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Chat endpoint working!');
        console.log(`   Response: ${data.substring(0, 100)}...`);
        console.log('\n🎉 Jarvis is fully operational!');
      } else {
        console.log(`⚠️  Chat returned status: ${res.statusCode}`);
      }
      process.exit(0);
    });
  });
  
  req.on('error', (error) => {
    console.log(`❌ Chat test failed: ${error.message}`);
    process.exit(1);
  });
  
  req.write(postData);
  req.end();
}

// Start checking
checkAPI();
