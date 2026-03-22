# Module: Middleware

**Location**: `src/middleware/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Middleware module provides HTTP middleware for authentication, authorization, rate limiting, request validation, error handling, logging, and other cross-cutting concerns. These are used by the API module to process requests and responses.

## Key Exports

- `authMiddleware` — Authentication checks
- `authorizationMiddleware` — Permission checks
- `rateLimitMiddleware` — Request throttling
- `validationMiddleware` — Request validation
- `errorHandlerMiddleware` — Error processing
- `loggingMiddleware` — Request/response logging

## Dependencies

- Internal: `security`, `config`, `services`
- External: `express`

## Usage

```typescript
import { authMiddleware } from './middleware';

app.use(authMiddleware());
```

## Changelog

### 2026-03-22
- Initial documentation
