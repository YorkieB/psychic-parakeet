# Config Module

## Overview

The config module manages all configuration for the Jarvis system. It handles environment variables, configuration files, defaults, validation, and environment-specific overrides.

## Architecture

```
Environment Variables
Config Files (JSON, YAML)
Default Values
        ↓
Config Manager (validation & merging)
        ↓
Type-Safe Config Object
        ↓
Application Code
```

## Key Components

- **Config Manager** (`manager.ts`): Load, validate, and merge configurations
- **Schema** (`schema.ts`): Configuration schema definition and validation
- **Loaders** (`loaders/`): Load from env, files, etc.
- **Validators** (`validators.ts`): Validate configuration values
- **Defaults** (`defaults.ts`): Default configuration values

## Usage

### Loading Configuration

```typescript
import { getConfig } from './config';

const config = getConfig();

// Type-safe access
const port = config.api.port;
const dbUrl = config.database.url;
const logLevel = config.logging.level;
```

### Environment-Specific Config

```typescript
// Development: config/dev.json
// Production: config/prod.json
// Test: config/test.json

const env = process.env.NODE_ENV || 'development';
const envConfig = require(`./config/${env}.json`);
```

### Validation

```typescript
import { validateConfig } from './validators';

const isValid = validateConfig(config);
if (!isValid) {
  console.error('Configuration is invalid');
  process.exit(1);
}
```

## Configuration Structure

```typescript
{
  // API Configuration
  api: {
    port: 3000,
    host: 'localhost',
    corsOrigin: 'http://localhost:5173'
  },

  // Database Configuration
  database: {
    url: 'postgresql://user:pass@localhost/db',
    pool: { min: 2, max: 10 },
    logging: false
  },

  // LLM Configuration
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'sk-...',
    temperature: 0.7
  },

  // Logging
  logging: {
    level: 'info',
    format: 'json',
    outputs: ['console', 'file']
  },

  // Agents
  agents: {
    registryUrl: 'http://localhost:3000',
    healthCheckInterval: 30000,
    healthCheckTimeout: 5000
  },

  // Features
  features: {
    voiceEnabled: true,
    memoryEnabled: true,
    analyticsEnabled: true
  }
}
```

## Environment Variables

```env
# API
PORT=3000
HOST=localhost
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:pass@localhost/db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# LLM
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Agents
AGENT_REGISTRY_URL=http://localhost:3000
HEALTH_CHECK_INTERVAL=30000

# Features
VOICE_ENABLED=true
MEMORY_ENABLED=true
ANALYTICS_ENABLED=true

# Environment
NODE_ENV=development
```

## Configuration Loading Order

1. Load defaults
2. Load from config file (config/{NODE_ENV}.json)
3. Override with environment variables
4. Validate final configuration

## Related Standards

- `.github/docs/quality/SECURITY-STANDARDS.md` — Secure config handling
- `.github/docs/error-handling/LOGGING-STANDARDS.md` — Logging configuration

## Best Practices

- [ ] Never commit sensitive values (.env should be .gitignored)
- [ ] Validate configuration on startup
- [ ] Use environment variables for secrets
- [ ] Provide clear defaults
- [ ] Document all configuration options
- [ ] Support environment-specific configs
- [ ] Validate env vars immediately after load
- [ ] Fail fast on invalid configuration

## Integration Points

- **API** (`src/api/`): Loads API configuration
- **Database** (`src/database/`): Loads DB connection config
- **LLM** (`src/llm/`): Loads LLM provider config
- **Services** (`src/services/`): Access config for feature flags
