# LLM Module

## Overview

The LLM module provides unified abstractions and utilities for interacting with Large Language Models from multiple providers (OpenAI, Anthropic, Google Vertex AI, etc.). It abstracts provider-specific APIs into a consistent interface.

## Architecture

```
Application Code
        ↓
    LLM Client (unified interface)
        ↓
    Provider Adapters
        ├── OpenAI Adapter
        ├── Anthropic Adapter
        ├── Vertex AI Adapter
        ├── Ollama Adapter (local)
        └── Custom Providers
        ↓
    External LLM Services / Local Models
```

## Key Components

- **LLM Client** (`client.ts`): Unified interface for all LLM interactions
- **Providers** (`providers/`): Adapter implementations for each LLM service
- **Models** (`models.ts`): Model definitions and capabilities registry
- **Streaming** (`streaming.ts`): Handle streaming responses from LLMs
- **Caching** (`cache.ts`): Cache responses to reduce API calls and costs
- **Rate Limiting** (`rate-limit.ts`): Respect provider rate limits

## Supported Models

### OpenAI
- `gpt-4` — Most capable, higher cost
- `gpt-4-turbo` — Fast, balanced capability/cost
- `gpt-3.5-turbo` — Fast, affordable

### Anthropic
- `claude-3-opus` — Most capable
- `claude-3-sonnet` — Balanced
- `claude-3-haiku` — Fast, affordable

### Google Vertex AI
- Custom fine-tuned models
- Medlm (specialized domains)

### Local/Self-Hosted
- `ollama:llama2` — Open-source LLM
- `ollama:mistral` — Fast inference

## Usage

### Basic Text Generation

```typescript
import { getLLMClient } from './client';

const client = getLLMClient();

const response = await client.generate({
  model: 'gpt-4',
  prompt: 'Explain quantum computing',
  maxTokens: 500,
  temperature: 0.7
});

console.log(response.text);
```

### Streaming Responses

```typescript
const stream = await client.generateStream({
  model: 'gpt-4',
  prompt: 'Tell a story...',
});

stream.on('token', (token) => {
  process.stdout.write(token);
});

await stream.done();
```

### Vision (Multimodal)

```typescript
const response = await client.generateWithVision({
  model: 'gpt-4-vision',
  prompt: 'What is in this image?',
  images: ['image.jpg', 'image2.jpg']
});
```

### Function Calling

```typescript
const response = await client.generateWithFunctions({
  model: 'gpt-4',
  prompt: 'Schedule a meeting for tomorrow at 2 PM',
  functions: [
    {
      name: 'schedule_meeting',
      description: 'Schedule a meeting',
      parameters: { /* ... */ }
    }
  ]
});

// response.functions contains called functions
```

## Configuration

```env
# Default provider
LLM_PROVIDER=openai
LLM_MODEL=gpt-4

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Vertex AI
GOOGLE_PROJECT_ID=your-project
GOOGLE_LOCATION=us-central1

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434

# Caching
LLM_CACHE_ENABLED=true
LLM_CACHE_TTL=3600

# Rate limiting
LLM_RATE_LIMIT=100  # requests per minute
LLM_BATCH_SIZE=10
```

## Related Standards

- `.github/docs/quality/PERFORMANCE-STANDARDS.md` — LLM performance targets
- `.github/docs/logic/ASYNC-FLOW-CORRECTNESS.md` — Async streaming patterns
- `.github/docs/error-handling/RETRY-LOGIC-STANDARDS.md` — Retry strategies

## Cost Optimization

### Caching
Responses are cached by default to reduce API calls:

```typescript
const client = getLLMClient({ cache: true, cacheTTL: 3600 });
```

### Prompt Engineering
Use tokens efficiently with focused prompts to reduce costs.

### Model Selection
- Use `gpt-3.5-turbo` for simple tasks
- Use `gpt-4` only when necessary
- Use local `ollama` for development

### Batching
Process multiple requests in batch to use cheaper batch APIs:

```typescript
const results = await client.batch(requests);
```

## Integration Points

- **Agents** (`src/agents/`): Agents use LLM for reasoning
- **Reasoning** (`src/reasoning/`): Reasoning engines depend on LLM
- **Voice** (`src/voice/`): Text-to-speech synthesis
- **Services** (`src/services/`): General service layer
