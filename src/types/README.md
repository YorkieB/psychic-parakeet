# Types Module

## Overview

The types module contains all shared TypeScript type definitions, interfaces, and enums used across the Jarvis system. This includes agent types, request/response types, data models, and utility types.

## Key Type Files

- **Agent Types** (`agent.types.ts`): Agent definitions and status types
- **Request/Response** (`request.types.ts`): API request/response shapes
- **Domain Models** (`domain.types.ts`): Business domain entities
- **Errors** (`error.types.ts`): Error type definitions
- **Utilities** (`utility.types.ts`): Common utility types

## Agent Types

```typescript
// Agent definition
interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  port: number;
  capabilities: string[];
  lastHealthCheck: Date;
  metadata?: Record<string, unknown>;
}

// Agent types (dialogue, knowledge, analysis, etc.)
type AgentType = 
  | 'dialogue'
  | 'knowledge'
  | 'analysis'
  | 'calculator'
  | 'voice'
  | 'image-generation'
  | 'computer-control';

// Agent status
type AgentStatus = 'healthy' | 'unhealthy' | 'offline' | 'initializing';
```

## Request/Response Types

```typescript
// API Request
interface APIRequest {
  id: string;
  type: string;
  input: unknown;
  userId: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  timeout?: number;
}

// API Response
interface APIResponse<T = unknown> {
  data: T;
  status: 'success' | 'error';
  requestId: string;
  timestamp: Date;
  duration: number;
}

// Error Response
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
```

## Domain Models

```typescript
// User/Session
interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
  createdAt: Date;
}

// Conversation
interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message
interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}
```

## Error Types

```typescript
// Base error class
class AppError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Specific error types
class ValidationError extends AppError {}
class NotFoundError extends AppError {}
class UnauthorizedError extends AppError {}
class ConflictError extends AppError {}
class TimeoutError extends AppError {}
class CircuitBreakerOpenError extends AppError {}
```

## Utility Types

```typescript
// Generic response wrapper
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error };

// Async function type
type AsyncFn<T> = (...args: any[]) => Promise<T>;

// Record with optional properties
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Pick subset of properties
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit subset of properties
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

## Enums

```typescript
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

enum LockdownMode {
  NONE = 'none',
  MAINTENANCE = 'maintenance',
  READ_ONLY = 'read-only',
  API_LOCKED = 'api-locked'
}
```

## Type Guards

```typescript
// Type guard functions
function isAgent(obj: unknown): obj is Agent {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'type' in obj &&
    'status' in obj
  );
}

function isAPIResponse(obj: unknown): obj is APIResponse {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'data' in obj &&
    'status' in obj
  );
}
```

## Generic Types

```typescript
// Generic service response
interface ServiceResponse<T> {
  data: T;
  meta: {
    timestamp: Date;
    duration: number;
    version: string;
  };
}

// Paginated response
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// Error with context
interface ContextualError {
  error: Error;
  context: Record<string, unknown>;
  timestamp: Date;
  requestId: string;
}
```

## Related Standards

- `.github/docs/architecture/COMPONENT-STANDARDS.md` — Type design
- `.github/docs/quality/NAMING-CONVENTIONS.md` — Naming conventions

## Best Practices

- [ ] Use interfaces for object shapes
- [ ] Use enums for fixed values
- [ ] Create type guards for external data
- [ ] Export types from barrel files
- [ ] Document complex types with comments
- [ ] Use `Record` for key-value objects
- [ ] Use `Pick`/`Omit` for subsets
- [ ] Prefer specific types over `any`
- [ ] Keep types close to usage

## Integration Points

- All modules import types from this module
- API layer uses request/response types
- Agents use agent types
- Services use domain models
- Error handling uses error types
