# Orchestrator Module

## Overview

The orchestrator is the central coordinator of the Jarvis multi-agent system. It receives requests, routes them to appropriate agents, manages agent health, handles failures and retries, and aggregates responses. It implements the orchestrator pattern with retry logic, circuit breakers, and load balancing.

## Architecture

```
External Requests (API, Events)
        ↓
    Orchestrator
        ├── Request Router (determine which agent)
        ├── Agent Registry (track available agents)
        ├── Circuit Breaker (prevent cascading failures)
        ├── Retry Engine (exponential backoff)
        └── Response Aggregator (merge results)
        ↓
    Agent Pool
    (multiple agents, load balanced)
```

## Key Components

- **Orchestrator** (`orchestrator.ts`): Main orchestration logic and request routing
- **Agent Registry** (`agent-registry.ts`): Tracks agent registration, health, availability
- **Router** (`router.ts`): Request routing rules and agent selection
- **Circuit Breaker** (`circuit-breaker.ts`): Prevent cascading failures
- **Retry Engine** (`retry-engine.ts`): Exponential backoff retry logic
- **Load Balancer** (`load-balancer.ts`): Distribute load across agent instances

## Request Routing

### Intelligence Routing
Requests are routed based on:
1. **Intent Detection** — Analyze request to determine required capability
2. **Agent Capability** — Match intent to agent types
3. **Agent Health** — Route to healthy agents only
4. **Load Balancing** — Distribute across available instances

```typescript
const agent = orchestrator.selectAgent({
  requestType: 'dialogue',
  priority: 'high',
  parameters: { /* ... */ }
});
```

### Multi-Agent Orchestration
For complex requests, multiple agents can be coordinated:

```typescript
const results = await orchestrator.executeParallel([
  { agent: 'knowledge', task: 'research_topic' },
  { agent: 'analysis', task: 'analyze_data' },
  { agent: 'synthesis', task: 'combine_results' }
]);
```

## Failure Handling

### Circuit Breaker Pattern
Automatically stop sending requests to failing agents:

```
[Closed] (normal) ←→ [Open] (circuit broken)
    ↓
[Half-Open] (testing recovery)
```

### Retry Strategy
Exponential backoff with jitter:

```
Attempt 1: immediate
Attempt 2: wait 1s
Attempt 3: wait 2s
Attempt 4: wait 4s
Attempt 5: wait 8s (with jitter)
```

### Fallback Handling
- Try primary agent
- If fails, try secondary
- If all fail, return cached response or default

## Configuration

```env
# Orchestrator
ORCHESTRATOR_PORT=3000
ORCHESTRATOR_HOST=localhost

# Agent Health Checks
HEALTH_CHECK_INTERVAL=30000  # 30 seconds
HEALTH_CHECK_TIMEOUT=5000    # 5 seconds

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5   # failures before open
CIRCUIT_BREAKER_TIMEOUT=60000 # time in open state

# Retry
RETRY_MAX_ATTEMPTS=5
RETRY_INITIAL_DELAY=100
RETRY_MAX_DELAY=8000

# Load Balancing
LOAD_BALANCER_STRATEGY=round-robin  # or least-connections, random
MAX_CONCURRENT_REQUESTS=100
```

## Usage

### Starting the Orchestrator

```typescript
import { Orchestrator } from './orchestrator';

const orchestrator = new Orchestrator(3000);
await orchestrator.start();

// Agents auto-register via REST API
console.log('Orchestrator listening on port 3000');
```

### Executing Requests

```typescript
const result = await orchestrator.execute({
  type: 'dialogue',
  input: 'Hello, what is the weather?',
  userId: 'user123',
  timeout: 30000
});
```

### Health Monitoring

```typescript
// Get all agents
const agents = orchestrator.getAgents();

// Get specific agent health
const health = orchestrator.getAgentHealth(agentId);

// Get orchestrator metrics
const metrics = orchestrator.getMetrics();
// { requestCount, averageResponseTime, failureRate, ... }
```

## Related Standards

- `.github/docs/architecture/LAYERING-STANDARDS.md` — Orchestrator responsibilities
- `.github/docs/error-handling/RETRY-LOGIC-STANDARDS.md` — Retry patterns
- `.github/docs/logic/ASYNC-FLOW-CORRECTNESS.md` — Async patterns

## Monitoring & Debugging

### Key Metrics
- Request count by agent type
- Response times (p50, p95, p99)
- Error rate and types
- Circuit breaker state
- Queue depth

### Logging
Structured logging at each step:

```
[ROUTE] Request type:dialogue → agent:dialogue-1
[SEND] Sending request to http://localhost:3001
[RECV] Response received (123ms)
[RETRY] Attempt 1 failed, retrying...
```

## Integration Points

- **API** (`src/api/`): Receives requests from clients
- **Agents** (`src/agents/`): Executes work via HTTP
- **Self-Healing** (`src/self-healing/`): Monitors orchestrator health
- **Services** (`src/services/`): High-level service layer
