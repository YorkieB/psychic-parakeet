/*
  Minimal Jarvis startup test with only core agents.
*/
require('dotenv').config();
const { spawn } = require('child_process');

console.log('🚀 Starting minimal Jarvis test...\n');

// Start with just the orchestrator and a few agents
const child = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'pipe',
  env: {
    ...process.env,
    // Limit to just first few agents for testing
    MINIMAL_START: 'true',
  },
});

let buffer = '';
child.stdout.on('data', data => {
  buffer += data.toString();
  process.stdout.write(data);

  // Check for key milestones
  if (buffer.includes('Jarvis API server listening on port 3000')) {
    console.log('\n✅ API Server is ready!');

    // Test the API
    setTimeout(() => {
      const http = require('http');
      http.get('http://localhost:3000/health', res => {
        console.log(`\n✅ Health check responded with status: ${res.statusCode}`);
        child.kill('SIGTERM');
      });
    }, 1000);
  }

  if (buffer.includes('Failed to start')) {
    console.log('\n❌ Startup failed!');
    child.kill('SIGTERM');
  }
});

child.stderr.on('data', data => {
  process.stderr.write(data);
});

child.on('close', code => {
  console.log(`\nProcess exited with code: ${code}`);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Timeout reached, stopping process...');
  child.kill('SIGTERM');
}, 30000);
