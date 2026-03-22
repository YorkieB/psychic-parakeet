# Module: Config

**Location**: `src/config/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Config module handles all configuration management including environment variables, config file loading, validation, and defaults. It provides a single source of truth for system configuration across environments (development, staging, production).

## Key Exports

- `loadConfig` — Load configuration from environment/files
- `validateConfig` — Validate against schema
- `getConfig` — Retrieve current configuration
- `ConfigSchema` — Configuration type definitions

## Dependencies

- Internal: `services` (for logging)
- External: `joi` (validation)

## Usage

```typescript
import { loadConfig } from './config';

const config = loadConfig();
console.log(config.apiPort); // Loaded from env or file
```

## Changelog

### 2026-03-22
- Initial documentation
