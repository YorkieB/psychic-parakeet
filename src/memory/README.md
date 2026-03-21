# Memory Module

## Overview

The memory module manages persistent and ephemeral state for the Jarvis system. It implements multi-layered memory: short-term conversation context, medium-term session state, and long-term persistent memory with knowledge graphs and retrieval.

## Architecture

```
Application Code
        ↓
Memory Manager (unified interface)
        ↓
    ├── Ephemeral Memory (in-memory cache)
    ├── Session Memory (current user session)
    ├── Persistent Memory (database)
    └── Knowledge Graph (semantic search)
        ↓
    Storage Backends
    ├── Redis (cache)
    ├── PostgreSQL (persistent)
    └── Vector DB (semantic search)
```

## Key Components

- **Memory Manager** (`manager.ts`): Unified memory interface
- **Short-Term** (`short-term.ts`): Conversation context and recent history
- **Long-Term** (`long-term.ts`): Persistent memory with indexing
- **Knowledge Graph** (`knowledge-graph.ts`): Semantic relationships and entity linking
- **Consolidation** (`consolidation.ts`): Merge and deduplicate memories
- **Retrieval** (`retrieval.ts`): Smart memory search and ranking

## Usage

### Store Memory

```typescript
import { getMemoryManager } from './manager';

const memory = getMemoryManager();

// Short-term (conversation context)
await memory.addShortTerm({
  type: 'conversation',
  content: 'User said: Hello',
  userId: 'user123',
  ttl: 3600  // 1 hour
});

// Long-term (persistent)
await memory.addLongTerm({
  type: 'fact',
  content: 'User prefers coffee',
  userId: 'user123',
  tags: ['preference', 'food']
});
```

### Retrieve Memory

```typescript
// Retrieve relevant memories for context
const context = await memory.retrieve({
  query: 'What does user prefer to drink?',
  userId: 'user123',
  limit: 5
});

// Returns most relevant memories ranked by relevance
```

### Knowledge Graph

```typescript
// Add entity relationship
await memory.addRelationship({
  entity1: 'user123',
  relation: 'prefers',
  entity2: 'coffee'
});

// Query relationships
const preferences = await memory.queryRelationships({
  entity: 'user123',
  relation: 'prefers'
});
```

### Consolidation

```typescript
// Merge duplicate or similar memories
await memory.consolidate({
  userId: 'user123',
  threshold: 0.8  // similarity threshold
});
```

## Configuration

```env
# Storage backend
MEMORY_BACKEND=postgresql
MEMORY_CACHE_BACKEND=redis

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=jarvis_memory
POSTGRES_USER=jarvis
POSTGRES_PASSWORD=secret

# Redis cache
REDIS_URL=redis://localhost:6379

# Vector DB (for semantic search)
VECTOR_DB_URL=http://localhost:8000

# Memory settings
MEMORY_TTL_SHORT_TERM=3600        # 1 hour
MEMORY_TTL_SESSION=86400          # 1 day
MEMORY_CONSOLIDATION_THRESHOLD=0.85
MEMORY_MAX_RETRIEVAL=10
```

## Storage Details

### Short-Term Memory
- Stored in-memory and Redis
- TTL: 1 hour by default
- Used for current conversation context
- Fast access, limited size

### Long-Term Memory
- Stored in PostgreSQL
- Persistent across sessions
- Indexed for fast retrieval
- Includes metadata (created_at, updated_at, tags)

### Knowledge Graph
- Stores entity relationships
- Used for context enrichment
- Enables reasoning about user preferences and patterns
- Supports graph queries

## Related Standards

- `.github/docs/logic/STATE-MUTATION-RULES.md` — Memory state safety
- `.github/docs/error-handling/LOGGING-STANDARDS.md` — Memory event logging
- `.github/docs/quality/PERFORMANCE-STANDARDS.md` — Memory retrieval performance

## Performance Optimization

### Caching Strategy
- Short-term memories cached in Redis
- Frequently accessed facts preloaded
- Consolidation run nightly to reduce retrieval time

### Indexing
- Semantic embeddings indexed for fast similarity search
- Full-text search on memory content
- User-specific indexes for multi-tenant access

### Cleanup
- Auto-expire short-term memories after TTL
- Archive old memories monthly
- Consolidate similar memories to reduce clutter

## Integration Points

- **Agents** (`src/agents/`): Agents query memory for context
- **Reasoning** (`src/reasoning/`): Reasoning uses memory for inference
- **Voice** (`src/voice/`): Voice context stored in memory
- **Services** (`src/services/`): Services enrich responses with memory
- **Database** (`src/database/`): Persistent storage backend

## Best Practices

- [ ] Always include user context when storing memory
- [ ] Use semantic search for retrieval (not keyword-based)
- [ ] Consolidate memories regularly to reduce noise
- [ ] Tag memories for better organization
- [ ] Implement retention policies for old memories
- [ ] Monitor memory growth to catch leaks
