# Module: Agents

**Location**: `src/agents/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Agents module defines the framework and patterns for implementing specialized AI agents. Each agent is a service that performs specific tasks (dialogue, analysis, reasoning, etc.) and communicates with the central Orchestrator via HTTP/REST. This module provides base classes, interfaces, and utilities for agent implementation.

## Architecture

- **Base Agent Class** — Common interface and lifecycle methods for all agents
- **Agent Registry** — Tracks agent capabilities and metadata
- **Request/Response Handlers** — Standardized request processing
- **Health Status Reporting** — Agent health and readiness endpoints
- **Capability Declaration** — How agents advertise their capabilities

## Key Exports

### Classes
- `Agent` — Base class for all agents
- `AgentRegistry` — Capability and metadata registry
- `AgentHealthMonitor` — Health status tracker

### Types
- `AgentCapability` — Capability definition type
- `AgentRequest` — Standard request format
- `AgentResponse` — Standard response format
- `AgentConfig` — Configuration interface

### Functions
- `createAgent(config)` — Factory for creating new agent instances
- `registerCapability(agent, capability)` — Register agent capability

## Dependencies

### Internal
- [`config`] — Configuration management
- [`services`] — Utility services (logging, etc.)
- [`database`] — Agent persistence

### External
- `express` — HTTP server framework
- `joi` — Request validation
- `winston` — Logging

## Usage Examples

### Create Custom Agent

```typescript
import { Agent } from '../agents';

class DialogueAgent extends Agent {
  constructor() {
    super({
      id: 'dialogue-agent',
      name: 'Dialogue Handler',
      capabilities: ['dialogue', 'conversation']
    });
  }

  async handleRequest(request) {
    // Process dialogue request
    return { response: '...' };
  }
}

const agent = new DialogueAgent();
await agent.start();
```

### Register Agent Capability

```typescript
import { registerCapability } from '../agents';

registerCapability(agent, {
  name: 'dialogue',
  description: 'Handle dialogue and conversation',
  inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
  outputSchema: { type: 'object', properties: { response: { type: 'string' } } }
});
```

## Configuration

Agents typically accept configuration like:

```typescript
{
  id: string;              // Unique agent ID
  name: string;            // Human-readable name
  port: number;            // HTTP server port
  capabilities: string[];  // List of capabilities
  timeout: number;         // Request timeout (ms)
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

## Testing

Run agent tests:
```bash
npm run test -- src/agents/
```

Test coverage includes:
- Base agent lifecycle (start, stop, healthcheck)
- Capability registration and declaration
- Request/response handling
- Error handling and fallbacks
- Health status reporting

## Performance Considerations

- Agents should process requests asynchronously
- No shared state between concurrent requests
- Capability metadata cached to avoid repeated declarations
- Health checks should be lightweight (< 100ms)

## Known Issues

- [ ] No built-in request queuing when overwhelmed
- [ ] Capability schema validation not enforced
- [ ] No automatic retry logic in agent handlers

## Related Modules

- [`orchestrator`] — Routes requests to agents
- [`api`] — HTTP server framework
- [`security`] — Authentication for inter-agent communication

## Contributing

When implementing a new agent:
1. Extend the `Agent` base class
2. Implement `handleRequest()` method
3. Register all capabilities with `registerCapability()`
4. Add tests covering normal and error paths
5. Document capabilities in module README

## Changelog

### 2026-03-22
- Initial module documentation
- Documented base agent class and capability system
