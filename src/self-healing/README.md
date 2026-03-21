# Self-Healing Module

## Overview

The self-healing module implements autonomous health monitoring, failure detection, and automatic recovery mechanisms for the Jarvis system. It continuously monitors agent health, detects failures, and automatically respawns failed agents to maintain system resilience.

## Architecture

```
Health Monitoring
    ├── Periodic Health Checks (every 30s)
    ├── Agent Status Tracking
    └── Failure Detection
    ↓
Failure Analysis
    ├── Classify failure type
    ├── Determine recovery strategy
    └── Check retry limits
    ↓
Recovery Execution
    ├── Restart agent
    ├── Verify recovery
    └── Log results
```

## Key Components

- **Health Monitor** (`health-monitor.ts`): Periodic health checks
- **Failure Detector** (`failure-detector.ts`): Classify and analyze failures
- **Recovery Engine** (`recovery-engine.ts`): Execute recovery strategies
- **Agent Respawner** (`agent-respawner.ts`): Restart failed agents
- **Metrics Collector** (`metrics-collector.ts`): Health statistics

## Related Standards

- `.github/docs/error-handling/GRACEFUL-DEGRADATION-RULES.md` — Degradation strategies
- `.github/docs/error-handling/RETRY-LOGIC-STANDARDS.md` — Retry patterns

## Integration Points

- **Orchestrator** (`src/orchestrator/`): Provides agent registry
- **Agents** (`src/agents/`): Monitors all agents
- **Database** (`src/database/`): Stores health metrics
