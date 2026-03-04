/**
 * Jarvis Health Check Monitor
 * ===========================
 *
 * Pings every service port and logs results.
 * If a service is registered in PM2 but not responding,
 * it triggers a PM2 restart for that service.
 *
 * Runs via PM2 on a cron schedule (see ecosystem.config.js).
 *
 * Place this file in: C:\Users\conta\Jarvis Ochestrator\scripts\health-check.js
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Service definitions ──────────────────────────────
const SERVICES = [
  {
    name: 'jarvis-api',
    port: 3000,
    path: '/api/health',        // Falls back to just checking the port if this 404s
    critical: true,             // If this dies, everything is broken
  },
  {
    name: 'jarvis-llm',
    port: 3028,
    path: '/api',
    critical: true,
  },
  {
    name: 'jarvis-ollama',
    port: 3030,
    path: '/api',
    critical: false,            // Nice to have, not a showstopper
  },
  {
    name: 'jarvis-local-llm',
    port: 3029,
    path: '/api',
    critical: false,
    optional: true,             // Might not be started at all
  },
];

// ── Log directory ────────────────────────────────────
const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOG_DIR, 'health-check.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch { /* ignore write errors */ }
}

// ── Port check ───────────────────────────────────────
function checkPort(port, urlPath, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        timeout: timeoutMs,
      },
      (res) => {
        // Any response (even 404) means the port is alive
        resolve({ alive: true, status: res.statusCode });
      }
    );

    req.on('error', () => {
      resolve({ alive: false, status: 0 });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ alive: false, status: 0 });
    });
  });
}

// ── Check if a PM2 process is registered and online ──
function isPm2ProcessOnline(name) {
  try {
    const output = execSync(`pm2 jlist`, { encoding: 'utf8', timeout: 10000 });
    const list = JSON.parse(output);
    const proc = list.find((p) => p.name === name);
    if (!proc) return { registered: false, online: false };
    return {
      registered: true,
      online: proc.pm2_env?.status === 'online',
      restarts: proc.pm2_env?.restart_time || 0,
      uptime: proc.pm2_env?.pm_uptime || 0,
      memory: proc.monit?.memory || 0,
    };
  } catch {
    return { registered: false, online: false };
  }
}

// ── Restart a PM2 process ────────────────────────────
function restartService(name) {
  try {
    log(`⚠️  RESTARTING ${name} via PM2...`);
    execSync(`pm2 restart ${name}`, { encoding: 'utf8', timeout: 15000 });
    log(`✅ ${name} restart command sent`);
    return true;
  } catch (err) {
    log(`❌ Failed to restart ${name}: ${err.message}`);
    return false;
  }
}

// ── Main health check ────────────────────────────────
async function runHealthCheck() {
  log('─── Health Check Started ───');

  const results = [];
  let allHealthy = true;

  for (const service of SERVICES) {
    const pm2Status = isPm2ProcessOnline(service.name);

    // Skip optional services that aren't registered
    if (service.optional && !pm2Status.registered) {
      log(`⏭️  ${service.name} (port ${service.port}) — skipped (optional, not registered)`);
      continue;
    }

    // Check the actual port
    const portCheck = await checkPort(service.port, service.path);

    if (portCheck.alive) {
      const memMB = pm2Status.memory ? `${Math.round(pm2Status.memory / 1024 / 1024)}MB` : '?';
      log(`✅ ${service.name} (port ${service.port}) — UP (status ${portCheck.status}, mem ${memMB}, restarts ${pm2Status.restarts || 0})`);
      results.push({ name: service.name, healthy: true });
    } else {
      allHealthy = false;
      log(`❌ ${service.name} (port ${service.port}) — DOWN`);
      results.push({ name: service.name, healthy: false });

      // If registered in PM2 but not responding, restart it
      if (pm2Status.registered && pm2Status.online) {
        log(`🔄 ${service.name} is online in PM2 but port ${service.port} not responding — restarting`);
        restartService(service.name);
      } else if (pm2Status.registered && !pm2Status.online) {
        log(`🔄 ${service.name} is stopped in PM2 — starting`);
        try {
          execSync(`pm2 start ${service.name}`, { encoding: 'utf8', timeout: 15000 });
        } catch { /* already handled by PM2 */ }
      } else if (!pm2Status.registered && service.critical) {
        log(`🚨 CRITICAL: ${service.name} is not registered in PM2 and port ${service.port} is down!`);
        log(`   Run: pm2 start ecosystem.config.js --only ${service.name}`);
      }
    }
  }

  // ── Check Ollama service itself (not the agent, the actual Ollama) ──
  const ollamaCheck = await checkPort(11434, '/api/tags');
  if (ollamaCheck.alive) {
    log(`✅ Ollama service (port 11434) — UP`);
  } else {
    log(`⚠️  Ollama service (port 11434) — DOWN (run "ollama serve" to start)`);
  }

  // ── Summary ──
  const healthy = results.filter((r) => r.healthy).length;
  const total = results.length;
  const status = allHealthy ? '✅ ALL HEALTHY' : `⚠️  ${total - healthy}/${total} UNHEALTHY`;
  log(`─── Health Check Complete: ${status} ───\n`);

  // ── Write status file for dashboard consumption ──
  const statusFile = path.join(__dirname, '..', 'logs', 'health-status.json');
  try {
    fs.writeFileSync(
      statusFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          allHealthy,
          services: results,
          ollamaRunning: ollamaCheck.alive,
        },
        null,
        2
      )
    );
  } catch { /* ignore */ }
}

// ── Run ──────────────────────────────────────────────
runHealthCheck()
  .then(() => process.exit(0))
  .catch((err) => {
    log(`❌ Health check failed: ${err.message}`);
    process.exit(1);
  });
