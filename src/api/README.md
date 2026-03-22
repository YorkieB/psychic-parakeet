# Module: API

**Location**: `src/api/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The API module provides HTTP server setup, route definitions, request validation, error handling, middleware configuration, and WebSocket support. It serves as the public interface for the system.

## Key Exports

- `createServer` — Create Express server
- `setupRoutes` — Register all routes
- `setupMiddleware` — Configure middleware
- `setupWebSocket` — WebSocket handler

## Dependencies

- Internal: `security`, `orchestrator`, `config`
- External: `express`, `socket.io`, `joi`

## Usage

```typescript
import { createServer } from './api';

const app = createServer(config);
await app.listen(3000);
```

## Changelog

### 2026-03-22
- Initial documentation
