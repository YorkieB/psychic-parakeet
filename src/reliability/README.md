# Reliability Module

## Overview

The reliability module implements fault tolerance patterns for the Jarvis system. It provides circuit breakers, retry logic, bulkheads, and degradation strategies to ensure the system remains operational even when components fail.

## Architecture

```
System Call
    ↓
Bulkhead (isolate failures)
    ↓
Retry Engine
    ├── Exponential backoff
    ├── Jitter
    └── Circuit breaker
    ↓
Fallback Strategy
    ├── Cache
    ├── Default value
    └── Degraded mode
    ↓
Result or Timeout/Failure
```

## Key Components

- **Circuit Breaker** (`circuit-breaker.ts`): Prevent cascading failures
- **Retry Engine** (`retry-engine.ts`): Exponential backoff with jitter
- **Bulkhead** (`bulkhead.ts`): Isolate failures to specific compartments
- **Fallback** (`fallback.ts`): Graceful degradation strategies
- **Timeout Handler** (`timeout-handler.ts`): Enforce operation timeouts

## Usage

### Circuit Breaker

```typescript
import { createCircuitBreaker } from './circuit-breaker';

const breaker = createCircuitBreaker({
  failureThreshold: 5,      // failures before open
  resetTimeout: 60000,      // time before half-open
  monitorInterval: 10000    // health check interval
});

const operation = async () => {
  // Some operation that might fail
};

try {
  const result = await breaker.execute(operation);
} catch (error) {
  if (error.code === 'CIRCUIT_OPEN') {
    console.log('Circuit is open, service temporarily unavailable');
  }
}
```

### Retry Engine

```typescript
import { createRetryEngine } from './retry-engine';

const retrier = createRetryEngine({
  maxAttempts: 5,
  initialDelay: 100,
  maxDelay: 8000,
  backoffMultiplier: 2,
  jitterFactor: 0.1
});

const result = await retrier.execute(async () => {
  return await unreliableService.call();
});
```

### Bulkhead

```typescript
import { createBulkhead } from './bulkhead';

const bulkhead = createBulkhead({
  maxConcurrent: 10,      // max concurrent operations
  maxQueueSize: 50        // max queued operations
});

// Operations in this bulkhead don't impact others
const result = await bulkhead.execute(async () => {
  return await service.call();
});
```

### Fallback

```typescript
import { createFallback } from './fallback';

const fallback = createFallback({
  primaryOperation: async () => {
    return await primaryService.call();
  },
  fallbackStrategies: [
    {
      type: 'cache',
      ttl: 3600
    },
    {
      type: 'default',
      value: { status: 'degraded' }
    }
  ]
});

const result = await fallback.execute();
```

## Configuration

```env
# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=60000
CIRCUIT_BREAKER_MONITOR_INTERVAL=10000

# Retry
RETRY_MAX_ATTEMPTS=5
RETRY_INITIAL_DELAY=100
RETRY_MAX_DELAY=8000
RETRY_BACKOFF_MULTIPLIER=2
RETRY_JITTER_FACTOR=0.1

# Bulkhead
BULKHEAD_MAX_CONCURRENT=10
BULKHEAD_MAX_QUEUE_SIZE=50

# Timeout
OPERATION_TIMEOUT_DEFAULT=30000
OPERATION_TIMEOUT_LONG=120000
OPERATION_TIMEOUT_SHORT=5000

# Degradation
DEGRADATION_MODE=partial  # full, partial, none
CACHE_ENABLED=true
FALLBACK_ENABLED=true
```

## Reliability Patterns

### Exponential Backoff with Jitter
```
Attempt 1: 0ms
Attempt 2: 100ms + jitter
Attempt 3: 200ms + jitter
Attempt 4: 400ms + jitter
Attempt 5: 800ms + jitter
```

### Circuit Breaker States
```
[Closed] (normal)
    ↓ (failure threshold exceeded)
[Open] (fast-fail)
    ↓ (reset timeout reached)
[Half-Open] (testing recovery)
    ↓ (success/failure)
[Closed] or [Open]
```

### Bulkhead Isolation
```
Request 1 ──→ [Bulkhead 1] (isolated)
Request 2 ──→ [Bulkhead 2] (isolated)
Request 3 ──→ [Bulkhead 3] (isolated)

Failure in Bulkhead 1 doesn't affect others
```

## Related Standards

- `.github/docs/error-handling/RETRY-LOGIC-STANDARDS.md` — Retry patterns
- `.github/docs/error-handling/GRACEFUL-DEGRADATION-RULES.md` — Degradation
- `.github/docs/error-handling/FALLBACK-BEHAVIOR-STANDARDS.md` — Fallback patterns

## Monitoring Reliability

### Metrics
- Failure rate by service
- Retry attempts and success rate
- Circuit breaker state changes
- Bulkhead queue depth
- Fallback invocations

### Alerts
- Circuit breaker opened
- High failure rate (>50%)
- Repeated timeouts
- Bulkhead backpressure

## Best Practices

- [ ] Set appropriate timeouts for each operation type
- [ ] Use bulkheads for independent services
- [ ] Monitor circuit breaker state
- [ ] Implement meaningful fallback strategies
- [ ] Use retry only for transient failures
- [ ] Add jitter to prevent thundering herd
- [ ] Log all reliability events
- [ ] Test failure scenarios regularly

## Integration Points

- **Orchestrator** (`src/orchestrator/`): Uses reliability patterns
- **API** (`src/api/`): Uses timeouts and fallbacks
- **Services** (`src/services/`): Service-level reliability
- **Agents** (`src/agents/`): Agent communication reliability
