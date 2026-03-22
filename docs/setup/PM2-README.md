# Jarvis PM2 Process Management
## Quick Start

```bash
# 1. One-time setup (installs PM2, creates logs, starts everything)
node scripts/pm2-setup.js

# 2. That's it. PM2 now manages all your services.
```

## What This Does

PM2 keeps all your Jarvis services alive automatically:

| Service | Port | What it does |
|---------|------|-------------|
| `jarvis-api` | 3000 | Main backend — serves /api/ide/* routes |
| `jarvis-llm` | 3028 | External AI providers (OpenAI, Anthropic, Google, etc.) |
| `jarvis-ollama` | 3030 | Ollama bridge → localhost:11434 (qwen2.5-coder) |
| `jarvis-local-llm` | 3029 | Local LLM (disabled by default, start when needed) |
| `jarvis-health` | — | Pings all ports every 60s, auto-restarts dead services |

If any service crashes, PM2 restarts it within 3 seconds with exponential backoff.

## Daily Usage

```bash
# See what's running
pm2 status

# Live monitoring dashboard (CPU, memory, logs)
pm2 monit

# View logs
pm2 logs                    # All services
pm2 logs jarvis-api         # One service
pm2 logs jarvis-llm --lines 50   # Last 50 lines

# Restart
pm2 restart all             # Everything
pm2 restart jarvis-ollama   # One service

# Stop / start individual services
pm2 stop jarvis-ollama
pm2 start jarvis-local-llm  # Enable the disabled local LLM

# Manual health check
node scripts/health-check.js
```

## Files

```
Jarvis Ochestrator/
├── ecosystem.config.js        # PM2 service definitions
├── scripts/
│   ├── pm2-setup.js           # One-time setup script
│   └── health-check.js        # Port health monitor
└── logs/
    ├── jarvis-api-out.log     # API stdout
    ├── jarvis-api-error.log   # API stderr
    ├── jarvis-llm-out.log
    ├── jarvis-llm-error.log
    ├── jarvis-ollama-out.log
    ├── jarvis-ollama-error.log
    ├── health-check.log       # Health monitor log
    └── health-status.json     # Latest health status (JSON)
```

## Add to package.json

Add these scripts to your `package.json` for convenience:

```json
{
  "scripts": {
    "pm2:setup": "node scripts/pm2-setup.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop all",
    "pm2:restart": "pm2 restart all",
    "pm2:status": "pm2 status",
    "pm2:logs": "pm2 logs",
    "pm2:monit": "pm2 monit",
    "pm2:health": "node scripts/health-check.js"
  }
}
```

## Troubleshooting

**Service keeps restarting in a loop:**
Check the error log: `pm2 logs <service-name> --err --lines 30`
Usually a missing dependency, wrong path, or port already in use.

**Port already in use:**
```bash
# Find what's using the port (Windows)
netstat -ano | findstr :3028
# Kill it
taskkill /PID <pid> /F
```

**PM2 not found after install:**
Close and reopen your terminal, or run: `npx pm2 status`

**Ollama agent keeps dying:**
Make sure Ollama itself is running: `ollama serve`
Then check: `ollama list` to confirm qwen2.5-coder is pulled.

**Auto-start on Windows boot:**
```bash
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```
