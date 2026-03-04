/**
 * Jarvis PM2 Setup Script
 * =======================
 *
 * Run once to install PM2 and get everything configured.
 * After that, just use `pm2 start ecosystem.config.js`.
 *
 * Usage:
 *   node scripts/pm2-setup.js
 *
 * Place this file in: C:\Users\conta\Jarvis Ochestrator\scripts\pm2-setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(cmd, label) {
  console.log(`\n🔧 ${label}...`);
  console.log(`   > ${cmd}`);
  try {
    const output = execSync(cmd, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
    if (output.trim()) console.log(`   ${output.trim().split('\n').join('\n   ')}`);
    return true;
  } catch (err) {
    console.log(`   ⚠️  ${err.message.split('\n')[0]}`);
    return false;
  }
}

function check(cmd, label) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`   ✅ ${label}: ${output.trim().split('\n')[0]}`);
    return true;
  } catch {
    console.log(`   ❌ ${label}: not found`);
    return false;
  }
}

console.log('╔══════════════════════════════════════════╗');
console.log('║     Jarvis PM2 Setup                     ║');
console.log('╚══════════════════════════════════════════╝');

// ── Step 1: Check prerequisites ──────────────────────
console.log('\n📋 Step 1: Checking prerequisites...');
const hasNode = check('node --version', 'Node.js');
const hasNpm = check('npm --version', 'npm');
const hasTsNode = check('npx ts-node --version', 'ts-node');

if (!hasNode || !hasNpm) {
  console.log('\n❌ Node.js and npm are required. Please install them first.');
  process.exit(1);
}

// ── Step 2: Install PM2 globally ─────────────────────
console.log('\n📋 Step 2: Installing PM2...');
let hasPm2 = check('pm2 --version', 'PM2');
if (!hasPm2) {
  run('npm install -g pm2', 'Installing PM2 globally');
  hasPm2 = check('pm2 --version', 'PM2');
  if (!hasPm2) {
    console.log('\n❌ PM2 installation failed. Try manually: npm install -g pm2');
    process.exit(1);
  }
}

// ── Step 3: Install PM2 Windows startup (optional) ───
console.log('\n📋 Step 3: Windows startup service...');
console.log('   To auto-start PM2 on Windows boot, install pm2-windows-startup:');
console.log('   > npm install -g pm2-windows-startup');
console.log('   > pm2-startup install');
console.log('   (This is optional — skip if you prefer manual starts)');

// ── Step 4: Create logs directory ────────────────────
console.log('\n📋 Step 4: Creating logs directory...');
const logsDir = path.join(ROOT, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`   ✅ Created ${logsDir}`);
} else {
  console.log(`   ✅ ${logsDir} already exists`);
}

// ── Step 5: Verify ecosystem.config.js exists ────────
console.log('\n📋 Step 5: Checking ecosystem.config.js...');
const ecoPath = path.join(ROOT, 'ecosystem.config.js');
if (fs.existsSync(ecoPath)) {
  console.log(`   ✅ Found ${ecoPath}`);
} else {
  console.log(`   ❌ ecosystem.config.js not found in project root!`);
  console.log(`   Copy it from the generated file to: ${ecoPath}`);
  process.exit(1);
}

// ── Step 6: Check Ollama ─────────────────────────────
console.log('\n📋 Step 6: Checking Ollama...');
check('ollama --version', 'Ollama CLI');

// ── Step 7: Kill any existing PM2 processes ──────────
console.log('\n📋 Step 7: Cleaning up old PM2 processes...');
run('pm2 delete all', 'Stopping all existing PM2 processes');

// ── Step 8: Start everything ─────────────────────────
console.log('\n📋 Step 8: Starting Jarvis services...');
const started = run('pm2 start ecosystem.config.js', 'Starting via ecosystem.config.js');

if (started) {
  // Save the process list so PM2 remembers it
  run('pm2 save', 'Saving PM2 process list');

  console.log('\n✅ All done! Your services are running.');
  console.log('\n📊 Useful commands:');
  console.log('   pm2 status              — Quick overview');
  console.log('   pm2 monit               — Live dashboard');
  console.log('   pm2 logs                — Tail all logs');
  console.log('   pm2 logs jarvis-api     — Tail one service');
  console.log('   pm2 restart all         — Restart everything');
  console.log('   pm2 restart jarvis-llm  — Restart one service');
  console.log('   pm2 stop jarvis-ollama  — Stop one service');
  console.log('   pm2 start jarvis-local-llm  — Start the disabled local LLM');
  console.log('   node scripts/health-check.js  — Manual health check');
  console.log('');

  // Show current status
  try {
    const status = execSync('pm2 status', { encoding: 'utf8' });
    console.log(status);
  } catch { /* ignore */ }
} else {
  console.log('\n❌ Failed to start services. Check the logs in /logs/');
}
