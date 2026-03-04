# Self-Healing Infrastructure for Jarvis v4

## Overview

This module provides enterprise-grade self-healing capabilities for the Jarvis multi-agent system, including:
- Individual sensors for all agents
- Automatic spawning and respawning
- Health monitoring and diagnostics
- Crash detection and recovery
- Lifecycle event tracking

## Phase 1 Implementation (Completed)

### ✅ Core Components

1. **Type Definitions** (`types/`)
   - `agent.types.ts` - Agent state and lifecycle types
   - `sensor.types.ts` - Sensor metrics and readings
   - `spawn.types.ts` - Spawn configuration and strategies

2. **Base Agent Sensor** (`sensors/agents/base-agent-sensor.ts`)
   - Abstract base class for all agent sensors
   - Implements 6 health checks:
     - Ping test (responsiveness)
     - Load test (workload capacity)
     - Memory check (memory usage)
     - Response time check (SLA compliance)
     - Error tracking (failure rate)
     - Crash detection (unexpected failures)
   - Calculates health score (0-100)
   - Maintains metrics history

3. **Critical Agent Sensors** (`sensors/agents/`)
   - `conversation-agent-sensor.ts` - Monitors DialogueAgent
   - `code-agent-sensor.ts` - Monitors CodeAgent
   - `context-agent-sensor.ts` - Monitors KnowledgeAgent (context)
   - `memory-agent-sensor.ts` - Monitors KnowledgeAgent (memory)
   - `command-agent-sensor.ts` - Monitors WebAgent (routing)

4. **Agent Spawner** (`spawner/agent-spawner.ts`)
   - Spawns agents with timeout protection
   - Respawns agents on failure
   - Enforces respawn limits (max restarts per hour)
   - Supports multiple spawn strategies

5. **Agent Lifecycle Tracker** (`spawner/agent-lifecycle.ts`)
   - Tracks agent state (spawning, active, idle, error, respawning, killed)
   - Records lifecycle events to database
   - Maintains spawn history (spawn count, crash count)
   - Updates ping timestamps

6. **Agent Pool Manager** (`spawner/agent-pool-manager.ts`)
   - Manages all agents in the system
   - Spawns agents on startup (pre-spawn strategy)
   - Performs health checks every 30 seconds
   - Auto-respawns unhealthy agents
   - Provides status and metrics APIs

7. **Configuration** (`config/agents.config.ts`)
   - Defines spawn configurations for all agents
   - Configures spawn strategies, limits, and dependencies
   - Sets health check intervals (15s for critical agents)

8. **Database Migration** (`database/migrations/005_create_agent_tables.sql`)
   - `agent_states` - Current state of all agents
   - `agent_lifecycle_events` - Event log for all lifecycle events
   - `agent_spawn_history` - Spawn and crash history
   - Updates `sensor_readings` table with agent-specific columns

## Usage

### Basic Setup

```typescript
import { AgentPoolManager, AgentLifecycle } from './self-healing';
import { DatabaseClient } from './database';
import { createLogger } from './utils/logger';
import { AGENT_SPAWN_CONFIG } from './self-healing/config';

const logger = createLogger('JarvisSystem');
const db = new DatabaseClient(logger);
await db.connect();

// Create lifecycle tracker
const lifecycle = new AgentLifecycle(logger, db);

// Create pool manager
const poolManager = new AgentPoolManager(logger, lifecycle);

// Register all agent configurations
for (const config of Object.values(AGENT_SPAWN_CONFIG)) {
  poolManager.registerConfig(config);
}

// Register sensors for critical agents
const conversationSensor = new ConversationAgentSensor(logger, 15000);
poolManager.registerSensor('ConversationAgent', conversationSensor);

// Spawn all pre-spawn agents
await poolManager.spawnAll();
```

### Health Monitoring

The pool manager automatically:
- Checks health of all agents every 30 seconds
- Auto-respawns unhealthy agents (if configured)
- Logs all lifecycle events to database
- Updates agent state in real-time

### Manual Operations

```typescript
// Get agent status
const status = poolManager.getStatus('ConversationAgent');

// Get all agent statuses
const allStatuses = poolManager.getAllStatuses();

// Manually respawn an agent
await poolManager.respawn('CodeAgent', 'manual_trigger');

// Kill an agent
await poolManager.kill('FinanceAgent');

// Get agent instance
const agent = poolManager.getAgent('ConversationAgent');
```

## Agent Metrics

Each sensor collects the following metrics:

```typescript
interface AgentMetrics {
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  uptime: number;                    // Seconds since spawn
  lastActivity: Date;
  responseTime: number;              // ms (p95)
  successRate: number;                // % successful operations
  errorRate: number;                  // % failed operations
  memoryUsage: number;                // MB
  cpuUsage: number;                   // %
  activeRequests: number;
  queuedRequests: number;
  spawnCount: number;                 // How many times respawned
  crashCount: number;                 // How many crashes
  lastCrash?: Date;
  lastRespawn?: Date;
  isResponsive: boolean;              // Ping test passed
  isHealthy: boolean;                 // All checks passed
  healthScore: number;               // 0-100
}
```

## Spawn Strategies

- **pre-spawn**: Spawn immediately on server startup (critical agents)
- **on-demand**: Spawn when first request arrives
- **lazy-spawn**: Spawn when needed, keep alive
- **auto-respawn**: Automatically respawn on health check failure
- **scale-to-zero**: Kill idle agents after timeout

## Respawn Triggers

- `agent_crash` - Process exit, uncaught exception
- `health_check_fail` - Agent not responding to pings
- `performance_degradation` - Response time > threshold
- `memory_leak` - Memory usage growing unbounded
- `manual_trigger` - Admin forces respawn

## Respawn Limits

- Max restarts per hour (default: 5)
- Restart delay between respawns (default: 5 seconds)
- Immediate respawn for critical agents
- Manual intervention required after limit reached

## Database Schema

### agent_states
- `agent_name` (VARCHAR, UNIQUE)
- `status` (VARCHAR)
- `pid` (INTEGER)
- `thread_id` (INTEGER)
- `spawned_at` (TIMESTAMPTZ)
- `last_ping` (TIMESTAMPTZ)
- `metadata` (JSONB)

### agent_lifecycle_events
- `agent_name` (VARCHAR)
- `event_type` (VARCHAR)
- `timestamp` (TIMESTAMPTZ)
- `details` (JSONB)
- `error_message` (TEXT)

### agent_spawn_history
- `agent_name` (VARCHAR, UNIQUE)
- `spawn_count` (INTEGER)
- `crash_count` (INTEGER)
- `last_spawn` (TIMESTAMPTZ)
- `last_crash` (TIMESTAMPTZ)
- `spawn_duration_ms` (INTEGER)

## Next Steps (Phase 2 & 3)

- [ ] Create sensors for remaining 24 agents
- [ ] Implement performance-based respawn (memory leak detection)
- [ ] Add dashboard API endpoints
- [ ] Add WebSocket events for real-time updates
- [ ] Implement diagnostic engine
- [ ] Implement auto-repair mechanisms
- [ ] Add learning from repair history

## Notes

- All agents are monitored via HTTP health endpoints
- Health checks run every 15-30 seconds depending on agent priority
- Crash detection uses ping test failures combined with previous health state
- Respawn limits prevent infinite restart loops
- All events are logged to database for audit and analysis
