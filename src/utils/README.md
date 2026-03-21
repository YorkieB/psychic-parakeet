# Utils Module

## Overview

The utils module contains shared utility functions and helpers used across the Jarvis system. This includes logging, formatting, validation, data transformation, and common algorithms.

## Key Utilities

- **Logger** (`logger.ts`): Winston logger factory
- **Validators** (`validators.ts`): Data validation helpers
- **Formatters** (`formatters.ts`): Data formatting and serialization
- **Transformers** (`transformers.ts`): Data transformation functions
- **Constants** (`constants.ts`): Shared constants
- **Types** (`types.ts`): Common TypeScript type definitions

## Usage

### Logger

```typescript
import { getLogger } from './logger';

const logger = getLogger('MyModule');

logger.info('Operation started', { userId: 'user123' });
logger.warn('High memory usage', { memoryMB: 1024 });
logger.error('Operation failed', new Error('Connection timeout'));
logger.debug('Detailed info for debugging', { data: obj });
```

### Validators

```typescript
import {
  isEmail,
  isUUID,
  isPositiveNumber,
  isValidDate,
  isNonEmpty
} from './validators';

if (!isEmail(email)) {
  throw new ValidationError('Invalid email');
}

if (!isUUID(id)) {
  throw new ValidationError('Invalid ID format');
}
```

### Formatters

```typescript
import {
  formatJSON,
  formatDate,
  formatDuration,
  formatBytes
} from './formatters';

const json = formatJSON(obj);
const date = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
const duration = formatDuration(1500);  // "1.5s"
const size = formatBytes(1048576);      // "1 MB"
```

### Transformers

```typescript
import {
  camelToSnake,
  snakeToCamel,
  groupBy,
  chunk,
  flatten,
  uniq
} from './transformers';

const snake = camelToSnake('userId');           // 'user_id'
const camel = snakeToCamel('user_id');          // 'userId'
const grouped = groupBy(users, 'type');
const chunks = chunk(array, 10);
const flat = flatten(nestedArray);
const unique = uniq(arrayWithDuplicates);
```

## Common Patterns

### Error Handling

```typescript
import { AppError, ValidationError } from './types';

throw new ValidationError('Field required', 'field_name');
throw new AppError('Operation failed', 'OP_FAILED', 500);
```

### Type Guards

```typescript
import { isObject, isArray, isString } from './validators';

if (isObject(value)) {
  // value is object
}
```

### Async Utilities

```typescript
import { delay, retry, timeout } from './async-utils';

// Delay execution
await delay(1000);

// Retry with exponential backoff
const result = await retry(
  async () => apiCall(),
  { maxAttempts: 3 }
);

// Add timeout
const result = await timeout(
  slowOperation(),
  5000
);
```

## Configuration

Most utilities are configuration-free, but logging can be configured:

```env
LOG_LEVEL=info
LOG_FORMAT=json  # json, simple, detailed
LOG_OUTPUT=console,file  # console, file, etc.
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10mb
LOG_MAX_FILES=10
```

## Related Standards

- `.github/docs/error-handling/LOGGING-STANDARDS.md` — Logging standards
- `.github/docs/quality/NAMING-CONVENTIONS.md` — Naming conventions

## Common Utilities by Category

### Validation
- `isEmail(value)` — Validate email
- `isUUID(value)` — Validate UUID
- `isURL(value)` — Validate URL
- `isPhoneNumber(value)` — Validate phone
- `isPositiveNumber(value)` — Validate positive number
- `isNonEmpty(value)` — Check not empty

### Formatting
- `formatJSON(obj)` — Pretty JSON
- `formatDate(date, format)` — Format date
- `formatDuration(ms)` — Convert ms to readable
- `formatBytes(bytes)` — Convert bytes to readable
- `formatCurrency(amount)` — Format as currency

### Transformation
- `camelToSnake(str)` — camelCase → snake_case
- `snakeToCamel(str)` — snake_case → camelCase
- `groupBy(arr, key)` — Group array by key
- `chunk(arr, size)` — Split array into chunks
- `flatten(arr)` — Flatten nested array
- `uniq(arr)` — Remove duplicates

### Async
- `delay(ms)` — Promise-based delay
- `retry(fn, options)` — Retry logic
- `timeout(promise, ms)` — Add timeout
- `queue(fns, concurrency)` — Async queue

## Best Practices

- [ ] Use typed returns (not `any`)
- [ ] Include JSDoc comments
- [ ] Write unit tests for utilities
- [ ] Keep utilities pure when possible
- [ ] Don't mix concerns in one utility
- [ ] Use named exports for clarity
- [ ] Document parameters and returns

## Integration Points

- All modules use `logger` from utils
- All modules may use validators
- Services use transformers
- API uses formatters for responses
