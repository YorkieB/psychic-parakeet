# Middleware Module

## Overview

The middleware module contains HTTP request/response middleware and interceptors used by the API layer. It handles cross-cutting concerns like logging, authentication, error handling, rate limiting, CORS, and request validation.

## Architecture

```
HTTP Request
    ↓
Middleware Stack
    ├── CORS Handler
    ├── Body Parser
    ├── Logger
    ├── Authenticator
    ├── Rate Limiter
    ├── Validator
    └── Error Handler
    ↓
Route Handler
    ↓
Response Processing
```

## Key Components

- **Logger** (`logger.ts`): Request/response logging
- **Authenticator** (`authenticator.ts`): JWT/API key validation
- **Rate Limiter** (`rate-limiter.ts`): Request throttling
- **CORS Handler** (`cors-handler.ts`): Cross-origin requests
- **Validator** (`validator.ts`): Request schema validation
- **Error Handler** (`error-handler.ts`): Standardized error responses
- **Response Formatter** (`response-formatter.ts`): Consistent response structure

## Usage

### Applying Middleware

```typescript
import { createMiddlewareStack } from './middleware';

const app = express();

// Create middleware stack
const middleware = createMiddlewareStack({
  enableLogging: true,
  enableAuth: true,
  enableRateLimit: true,
  rateLimitPerMinute: 100
});

// Apply to app
middleware.forEach(mw => app.use(mw));

// Or apply to specific routes
app.post('/api/endpoint', middleware.authenticate, (req, res) => {
  // Handler
});
```

### Custom Middleware

```typescript
import { createCustomMiddleware } from './middleware';

const customAuth = createCustomMiddleware((req, res, next) => {
  // Custom authentication logic
  req.user = { id: 'user123' };
  next();
});

app.use(customAuth);
```

## Configuration

```env
# Logging
LOG_LEVEL=info
LOG_FORMAT=json  # json, combined, dev

# Authentication
AUTH_ENABLED=true
JWT_EXPIRY=24h
API_KEY_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=5000
RATE_LIMIT_STORAGE=memory  # memory, redis

# CORS
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:5173,http://localhost:3001
CORS_CREDENTIALS=true

# Request Validation
VALIDATION_ENABLED=true
VALIDATION_STRICT=true

# Error Handling
ERROR_DETAIL_LEVEL=minimal  # minimal, detailed, full
ERROR_LOGGING=true
```

## Middleware Details

### Logger
Logs all requests with structured format:

```json
{
  "timestamp": "2026-03-21T12:00:00Z",
  "method": "POST",
  "path": "/api/agents",
  "status": 200,
  "duration": 123,
  "userId": "user123"
}
```

### Authenticator
Validates JWT tokens and API keys:

```typescript
// Bearer token
Authorization: Bearer eyJhbGc...

// API key
X-API-Key: sk-1234...
```

### Rate Limiter
Per-user and global request throttling:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640000000
```

### Validator
Schema validation using JSON Schema or Joi:

```typescript
const schema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    userId: { type: 'string' }
  },
  required: ['message', 'userId']
};
```

### Error Handler
Standardized error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "message",
        "error": "Required field"
      }
    ]
  }
}
```

## Related Standards

- `.github/docs/error-handling/LOGGING-STANDARDS.md` — Logging standards
- `.github/docs/quality/SECURITY-STANDARDS.md` — Security middleware
- `.github/docs/quality/ERROR-HANDLING-STANDARDS.md` — Error handling

## Best Practices

- [ ] Always log security events (auth failures, rate limit exceeded)
- [ ] Validate all external input
- [ ] Use rate limiting to prevent abuse
- [ ] Enable CORS only for known origins
- [ ] Return consistent error formats
- [ ] Monitor middleware performance
- [ ] Never log sensitive data (passwords, tokens)

## Integration Points

- **API** (`src/api/`): Express app uses middleware
- **Security** (`src/security/`): Security middleware
- **Database** (`src/database/`): Transaction logging
- **Services** (`src/services/`): Service-level middleware
