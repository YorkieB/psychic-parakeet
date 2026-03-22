# Module: LLM Integration

**Location**: `src/llm/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The LLM Integration module provides a unified interface to multiple Large Language Model providers (Claude, GPT, Vertex AI). It abstracts provider-specific implementations, handles token management, manages API credentials securely, and provides request/response streaming and caching.

## Key Exports

- `LlmProvider` — Base provider interface
- `ClaudeProvider` — Anthropic Claude integration
- `GptProvider` — OpenAI GPT integration
- `VertexAiProvider` — Google Vertex AI integration
- `ProviderFactory` — Factory for creating providers

## Dependencies

- Internal: `config`, `security`, `services`
- External: `anthropic`, `openai`, `@google-cloud/vertexai`

## Usage

```typescript
import { ProviderFactory } from './llm';

const provider = ProviderFactory.create('claude', { apiKey: '...' });
const response = await provider.complete({ prompt: 'Hello' });
```

## Changelog

### 2026-03-22
- Initial documentation
