# Self-Healing Infrastructure Integration Guide

## Overview

This guide shows how to integrate the self-healing infrastructure into the main Jarvis system.

## Basic Integration

### Step 1: Import Required Modules

```typescript
import { AgentPoolManager, AgentLifecycle } from './self-healing/spawner';
import { AgentWebSocketEvents } from './self-healing/dashboard/websocket-events';
import { AGENT_SPAWN_CONFIG } from './self-healing/config/agents.config';
import { DatabaseClient } from './database';
import { createLogger } from './utils/logger';

// Import all agent sensors
import {
  ConversationAgentSensor,
  CommandAgentSensor,
  ContextAgentSensor,
  MemoryAgentSensor,
  CodeAgentSensor,
  FinanceAgentSensor,
  CalendarAgentSensor,
  EmailAgentSensor,
  VoiceAgentSensor,
  MusicAgentSensor,
  ImageGenerationAgentSensor,
  VideoAgentSensor,
  SpotifyAgentSensor,
  AppleMusicAgentSensor,
  // ... import all 29 sensors
} from './self-healing/sensors/agents';
```

### Step 2: Initialize Self-Healing Infrastructure

```typescript
async function initializeSelfHealing() {
  const logger = createLogger('SelfHealing');
  
  // Initialize database
  const db = new DatabaseClient(logger);
  await db.connect();
  
  // Run migration for agent tables
  await db.loadSchema('src/database/migrations/005_create_agent_tables.sql');
  
  // Create lifecycle tracker
  const lifecycle = new AgentLifecycle(logger, db);
  
  // Create WebSocket event emitter
  const wsEvents = new AgentWebSocketEvents(logger);
  
  // Create pool manager
  const poolManager = new AgentPoolManager(logger, lifecycle, wsEvents);
  
  // Register all agent configurations
  for (const config of Object.values(AGENT_SPAWN_CONFIG)) {
    poolManager.registerConfig(config);
  }
  
  // Register sensors for all agents
  const sensors = [
    new ConversationAgentSensor(logger, 15000),
    new CommandAgentSensor(logger, 15000),
    new ContextAgentSensor(logger, 15000),
    new MemoryAgentSensor(logger, 15000),
    new CodeAgentSensor(logger, 15000),
    new FinanceAgentSensor(logger, 30000),
    new CalendarAgentSensor(logger, 30000),
    new EmailAgentSensor(logger, 30000),
    new VoiceAgentSensor(logger, 30000),
    new MusicAgentSensor(logger, 30000),
    new ImageGenerationAgentSensor(logger, 30000),
    new VideoAgentSensor(logger, 30000),
    new SpotifyAgentSensor(logger, 60000),
    new AppleMusicAgentSensor(logger, 60000),
    // ... register all 29 sensors
  ];
  
  for (const sensor of sensors) {
    const agentName = sensor['agentName']; // Access protected property
    poolManager.registerSensor(agentName, sensor);
  }
  
  // Spawn all critical agents
  await poolManager.spawnAll();
  
  return { poolManager, lifecycle, wsEvents };
}
```

### Step 3: Integrate with API Server

```typescript
import { JarvisAPIServer } from './api/server';
import { HealthAPI } from './self-healing/dashboard/health-api';

// After initializing pool manager
const apiServer = new JarvisAPIServer(
  orchestrator,
  registry,
  logger,
  3000,
  poolManager // Pass pool manager to API server
);

await apiServer.start();
```

### Step 4: Set Up WebSocket Event Listeners

```typescript
// Listen to WebSocket events
wsEvents.on('agent_spawned', (event) => {
  logger.info(`Agent spawned: ${event.agentName}`, event.data);
  // Broadcast to connected clients
});

wsEvents.on('agent_crashed', (event) => {
  logger.error(`Agent crashed: ${event.agentName}`, event.data);
  // Alert administrators
});

wsEvents.on('agent_respawned', (event) => {
  logger.info(`Agent respawned: ${event.agentName}`, event.data);
  // Update dashboard
});

wsEvents.on('agent_health_changed', (event) => {
  if (event.data.metrics && event.data.metrics.healthScore < 50) {
    logger.warn(`Agent health degraded: ${event.agentName}`, event.data);
  }
  // Update real-time dashboard
});
```

## API Endpoints

Once integrated, the following endpoints are available:

### GET /health/agents
Get status of all agents

**Response:**
```json
{
  "success": true,
  "count": 29,
  "agents": [
    {
      "name": "ConversationAgent",
      "status": "active",
      "pid": 12345,
      "spawnedAt": "2026-01-31T12:00:00Z",
      "lastPing": "2026-01-31T12:05:00Z",
      "isHealthy": true
    }
  ],
  "timestamp": "2026-01-31T12:05:00Z"
}
```

### GET /health/agents/:name
Get status of specific agent

**Response:**
```json
{
  "success": true,
  "agent": {
    "name": "ConversationAgent",
    "status": "active",
    "pid": 12345,
    "spawnedAt": "2026-01-31T12:00:00Z",
    "lastPing": "2026-01-31T12:05:00Z",
    "isHealthy": true
  }
}
```

### POST /health/agents/:name/respawn
Manually respawn an agent

**Request Body (optional):**
```json
{
  "trigger": "manual_trigger"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent ConversationAgent respawned successfully",
  "agentName": "ConversationAgent",
  "timestamp": "2026-01-31T12:05:00Z"
}
```

### POST /health/agents/:name/kill
Kill an agent

**Response:**
```json
{
  "success": true,
  "message": "Agent ConversationAgent killed successfully",
  "agentName": "ConversationAgent",
  "timestamp": "2026-01-31T12:05:00Z"
}
```

### GET /health/agents/:name/metrics
Get detailed metrics for an agent

**Response:**
```json
{
  "success": true,
  "agentName": "ConversationAgent",
  "currentMetrics": {
    "status": "active",
    "uptime": 300,
    "responseTime": 15,
    "successRate": 99.5,
    "errorRate": 0.5,
    "memoryUsage": 150,
    "cpuUsage": 5,
    "activeRequests": 2,
    "queuedRequests": 0,
    "spawnCount": 1,
    "crashCount": 0,
    "isResponsive": true,
    "isHealthy": true,
    "healthScore": 98
  },
  "history": [...],
  "historySize": 100
}
```

### GET /health/agents/:name/history
Get spawn/crash history for an agent

**Response:**
```json
{
  "success": true,
  "agentName": "ConversationAgent",
  "spawnHistory": {
    "spawnCount": 1,
    "crashCount": 0,
    "lastSpawn": "2026-01-31T12:00:00Z",
    "lastCrash": null
  }
}
```

## WebSocket Events

The WebSocket event emitter supports the following events:

- `agent_spawned` - Agent successfully spawned
- `agent_crashed` - Agent crashed
- `agent_respawned` - Agent respawned
- `agent_health_changed` - Agent health metrics changed significantly
- `agent_killed` - Agent manually killed
- `agent_error` - Agent encountered an error

### Example WebSocket Client

```typescript
import { AgentWebSocketEvents } from './self-healing/dashboard/websocket-events';

const wsEvents = new AgentWebSocketEvents(logger);

// Listen to events
wsEvents.on('agent_spawned', (event) => {
  console.log('Agent spawned:', event.agentName);
});

wsEvents.on('agent_crashed', (event) => {
  console.error('Agent crashed:', event.agentName, event.data.error);
});

// In a real WebSocket server, you would broadcast these events to connected clients
```

## Manual Operations

### Respawn an Agent

```typescript
await poolManager.respawn('ConversationAgent', 'manual_trigger');
```

### Kill an Agent

```typescript
await poolManager.kill('FinanceAgent');
```

### Get Agent Status

```typescript
const status = poolManager.getStatus('ConversationAgent');
console.log('Agent status:', status);
```

### Get All Agent Statuses

```typescript
const allStatuses = poolManager.getAllStatuses();
console.log('All agents:', allStatuses);
```

### Health Check All Agents

```typescript
const healthMap = await poolManager.healthCheckAll();
for (const [agentName, isHealthy] of healthMap) {
  console.log(`${agentName}: ${isHealthy ? 'healthy' : 'unhealthy'}`);
}
```

## Configuration

Agent spawn configurations are defined in `src/self-healing/config/agents.config.ts`. Each agent has:

- `maxRestarts` - Maximum respawns per hour
- `restartDelay` - Delay between respawns (ms)
- `healthCheckInterval` - How often to check health (ms)
- `spawnTimeout` - Timeout for spawn operation (ms)
- `dependencies` - Other agents this depends on
- `spawnStrategy` - When to spawn (pre-spawn, on-demand, etc.)
- `criticalAgent` - Whether this is a critical agent

## Monitoring

The system automatically:

1. **Health Monitoring**: Checks all agents every 30 seconds
2. **Crash Detection**: Detects when agents stop responding
3. **Memory Leak Detection**: Monitors memory growth over time
4. **Performance Monitoring**: Tracks response times
5. **Auto-Respawn**: Automatically respawns unhealthy agents (if configured)

## Database Tables

The following tables are created by the migration:

- `agent_states` - Current state of all agents
- `agent_lifecycle_events` - Event log for all lifecycle events
- `agent_spawn_history` - Spawn and crash history

## Troubleshooting

### Agent Not Spawning

1. Check agent configuration in `agents.config.ts`
2. Verify agent class exists and is correct
3. Check logs for spawn errors
4. Verify port is not in use

### Agent Not Respawning

1. Check respawn limits (maxRestarts)
2. Verify spawn strategy is set to 'auto-respawn' or agent is critical
3. Check logs for respawn errors
4. Verify agent dependencies are met

### Health Checks Failing

1. Verify agent health endpoint is accessible
2. Check agent is actually running
3. Verify sensor is registered for the agent
4. Check network connectivity

## Next Steps

- Implement diagnostic engine for root cause analysis
- Add auto-repair mechanisms
- Create learning system from repair history
- Build comprehensive dashboard UI
