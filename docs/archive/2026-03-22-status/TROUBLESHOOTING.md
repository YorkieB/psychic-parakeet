# Jarvis Orchestrator — Troubleshooting & Guidance

> A comprehensive reference for every issue we've encountered and how it was resolved.
> Keep this updated as new problems arise.

---

## Table of Contents

1. [Backend Startup Issues](#1-backend-startup-issues)
2. [Dashboard Errors](#2-dashboard-errors)
3. [Agent Health & Monitoring](#3-agent-health--monitoring)
4. [Port Conflicts](#4-port-conflicts)
5. [TypeScript Build Errors](#5-typescript-build-errors)
6. [Dashboard ↔ Backend Communication](#6-dashboard--backend-communication)
7. [UI Navigation & Component Issues](#7-ui-navigation--component-issues)
8. [Voice & TTS Issues](#8-voice--tts-issues)
9. [Quick Reference Commands](#9-quick-reference-commands)
10. [Architecture Notes](#10-architecture-notes)

---

## 1. Backend Startup Issues

### 1.1 `npm start` fails — `tsc` build errors in unrelated files

**Symptom:** `npm run build` (which runs `tsc`) fails with errors in `fast-startup.ts`, `parallel-agent-starter.ts`, or `speech-agent.ts`. These are pre-existing errors unrelated to your changes.

**Root Cause:** `npm start` runs `node --expose-gc dist/index.js`, which requires a successful `tsc` build. But pre-existing errors in other files block compilation.

**Solution:** Use `ts-node` with `--transpile-only` to bypass type-checking:

```bash
# Recommended: spark-start (parallel agent startup, fastest)
npm run dev:spark

# Alternative: standard startup
npm run dev

# Alternative: quick startup (fewer agents)
npm run dev:quick
```

**Pre-existing errors (safe to ignore for startup):**
- `src/fast-startup.ts` — 17 errors (missing imports, `Cannot find name` errors)
- `src/parallel-agent-starter.ts` — 1 error (missing `Agent` export)
- `src/agents/speech-agent.ts` — 1 error (`handleError` expects 2 args, got 1)

---

### 1.2 `EADDRINUSE: address already in use :::3001`

**Symptom:** Backend crashes immediately on startup with port-in-use error.

**Root Cause:** A previous Node.js process is still holding the port. This happens when the backend crashes or is killed without graceful shutdown.

**Solution:**

```powershell
# Kill ALL node processes, wait for OS to release ports, then restart
taskkill /F /IM node.exe
Start-Sleep -Seconds 5
npm run dev:spark
```

**If specific port is stuck:**

```powershell
# Find the process on a specific port (e.g., 3001)
netstat -ano | findstr ":3001 " | findstr "LISTENING"
# Kill by PID
taskkill /F /PID <PID_NUMBER>
```

---

### 1.3 Backend starts but port 3000 never becomes available

**Symptom:** Backend logs show agents starting successfully, but `http://localhost:3000` is unreachable. Log output appears truncated.

**Root Cause:** When using `Start-Process` with `-RedirectStandardOutput`, the stdout buffer fills up and the process hangs indefinitely (a known Windows issue with redirected output from long-running processes).

**Solution:** Never redirect stdout to a file for long-running processes. Use one of:

```powershell
# Option 1: Run in current terminal (recommended for debugging)
npm run dev:spark

# Option 2: Background with NUL redirect (no log capture)
Start-Process cmd -ArgumentList "/c","npx ts-node --transpile-only src/spark-start.ts > NUL 2>&1" -WindowStyle Hidden

# Option 3: Use dev:all to start backend + dashboard together
npm run dev:all
```

---

### 1.4 Backend takes too long to start

**Symptom:** Backend starts 37+ agents sequentially. Full startup with `index.ts` can take 30-60+ seconds.

**Root Cause:** Each agent binds to its own port. Sequential startup means waiting for each agent before starting the next.

**Solution:** Use `spark-start.ts` which starts agents in parallel:

```bash
npm run dev:spark
```

This starts all agents concurrently and is significantly faster than the sequential `index.ts` startup.

---

## 2. Dashboard Errors

### 2.1 `Cannot read properties of undefined (reading 'avgResponseTime')`

**Symptom:** Dashboard crashes with this error in the browser console. The health monitor shows an error state.

**Root Cause:** The `/health/agents` API returns agents without `diagnostics`, `memory`, `port`, `uptime`, `capabilities`, `priority`, or `sensorLive` fields. But the dashboard's `AgentData` interface expects them and code like `agent.diagnostics.avgResponseTime` accesses them without null checks.

**Fix Applied:** In `dashboard/src/debug-dashboard.tsx`, the `fetchAgents` function now maps API responses with safe defaults:

```typescript
const newAgents: AgentData[] = data.data.agents.map(
  (a: Partial<AgentData> & { name: string }) => ({
    name: a.name ?? 'Unknown',
    status: a.status ?? 'unknown',
    isHealthy: a.isHealthy ?? false,
    pid: a.pid ?? 0,
    lastPing: a.lastPing ?? new Date().toISOString(),
    port: a.port ?? 0,
    uptime: a.uptime ?? 0,
    memory: a.memory ?? null,
    diagnostics: a.diagnostics ?? {
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      recentErrors: [],
    },
    capabilities: a.capabilities ?? [],
    priority: a.priority ?? 0,
    sensorLive: a.sensorLive ?? a.isHealthy ?? false,
  })
);
```

**Key Lesson:** Always provide defaults when mapping API data to frontend interfaces. Never assume the API response matches your TypeScript interface exactly.

---

### 2.2 `ECONNREFUSED` on `/health/agents` — Backend not running

**Symptom:** Dashboard shows "Dashboard couldn't reach the API" error. The feed shows fetch errors every 30 seconds.

**Root Cause:** The backend API server is not running on port 3000.

**Solution:**

1. Start the backend: `npm run dev:spark`
2. Wait for "Jarvis is fully operational" message
3. Refresh the dashboard at `http://localhost:5173`

The dashboard auto-retries every 30 seconds, so it will recover once the backend is available.

---

### 2.3 `500 Internal Server Error` on `/health/agents`

**Symptom:** Backend is running but the health endpoint returns 500.

**Root Cause:** Usually happens during backend initialization — the pool manager or health API hasn't finished setting up yet (background services initialize after the API server starts).

**Solution:** Wait 10-15 seconds after seeing "API Server is ready" in the backend logs, then refresh the dashboard. The background services (pool manager, sensors, self-healing) initialize asynchronously.

---

## 3. Agent Health & Monitoring

### 3.1 Only 6 agents showing in dashboard (instead of 37)

**Symptom:** Dashboard only shows ConversationAgent, CommandAgent, ContextAgent, FinanceAgent, CalendarAgent, EmailAgent.

**Root Cause:** The `/health/agents` endpoint only queried agents from the `AgentPoolManager`, which only had 6 agents registered via `registerExistingAgent()`. The other ~31 agents were only in the `AgentRegistry` but not included in the API response.

**Fix Applied:** Modified `src/self-healing/dashboard/health-api.ts` to merge both sources:

1. **Pool manager agents** — agents with live sensor data
2. **Health map agents** — agents tracked via health checks
3. **Registry agents** — all remaining agents from `AgentRegistry`

The endpoint now returns all 37 agents by checking both `poolManager.getAllStatuses()` and `agentRegistry.getAllAgents()`.

**Key Architecture Note:**
- `AgentRegistry` (in `src/orchestrator/agent-registry.ts`) — stores ALL agent registrations with capabilities, endpoints, priority
- `AgentPoolManager` (in `src/self-healing/spawner/`) — manages a subset of agents for self-healing (sensors, respawning)
- `HealthAPI` — must query BOTH to get the complete agent list

---

### 3.2 Agent names mismatch between registry and pool manager

**Context:** The registry uses IDs like `Dialogue`, `Web`, `Knowledge`, while the pool manager uses names like `ConversationAgent`, `CommandAgent`, `ContextAgent`.

**Mapping:**
| Registry ID | Pool Manager Name | Actual Class |
|---|---|---|
| Dialogue | ConversationAgent | DialogueAgent |
| Web | CommandAgent | WebAgent |
| Knowledge | ContextAgent | KnowledgeAgent |
| Finance | FinanceAgent | FinanceAgent |
| Calendar | CalendarAgent | CalendarAgent |
| Email | EmailAgent | EmailAgent |

The health API filter checks both `reg.agentId` and `${reg.agentId}Agent` to avoid duplicates.

---

### 3.3 Sensors and live health data

**How sensors work:**
- Each agent has a corresponding sensor class (e.g., `ConversationAgentSensor`)
- Sensors are registered with the pool manager in `initializeBackgroundServices()`
- Sensors poll agent health endpoints at configured intervals (15s-60s)
- The `HealthAPI` collects metrics every 1 second and stores history

**Sensor import location:** `src/self-healing/sensors/agents/`

**Port assignments:** See [Section 10.2](#102-agent-port-map) for the complete port map.

---

## 4. Port Conflicts

### 4.1 Common port conflicts

Each agent runs on its own port. If any port is in use, that agent fails to start:

```powershell
# Check which ports are in use
netstat -ano | findstr "LISTENING" | findstr "30"

# Kill everything and start fresh
taskkill /F /IM node.exe
Start-Sleep -Seconds 5
npm run dev:spark
```

### 4.2 Vite dev server port conflict

**Symptom:** Dashboard won't start because port 5173 is already in use.

**Solution:**

```powershell
netstat -ano | findstr ":5173 " | findstr "LISTENING"
taskkill /F /PID <PID>
cd dashboard
npm run dev
```

---

## 5. TypeScript Build Errors

### 5.1 Pre-existing errors that block `tsc`

These errors exist in the codebase and prevent `npm run build` from succeeding:

| File | Error | Status |
|---|---|---|
| `src/fast-startup.ts` | 17 errors — missing imports for all agent classes | Known, not critical |
| `src/parallel-agent-starter.ts` | Missing `Agent` export from `base-agent` | Known, not critical |
| `src/agents/speech-agent.ts` | `handleError` expects 2 args, got 1 | Known, not critical |

**Workaround:** Use `ts-node --transpile-only` for development (all `dev:*` scripts use this).

**To fix permanently:** These files need their imports and type references updated to match current agent class signatures.

---

### 5.2 Biome lint — import sort order

**Symptom:** Biome reports "The imports and exports are not sorted."

**Rule:** Default imports must come before type-only imports from the same module:

```typescript
// ✅ Correct
import express from 'express';
import type { Request, Response } from 'express';

// ❌ Wrong
import type { Request, Response } from 'express';
import express from 'express';
```

---

## 6. Dashboard ↔ Backend Communication

### 6.1 Vite proxy configuration

The dashboard uses Vite's proxy to forward API requests to the backend:

**File:** `dashboard/vite.config.ts`

```typescript
server: {
  proxy: {
    '/health': 'http://localhost:3000',
    '/chat': 'http://localhost:3000',
    '/api': 'http://localhost:3000',
    // ... other endpoints
  }
}
```

**Key:** The dashboard at `http://localhost:5173` proxies `/health/*` requests to `http://localhost:3000`. If the backend is on a different port, update `vite.config.ts`.

### 6.2 Polling behavior

- Dashboard polls `/health/agents` every **30 seconds** (`POLL_INTERVAL = 30000`)
- A countdown timer shows seconds until next poll
- Failed fetches are logged to the feed with an error entry
- The dashboard auto-recovers when the backend becomes available

---

## 7. UI Navigation & Component Issues

### 7.1 "Open in IDE" button doesn't open file

**Symptom:** Clicking "Open in IDE" or "AI Fix" in the dashboard modal doesn't open the file in the JarvisIDE panel.

**Root Cause:** The `JarvisIDE` component only mounts when `activePanel === 'code-editor'`. If the user is on the dashboard panel, the event listener isn't registered yet, so dispatched events are lost.

**Fix Applied:** In `debug-dashboard.tsx`, both `openAgentInIDE` and `attemptAiFix` now:
1. Switch to the IDE panel first (`setActivePanel('code-editor')`)
2. Wait with `setTimeout` (100-200ms) for the component to mount
3. Then dispatch the event

```typescript
setActivePanel('code-editor');
setTimeout(() => {
  window.dispatchEvent(new CustomEvent('jarvis:open-file', { detail: { filePath } }));
}, 200);
```

---

### 7.2 Dashboard merge attempt (reverted)

**What was tried:** Integrating the main `DashboardPage` into `debug-dashboard.tsx` using React Router.

**Why it was reverted:** The merged dashboard introduced complexity (BrowserRouter, HealthProvider context, route conflicts) and caused errors.

**Current state:** `debug-dashboard.tsx` is the sole dashboard, rendered directly in `main.tsx` without React Router. The `DashboardPage` component exists in `src/pages/DashboardPage.tsx` but is not actively used.

**Lesson:** Keep the debug dashboard self-contained. If a main dashboard is needed, it should be a separate route or a completely separate app.

---

## 8. Voice & TTS Issues

### 8.1 Voice agent skipped (LLM not available)

**Symptom:** Voice Agent logs "skipped (LLM not available)".

**Root Cause:** The `VERTEX_AI_ENDPOINT_URL` environment variable is not set or the Vertex AI client failed to initialize.

**Solution:** Ensure `.env` has:

```
VERTEX_AI_ENDPOINT_URL=https://your-vertex-endpoint.prediction.vertexai.goog
```

### 8.2 Local TTS server

The local TTS server runs separately:

```bash
cd local-tts
pip install -r requirements.txt
python server.py
```

---

## 9. Quick Reference Commands

### Starting the system

```powershell
# Kill any stuck processes first
taskkill /F /IM node.exe 2>$null

# Start backend (recommended - parallel startup)
cd "c:\Users\conta\Jarvis Ochestrator"
npm run dev:spark

# Start dashboard (in separate terminal)
cd "c:\Users\conta\Jarvis Ochestrator\dashboard"
npm run dev

# Start both together
cd "c:\Users\conta\Jarvis Ochestrator"
npm run dev:all
```

### Checking health

```powershell
# Quick API health check
Invoke-RestMethod -Uri "http://localhost:3000/health/agents" -Method Get

# Count agents
$r = Invoke-RestMethod -Uri "http://localhost:3000/health/agents"; $r.data.agents.Count

# Check specific agent
Invoke-RestMethod -Uri "http://localhost:3000/health/agents/DialogueAgent"

# Check which ports are in use
netstat -ano | findstr "LISTENING" | findstr "30"
```

### TypeScript checks

```powershell
# Type-check only (no emit)
npx tsc --noEmit

# Check specific file for errors
npx tsc --noEmit 2>&1 | Select-String "health-api"

# Run Biome
npx biome check --apply dashboard/src/
```

### Testing

```powershell
# Quick test
npm run test:quick

# Health monitoring test
npm run test:health

# All tests
npm run test:all
```

---

## 10. Architecture Notes

### 10.1 Key files

| File | Purpose |
|---|---|
| `src/index.ts` | Main entry — sequential agent startup |
| `src/spark-start.ts` | Parallel agent startup (recommended) |
| `src/api/server.ts` | Express API server setup |
| `src/orchestrator/agent-registry.ts` | Central agent registry |
| `src/self-healing/spawner/agent-pool-manager.ts` | Agent lifecycle & respawning |
| `src/self-healing/dashboard/health-api.ts` | `/health/*` REST endpoints |
| `src/self-healing/sensors/agents/` | Per-agent health sensors |
| `dashboard/src/debug-dashboard.tsx` | Main dashboard UI component |
| `dashboard/src/main.tsx` | Dashboard entry point |
| `dashboard/vite.config.ts` | Vite config with API proxy |

### 10.2 Agent port map

| Agent | Port | Sensor |
|---|---|---|
| Dialogue | 3001 | ConversationAgentSensor |
| Web | 3002 | SearchAgentSensor |
| Knowledge | 3003 | — |
| Finance | 3004 | FinanceAgentSensor |
| Calendar | 3005 | CalendarAgentSensor |
| Email | 3006 | EmailAgentSensor |
| Code | 3007 | CodeAgentSensor |
| Voice | 3008 | VoiceAgentSensor |
| Music | 3009 | MusicAgentSensor |
| Image | 3010 | ImageGenerationAgentSensor |
| Video | 3011 | VideoAgentSensor |
| Spotify | 3012 | SpotifyAgentSensor |
| AppleMusic | 3013 | AppleMusicAgentSensor |
| Emotion | 3014 | EmotionAgentSensor |
| Weather | 3015 | WeatherAgentSensor |
| News | 3016 | NewsAgentSensor |
| Reminder | 3017 | ReminderAgentSensor |
| Timer | 3018 | TimerAgentSensor |
| Alarm | 3019 | AlarmAgentSensor |
| Story | 3020 | StoryAgentSensor |
| ComputerControl | 3021 | ComputerControlAgentSensor |
| File | 3022 | FileAgentSensor |
| Calculator | 3023 | CalculatorAgentSensor |
| UnitConverter | 3024 | UnitConverterAgentSensor |
| Translation | 3025 | TranslationAgentSensor |
| Command | 3026 | CommandAgentSensor |
| Context | 3027 | ContextAgentSensor |
| Memory | 3028 | MemoryAgentSensor |
| Listening | 3029 | ListeningAgentSensor |
| Speech | 3030 | SpeechAgentSensor |
| VoiceCommand | 3031 | VoiceCommandAgentSensor |
| LLM | 3032 | LLMAgentSensor |
| Personality | 3033 | PersonalityAgentSensor |
| EmotionsEngine | 3034 | — |
| MemorySystem | 3036 | — |
| VisualEngine | 3037 | — |
| Security | 3038 | — |

### 10.3 Startup flow

```
index.ts / spark-start.ts
  ├─ Initialize LLM (Vertex AI)
  ├─ Create AgentRegistry + Orchestrator
  ├─ Start all agents (each binds to its port)
  ├─ Register agents with AgentRegistry
  ├─ Start API Server (port 3000)
  └─ Background: initializeBackgroundServices()
       ├─ Initialize Database
       ├─ Create AgentPoolManager
       ├─ Register sensors for each agent
       ├─ Register existing agents with pool manager
       ├─ Start HealthAPI (metrics collection)
       └─ Connect WebSocket events
```

### 10.4 Dashboard data flow

```
Dashboard (localhost:5173)
  ├─ fetchAgents() every 30s
  │   └─ GET /health/agents (proxied to localhost:3000)
  │       ├─ poolManager.getAllStatuses()  ← 6 agents with sensors
  │       ├─ poolManager.healthCheckAll() ← live health data
  │       └─ agentRegistry.getAllAgents() ← remaining ~31 agents
  ├─ Maps response to AgentData[] with safe defaults
  ├─ buildFeedEntries() for activity feed
  └─ Renders agent cards, metrics, feed
```

---

## Appendix: Checklist Before Reporting "It's Broken"

1. **Is the backend running?** → Check `netstat -ano | findstr ":3000 " | findstr "LISTENING"`
2. **Are all ports free?** → `taskkill /F /IM node.exe` then restart
3. **Using the right start command?** → Use `npm run dev:spark`, NOT `npm start`
4. **Dashboard running?** → Check `netstat -ano | findstr ":5173 " | findstr "LISTENING"`
5. **Browser console errors?** → Check for `avgResponseTime` or `ECONNREFUSED`
6. **API returning data?** → `Invoke-RestMethod -Uri "http://localhost:3000/health/agents"`
7. **Waited long enough?** → Background services take 10-15s after API server starts
