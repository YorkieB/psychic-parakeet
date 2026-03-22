# Module: Database

**Location**: `src/database/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Database module provides data persistence, schema management, migrations, and query utilities. It abstracts database operations across the system using a repository pattern, manages database connections, and provides utilities for common CRUD operations and complex queries.

## Key Exports

- `Database` — Connection and lifecycle management
- `Repository` — Generic repository for CRUD operations
- `QueryBuilder` — Query building utilities
- `MigrationRunner` — Schema migrations
- `Transaction` — Transaction management

## Dependencies

- Internal: `config`, `services`
- External: `pg`, `knex` (query builder)

## Usage

```typescript
import { Database, Repository } from './database';

const db = new Database(config);
await db.connect();

const userRepo = new Repository(db, 'users');
const users = await userRepo.find({ active: true });
```

## Testing

```bash
npm run test -- src/database/
```

## Changelog

### 2026-03-22
- Initial documentation
