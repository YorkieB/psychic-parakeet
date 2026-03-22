# Module: Memory

**Location**: `src/memory/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Memory module implements conversation history management, context retention, short-term and long-term memory systems, and memory optimization. It enables agents to maintain context across multiple interactions and learn from past conversations.

## Key Exports

- `MemoryManager` — Overall memory lifecycle
- `ShortTermMemory` — Recent conversation cache
- `LongTermMemory` — Persistent learning storage
- `ContextRetriever` — Context lookup
- `MemoryOptimizer` — Memory cleanup

## Dependencies

- Internal: `database`, `config`, `services`
- External: `redis` (for short-term), `pg` (for long-term)

## Usage

```typescript
import { MemoryManager } from './memory';

const memory = new MemoryManager();
await memory.store('user-123', { message: '...' });
const context = await memory.retrieve('user-123', limit: 10);
```

## Changelog

### 2026-03-22
- Initial documentation
