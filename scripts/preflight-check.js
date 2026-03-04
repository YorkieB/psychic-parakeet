/*
  This script verifies all dependencies are properly configured before starting Jarvis.

  It checks environment variables, database connectivity, port availability, and API keys
  to ensure the system can start successfully without cryptic errors.
*/
require('dotenv').config();
const { Pool } = require('pg');
const net = require('net');
const https = require('https');
const fs = require('fs');
const chalk = require('chalk');

const REQUIRED_ENV_VARS = ['NODE_ENV', 'LOG_LEVEL', 'ORCHESTRATOR_PORT'];

const OPTIONAL_ENV_VARS = [
  'OPENAI_API_KEY',
  'VERTEX_AI_ENDPOINT_URL',
  'BRAVE_API_KEY',
  'DATABASE_URL',
  'CLAUDE_API_KEY',
];

const PORTS_TO_CHECK = Array.from({ length: 37 }, (_, i) => 3000 + i); // 3000-3036

function checkEnvVars() {
  console.log(chalk.cyan('\n🔍 Checking environment variables...'));

  let missing = [];
  let optionalMissing = [];

  // Check required vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional vars but warn if missing
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar]) {
      optionalMissing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error(chalk.red(`❌ Missing required environment variables: ${missing.join(', ')}`));
    console.error(chalk.yellow('💡 Copy .env.example to .env and fill in the values'));
    return false;
  }

  if (optionalMissing.length > 0) {
    console.log(
      chalk.yellow(
        `⚠️  Optional variables not set (system will still start but features may be limited): ${optionalMissing.join(', ')}`
      )
    );
  }

  console.log(chalk.green('✅ Environment variables check passed'));
  return true;
}

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log(chalk.yellow('⚠️  DATABASE_URL not set, skipping database check'));
    return true;
  }

  console.log(chalk.cyan('\n🗄️  Checking database connectivity...'));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    console.log(chalk.green('✅ Database connection successful'));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Database connection failed: ${error.message}`));
    console.error(chalk.yellow('💡 Ensure PostgreSQL is running and DATABASE_URL is correct'));
    return false;
  }
}

function checkPort(port) {
  return new Promise(resolve => {
    const server = net.createServer();

    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });

    server.on('error', () => {
      resolve(false);
    });
  });
}

async function checkPorts() {
  console.log(chalk.cyan('\n🌐 Checking port availability (3000-3036)...'));

  let unavailable = [];

  for (const port of PORTS_TO_CHECK) {
    const isAvailable = await checkPort(port);
    if (!isAvailable) {
      unavailable.push(port);
    }
  }

  if (unavailable.length > 0) {
    console.error(chalk.red(`❌ Ports already in use: ${unavailable.join(', ')}`));
    console.error(chalk.yellow('💡 Stop other services or change port configuration'));
    return false;
  }

  console.log(chalk.green('✅ All required ports are available'));
  return true;
}

async function testAPIKey(service, key, testUrl) {
  if (!key) return true; // Skip if not configured

  return new Promise(resolve => {
    const req = https.get(
      testUrl,
      {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      },
      res => {
        resolve(res.statusCode < 400);
      }
    );

    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function checkAPIKeys() {
  console.log(chalk.cyan('\n🔑 Testing API keys...'));

  const results = [];

  if (process.env.OPENAI_API_KEY) {
    const valid = await testAPIKey(
      'OpenAI',
      process.env.OPENAI_API_KEY,
      'https://api.openai.com/v1/models'
    );
    results.push({ service: 'OpenAI', valid });
  }

  if (process.env.BRAVE_API_KEY) {
    const valid = await testAPIKey(
      'Brave Search',
      process.env.BRAVE_API_KEY,
      'https://api.search.brave.com/res/v1/web/search?q=test'
    );
    results.push({ service: 'Brave Search', valid });
  }

  let allValid = true;
  for (const { service, valid } of results) {
    if (valid) {
      console.log(chalk.green(`✅ ${service} API key is valid`));
    } else {
      console.log(chalk.yellow(`⚠️  ${service} API key is invalid or not working`));
      // Don't fail the preflight check for optional API keys
    }
  }

  if (results.length === 0) {
    console.log(chalk.yellow('⚠️  No API keys configured to test'));
  }

  return allValid;
}

async function checkNodeVersion() {
  console.log(chalk.cyan('\n📦 Checking Node.js version...'));

  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  if (major < 20) {
    console.error(chalk.red(`❌ Node.js ${version} detected. Node.js 20+ is required`));
    return false;
  }

  console.log(chalk.green(`✅ Node.js ${version} is supported`));
  return true;
}

async function main() {
  console.log(chalk.blue.bold('\n🚀 Jarvis Preflight Check'));
  console.log(chalk.gray('Verifying system dependencies...\n'));

  const checks = [
    { name: 'Node Version', fn: checkNodeVersion },
    { name: 'Environment Variables', fn: checkEnvVars },
    { name: 'Database Connectivity', fn: checkDatabase },
    { name: 'Port Availability', fn: checkPorts },
    { name: 'API Keys', fn: checkAPIKeys },
  ];

  let allPassed = true;

  for (const { name, fn } of checks) {
    const passed = await fn();
    if (!passed) {
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allPassed) {
    console.log(chalk.green.bold('🎉 All checks passed! Ready to start Jarvis.'));
    console.log(chalk.gray('\nRun: npm run dev'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold('❌ Some checks failed. Please fix the issues above.'));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
