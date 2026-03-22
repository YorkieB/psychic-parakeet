# Module: Orchestrator

**Location**: `src/orchestrator/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Orchestrator is the central hub that coordinates communication between specialized AI agents. It receives requests from clients, intelligently routes them to appropriate agents based on the request type and agent capabilities, manages agent health and availability, and aggregates responses back to clients.

## Architecture

The module implements the **Orchestrator Pattern** where:
- **Request Router** — Analyzes incoming requests and determines target agent(s)
- **Agent Registry** — Maintains list of available agents, their health status, and capabilities
- **Request Dispatcher** — Sends requests to agents via HTTP/REST
- **Response Aggregator** — Combines results from one or more agents for client response
- **Health Monitor** — Tracks agent availability and handles failures gracefully

## Key Exports

### Classes
- `Orchestrator` — Main orchestration engine
- `AgentRegistry` — Agent availability and capability tracking
- `RequestRouter` — Request routing logic
- `HealthMonitor` — Agent health monitoring

### Functions
- `startOrchestrator(config)` — Initialize orchestrator
- `registerAgent(agent)` — Register new agent
- `deregisterAgent(agentId)` — Remove agent from registry
- `routeRequest(request)` — Route request to appropriate agent(s)

## Dependencies

### Internal
- [`agents`] — For agent communication
- [`api`] — HTTP server implementation
- [`database`] — Persistence of agent registry
- [`config`] — Configuration management
- [`services`] — Utility services

### External
- `express` — HTTP server framework
- `axios` — HTTP client for agent communication
- `pg` — PostgreSQL database client

## Usage Examples

### Initialize Orchestrator

```typescript
import { Orchestrator } from './orchestrator';

const orchestrator = new Orchestrator({
  port: 3000,
  agents: [
    { id: 'agent-1', url: 'http://localhost:4000', capabilities: ['dialogue', 'analysis'] },
    { id: 'agent-2', url: 'http://localhost:4001', capabilities: ['reasoning'] }
  ]
});

await orchestrator.start();
```

### Route Request to Agents

```typescript
const response = await orchestrator.routeRequest({
  type: 'dialogue',
  message: 'Hello, world!',
  context: { userId: '123' }
});
```

## Configuration

Pass config object to `Orchestrator` constructor:

```typescript
{
  port: number;              // Server port
  agents: Agent[];           // Initial agent list
  timeout: number;           // Request timeout (ms)
  healthCheckInterval: number; // Health check frequency (ms)
  retryAttempts: number;     // Retry failed requests
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

## Testing

Run orchestrator tests:
```bash
npm run test -- src/orchestrator/
```

Test coverage includes:
- Request routing to correct agent
- Fallback when primary agent fails
- Agent registration/deregistration
- Health monitoring and recovery
- Response aggregation from multiple agents
- Error handling and timeout scenarios

## Performance Considerations

- Agent communication is asynchronous to avoid blocking
- Health checks run in background and don't block main thread
- Agent registry uses in-memory cache for fast lookups
- Failed requests can retry with exponential backoff
- Large responses streamed rather than buffered

## Known Issues

- [ ] No circuit breaker pattern yet for cascading failures
- [ ] Agent registry not distributed (single-process only)
- [ ] No request queuing for overloaded agents

## Related Modules

- [`agents`] — Individual agent implementations
- [`api`] — HTTP server for client communication
- [`security`] — Authentication and authorization for orchestrator endpoints

## Contributing

When adding new routing logic:
1. Update `RequestRouter` class
2. Add corresponding tests in `__tests__/routing.test.ts`
3. Document new routing rules in this README
4. Update health check logic if needed

## Changelog

### 2026-03-22
- Initial module documentation
- Documented architecture and key exports
