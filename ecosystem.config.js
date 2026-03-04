/**
 * PM2 Ecosystem Configuration — Jarvis Orchestrator
 * ==================================================
 *
 * Uses the absolute path to ts-node/register resolved from nvm4w.
 * windowsHide prevents flashing terminal windows.
 *
 * Usage:
 *   pm2 delete all                         # Clean slate
 *   pm2 start ecosystem.config.js          # Start everything
 *   pm2 status                             # Check health
 *   pm2 logs                               # Tail all logs
 *   pm2 monit                              # Live dashboard
 *
 * Place this file in: C:\Users\conta\Jarvis Ochestrator\ecosystem.config.js
 */

const path = require('path');

const PROJECT_ROOT = 'C:\\Users\\conta\\Jarvis Ochestrator';

// Shared config for all TypeScript services
const tsNodeBase = {
  interpreter: 'npx',
  interpreter_args: 'ts-node --transpile-only',
  windowsHide: true,
  autorestart: true,
  watch: false,
  max_restarts: 10,
  min_uptime: '10s',
  restart_delay: 5000,
  exp_backoff_restart_delay: 2000,
  kill_timeout: 10000,
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true,
  cwd: PROJECT_ROOT,
  env: {
    TS_NODE_TRANSPILE_ONLY: 'true',
    TS_NODE_PROJECT: path.join(PROJECT_ROOT, 'tsconfig.json'),
  },
};

module.exports = {
  apps: [
    // ── 1. Main API (port 3000) ─────────────────────────
    {
      ...tsNodeBase,
      name: 'jarvis-api',
      script: 'src/index.ts',
      max_memory_restart: '500M',
      env: {
        ...tsNodeBase.env,
        NODE_ENV: 'development',
        PORT: '3000',
      },
      error_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-api-error.log'),
      out_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-api-out.log'),
    },

    // ── 2. External LLM Agent (port 3028) ───────────────
    {
      ...tsNodeBase,
      name: 'jarvis-llm',
      script: 'src/agents/llm-agent.ts',
      max_memory_restart: '400M',
      env: {
        ...tsNodeBase.env,
        NODE_ENV: 'development',
        PORT: '3028',
      },
      error_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-llm-error.log'),
      out_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-llm-out.log'),
    },

    // ── 3. Ollama Agent (port 3030) ─────────────────────
    {
      ...tsNodeBase,
      name: 'jarvis-ollama',
      script: 'src/agents/ollama-llm-agent.ts',
      max_memory_restart: '300M',
      env: {
        ...tsNodeBase.env,
        NODE_ENV: 'development',
        PORT: '3030',
        OLLAMA_HOST: 'http://localhost:11434',
      },
      error_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-ollama-error.log'),
      out_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-ollama-out.log'),
    },

    // ── 4. Local LLM Agent (port 3029) — disabled ──────
    {
      ...tsNodeBase,
      name: 'jarvis-local-llm',
      script: 'src/agents/local-llm-agent.ts',
      autostart: false,
      max_memory_restart: '300M',
      env: {
        ...tsNodeBase.env,
        NODE_ENV: 'development',
        PORT: '3029',
      },
      error_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-local-llm-error.log'),
      out_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-local-llm-out.log'),
    },

    // ── 5. Health Monitor (plain JS, cron) ──────────────
    {
      name: 'jarvis-health',
      script: path.join(PROJECT_ROOT, 'scripts', 'health-check.js'),
      cwd: PROJECT_ROOT,
      interpreter: 'node',
      windowsHide: true,
      autorestart: false,
      cron_restart: '*/2 * * * *',
      max_memory_restart: '50M',
      env: { NODE_ENV: 'development' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      error_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-health-error.log'),
      out_file: path.join(PROJECT_ROOT, 'logs', 'jarvis-health-out.log'),
    },
  ],
};
