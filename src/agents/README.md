# Agents Module

## Overview

The agents module contains all specialized AI agent implementations that handle specific tasks within the Jarvis system. Each agent is a stateless, request-handler that can be registered, monitored, and orchestrated by the central orchestrator.

## Architecture

Agents follow a distributed, HTTP-based architecture:
- Each agent runs as an independent service
- Agents register with the central orchestrator via REST API
- Agents receive requests from the orchestrator and respond with results
- Health checks are performed every 30 seconds to track availability

## Key Components

- **Base Agent** (`base-agent.ts`): Abstract base class providing common agent functionality, error handling, and health reporting
- **Dialogue Agent** (`dialogue-agent.ts`): Handles conversation and dialogue management
- **Voice Agent** (`voice-agent.ts`): Processes voice input/output and synthesis
- **Knowledge Agent** (`knowledge-agent.ts`): Research, fact-checking, and information synthesis
- **Calculator Agent** (`calculator-agent.ts`): Mathematical computations and analysis
- **Computer Control Agent** (`computer-control-agent.ts`): System commands and automation
- **Image Generation Agent** (`image-generation-agent.ts`): Text-to-image synthesis
- **Memory Agent** (`memory-agent.ts`): Persistent memory and context management
- **Personality Agent** (`personality-agent.ts`): Character and tone management
- And 34+ additional specialized agents

## Usage

### Starting an Agent

```typescript
import { DialogueAgent } from './dialogue-agent';

const agent = new DialogueAgent(3001); // HTTP port
await agent.start();
console.log('Agent listening on port 3001');
```

### Agent Registration

Agents automatically register with orchestrator (default: `http://localhost:3000`):

```typescript
// In agent startup
const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';
await registerAgent({
  id: this.id,
  type: 'dialogue',
  port: this.port,
  status: 'healthy'
});
```

### Agent Health Checks

The orchestrator polls all registered agents every 30 seconds:

```typescript
// Agent health endpoint (e.g., GET /health)
{
  "status": "healthy",
  "uptime": 1234.5,
  "lastRequest": "2026-03-21T12:00:00Z",
  "agentType": "dialogue"
}
```

## Configuration

Agents configure via environment variables:

```env
AGENT_PORT=3001
AGENT_ID=dialogue-1
AGENT_TYPE=dialogue
ORCHESTRATOR_URL=http://localhost:3000
LOG_LEVEL=info
```

## Related Standards

- `.github/docs/architecture/COMPONENT-STANDARDS.md` — Agent design patterns
- `.github/docs/error-handling/ERROR-TAXONOMY.md` — Error classification
- `.github/docs/quality/TESTING-STANDARDS.md` — Agent testing requirements
- `.github/docs/logic/INVARIANT-ENFORCEMENT-STANDARDS.md` — Agent invariants

## Integration Points

- **Orchestrator** (`src/orchestrator/`): Routes requests to appropriate agents
- **API** (`src/api/`): Exposes agent capabilities via REST endpoints
- **Self-Healing** (`src/self-healing/`): Monitors agent health and respawns failed agents
