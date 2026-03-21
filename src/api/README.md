# API Module

## Overview

The API module exposes the Jarvis system's functionality through RESTful HTTP endpoints. It serves as the primary interface for external clients (web dashboards, desktop apps, mobile clients) to interact with the multi-agent system.

## Architecture

The API layer sits between external clients and the orchestrator:
```
Client (Desktop/Web/Mobile)
        ↓
    API Server (Express)
        ↓
    Orchestrator
        ↓
    Agent Registry → Individual Agents
```

## Key Components

- **Server** (`server.ts`): Express application setup, middleware, and route registration
- **Routes** (`routes/`): API endpoint definitions organized by domain
- **Middleware** (`src/middleware/`): Request logging, authentication, error handling
- **Controllers** (`src/api/`): Business logic for each endpoint group

## Available Endpoints

### Health & Status
- `GET /health` — System health status
- `GET /status` — Full orchestrator status including all agents

### Agent Operations
- `POST /agents` — List all registered agents
- `POST /agents/{id}/execute` — Execute agent with parameters
- `GET /agents/{id}/health` — Get specific agent health

### Conversation & Dialogue
- `POST /chat/message` — Send message to dialogue agent
- `GET /chat/history` — Retrieve conversation history

### System Control
- `POST /system/restart` — Restart system
- `POST /system/shutdown` — Graceful shutdown

## Usage

### Starting the API Server

```bash
npm start
```

Server runs on port 3000 by default (configurable via `PORT` env var).

### Making API Requests

```bash
# Health check
curl http://localhost:3000/health

# List agents
curl -X POST http://localhost:3000/agents

# Send message
curl -X POST http://localhost:3000/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Jarvis", "userId": "user123"}'
```

## Configuration

```env
PORT=3000
NODE_ENV=production
ORCHESTRATOR_URL=http://localhost:3000
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
```

## Related Standards

- `.github/docs/architecture/LAYERING-STANDARDS.md` — API layer responsibilities
- `.github/docs/quality/TESTING-STANDARDS.md` — API testing requirements
- `.github/docs/error-handling/LOGGING-STANDARDS.md` — API logging standards

## Error Handling

All API errors follow a standard format:

```json
{
  "error": {
    "code": "AGENT_TIMEOUT",
    "message": "Agent did not respond within 5 seconds",
    "details": {
      "agentId": "dialogue-1",
      "requestId": "req-123"
    }
  }
}
```

## Integration Points

- **Orchestrator** (`src/orchestrator/`): Routes requests to agents
- **Agents** (`src/agents/`): Executes actual business logic
- **Self-Healing** (`src/self-healing/`): Monitors API server health
- **Database** (`src/database/`): Stores conversation history and logs
