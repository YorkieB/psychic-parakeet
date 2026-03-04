/*
  Smart Jarvis startup that handles port conflicts and monitors progress.
*/
require('dotenv').config();
const { spawn } = require('child_process');
const net = require('net');

console.log('🚀 Smart Jarvis Startup\n');

// Check if port is in use
function checkPort(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Kill process on port
async function killPort(port) {
  const { exec } = require('child_process');
  return new Promise(resolve => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (stdout) {
        const match = stdout.match(/LISTENING\s+(\d+)/);
        if (match) {
          const pid = match[1];
          exec(`taskkill /F /PID ${pid}`, resolve);
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  });
}

// Main startup function
async function startJarvis() {
  // Check critical ports
  const ports = [3000, 3001, 3002, 3003];
  let killed = [];

  for (const port of ports) {
    const available = await checkPort(port);
    if (!available) {
      console.log(`⚠️  Port ${port} is in use, killing process...`);
      await killPort(port);
      killed.push(port);
      // Wait a moment for the port to be released
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (killed.length > 0) {
    console.log(`✅ Cleared ports: ${killed.join(', ')}\n`);
  }

  // Start Jarvis with modified environment to speed up startup
  console.log('🚀 Starting Jarvis with optimized startup...\n');

  const child = spawn('cmd', ['/c', 'npm run dev'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Reduce timeouts for faster startup
      HEALTH_CHECK_INTERVAL: '60000',
      // Skip non-critical agents for initial startup
      QUICK_START: 'true',
    },
  });

  let lastLine = '';
  let agentCount = 0;
  const expectedAgents = 10; // Start with core agents

  child.stdout.on('data', data => {
    const output = data.toString();
    process.stdout.write(output);

    // Track agent startup
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Agent started')) {
        agentCount++;
        console.log(`\n📊 Progress: ${agentCount}/${expectedAgents} agents started`);
      }

      if (line.includes('API Server is ready on port 3000')) {
        console.log('\n✅ API Server is ready!');
        console.log('🌐 Testing connection...\n');

        // Test API after a short delay
        setTimeout(() => {
          testAPI();
        }, 2000);
      }

      if (line.includes('Failed to start')) {
        console.log('\n❌ Startup failed!');
        child.kill('SIGTERM');
      }

      lastLine = line;
    }
  });

  child.stderr.on('data', data => {
    process.stderr.write(data);
  });

  child.on('close', code => {
    if (code !== 0 && !lastLine.includes('Jarvis System is ready')) {
      console.log(`\n❌ Process exited with code: ${code}`);
    }
  });

  // Test API function
  function testAPI() {
    const http = require('http');

    http
      .get('http://localhost:3000/health', res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const health = JSON.parse(data);
            console.log('✅ Health check passed!');
            console.log(
              `   Agents online: ${health.data.agents.online}/${health.data.agents.total}`
            );
            console.log(`   Uptime: ${health.data.uptime.toFixed(2)}s\n`);

            // Test chat
            testChat();
          } catch (e) {
            console.log('⚠️  API responding but with invalid data');
          }
        });
      })
      .on('error', () => {
        console.log('⚠️  API not ready yet, will retry...');
        setTimeout(testAPI, 2000);
      });
  }

  // Test chat function
  function testChat() {
    const http = require('http');

    const postData = JSON.stringify({
      message: 'Hello Jarvis',
      userId: 'test-user',
    });

    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Chat endpoint working!');
            console.log('\n🎉 Jarvis is ready for use!');
            console.log('\n📝 Next steps:');
            console.log('   1. Open http://localhost:3000 in your browser');
            console.log('   2. Or start the dashboard: cd dashboard && npm run dev');
            console.log('   3. Or run tests: npm run test:smoke');
          } else {
            console.log(`⚠️  Chat returned status: ${res.statusCode}`);
          }
        });
      }
    );

    req.on('error', error => {
      console.log(`❌ Chat test failed: ${error.message}`);
    });

    req.write(postData);
    req.end();
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping Jarvis...');
    child.kill('SIGTERM');
    process.exit(0);
  });
}

// Start the process
startJarvis().catch(console.error);
