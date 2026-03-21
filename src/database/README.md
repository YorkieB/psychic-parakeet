# Database Module

## Overview

The database module manages all persistent data storage for the Jarvis system. It provides connection pooling, migrations, query builders, transaction management, and data models for conversations, agents, users, and system metrics.

## Architecture

```
Application Code
    ↓
Database Service (abstraction layer)
    ├── Connection Pool
    ├── Query Builder
    ├── Transaction Manager
    ├── Migration Runner
    └── Data Models
    ↓
PostgreSQL Database
```

## Key Components

- **Connection** (`connection.ts`): Database connection pooling
- **Models** (`models/`): TypeORM/Knex models for entities
- **Migrations** (`migrations/`): Schema version management
- **Repositories** (`repositories/`): Data access objects (DAOs)
- **Query Builder** (`query-builder.ts`): Type-safe query construction
- **Transactions** (`transactions.ts`): ACID transaction management

## Supported Databases

- **PostgreSQL** (primary) — 13+
- **MySQL** — 8.0+
- **SQLite** — For development/testing

## Usage

### Connecting to Database

```typescript
import { getDatabase } from './connection';

const db = await getDatabase();
console.log('Connected to database');
```

### Using Repositories

```typescript
import { ConversationRepository } from './repositories';

const conversationRepo = new ConversationRepository(db);

// Create
const conversation = await conversationRepo.create({
  userId: 'user123',
  title: 'Help with project',
  agentId: 'dialogue-1'
});

// Read
const chat = await conversationRepo.findById(conversation.id);

// Update
await conversationRepo.update(conversation.id, { title: 'New title' });

// Delete
await conversationRepo.delete(conversation.id);

// Query
const userChats = await conversationRepo.findByUserId('user123');
```

### Query Builder

```typescript
import { queryBuilder } from './query-builder';

const results = await queryBuilder()
  .select('*')
  .from('conversations')
  .where('userId', '=', 'user123')
  .andWhere('createdAt', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .execute();
```

### Transactions

```typescript
import { transaction } from './transactions';

await transaction(async (trx) => {
  // Multiple operations in single transaction
  const conversation = await conversationRepo.create(
    { userId: 'user123', title: 'Chat' },
    trx
  );

  await messageRepo.create(
    { conversationId: conversation.id, text: 'Hello', role: 'user' },
    trx
  );

  // All succeed or all rollback
});
```

### Migrations

```bash
# Run migrations
npm run db:migrate

# Create migration
npm run db:migration create add_user_preferences

# Rollback
npm run db:rollback
```

## Configuration

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jarvis
DATABASE_LOG_QUERIES=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Backup
DATABASE_BACKUP_ENABLED=true
DATABASE_BACKUP_INTERVAL=3600  # hourly
DATABASE_BACKUP_RETENTION=7    # days

# Development
DATABASE_SEED=true
DATABASE_SEED_FILE=./seeds/dev.sql
```

## Data Models

### Conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  userId VARCHAR(255),
  agentId VARCHAR(255),
  title VARCHAR(255),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversationId UUID REFERENCES conversations(id),
  role VARCHAR(50),  -- 'user', 'assistant', 'system'
  content TEXT,
  createdAt TIMESTAMP
);
```

### Agents
```sql
CREATE TABLE agents (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(100),
  status VARCHAR(50),  -- 'healthy', 'unhealthy', 'offline'
  port INT,
  lastHealthCheck TIMESTAMP,
  createdAt TIMESTAMP
);
```

## Related Standards

- `.github/docs/architecture/LAYERING-STANDARDS.md` — Database layer responsibilities
- `.github/docs/quality/PERFORMANCE-STANDARDS.md` — Query performance targets
- `.github/docs/error-handling/LOGGING-STANDARDS.md` — Database logging

## Performance Optimization

### Indexing
- Create indexes on frequently queried columns
- Monitor slow queries via `DATABASE_LOG_QUERIES=true`
- Use composite indexes for multi-column filters

### Caching
- Cache frequently accessed data in Redis
- Invalidate cache on updates
- Use query result caching for expensive queries

### Connection Pooling
- Min pool: 2, Max pool: 10 (adjust based on concurrency)
- Monitor pool utilization
- Implement connection timeouts

## Backup & Recovery

### Regular Backups
Automated hourly backups to S3 or local storage:

```bash
pg_dump -h localhost -U jarvis -d jarvis_db > backup-$(date +%Y%m%d).sql
```

### Point-in-Time Recovery
Maintain transaction logs for up-to-20-day recovery window.

## Integration Points

- **Repositories** (`repositories/`): Data access layer
- **Services** (`src/services/`): Service layer queries
- **Agents** (`src/agents/`): Agent data storage
- **Memory** (`src/memory/`): Memory persistence
- **Self-Healing** (`src/self-healing/`): Health metrics storage

## Best Practices

- [ ] Always use parameterized queries (prevent SQL injection)
- [ ] Use transactions for multi-step operations
- [ ] Index frequently queried columns
- [ ] Monitor slow queries regularly
- [ ] Back up database daily
- [ ] Use connection pooling
- [ ] Set appropriate query timeouts
- [ ] Archive old data regularly
