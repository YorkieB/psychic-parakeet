# Streaming Code Knowledge Base

## Overview

The knowledge base provides on-demand access to The Stack v2 and Software Heritage S3 for generating code fixes. It uses streaming architecture to avoid bulk downloads.

## Architecture

```
Bug Detected
    ↓
Extract Keywords & Error Type
    ↓
Stream Stack v2 Metadata (HuggingFace)
    ↓
Filter by Language + License + Keywords
    ↓
Fetch Top 50 Candidates from S3
    ↓
Cache Results
    ↓
Score Relevance
    ↓
RAG Pipeline (LLM + Examples)
    ↓
Generate Fix
```

## Components

### Stack v2 Streaming Client
- Streams metadata from HuggingFace without downloading
- Filters by language, license, path patterns
- No bulk download required

### Software Heritage S3 Client
- Fetches code content from public S3 bucket
- Batch fetching with concurrency control
- Rate limiting and retry logic

### Code Search Engine
- Combines Stack v2 metadata + S3 content
- Relevance scoring
- License filtering

### Cache Manager
- Redis (preferred) or in-memory fallback
- LRU eviction
- TTL-based expiration

### RAG Pipeline
- Combines code examples with LLM
- Generates fixes with confidence scores
- Includes source attribution

## Usage

```typescript
import { KnowledgeBaseFactory } from './knowledge/knowledge-base-factory';
import { DiagnosticEngine } from './diagnostic/diagnostic-engine';
import { createLogger } from '../../utils/logger';
import { OpenAIClient } from '../../llm';

// Initialize
const logger = createLogger('KnowledgeBase');
const llm = new OpenAIClient(logger);
const components = await KnowledgeBaseFactory.create(logger, llm);

// Create diagnostic engine
const diagnostic = new DiagnosticEngine(logger, components.ragPipeline);

// Diagnose issue
const diagnosis = await diagnostic.diagnose(healthEvent);

// Use diagnosis
if (diagnosis.confidence > 0.7) {
  // Apply fix
  console.log(diagnosis.fixCode);
}
```

## Configuration

Environment variables:

```bash
# Hugging Face (optional, for private datasets)
HUGGINGFACE_TOKEN=your_token

# Redis (optional, falls back to memory cache)
REDIS_URL=redis://localhost:6379

# OpenAI (required for RAG)
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4

# Cache settings
CACHE_TTL_HOURS=24
MAX_CACHE_SIZE_MB=1000

# Search settings
MAX_SEARCH_RESULTS=50
RELEVANCE_THRESHOLD=0.3
```

## Performance

- **Search latency**: 2-5 seconds (50 S3 fetches)
- **Cache hit rate**: ~80% after warmup
- **Fix generation**: 10-30 seconds end-to-end
- **Storage**: ~1GB cache (vs 250GB full download)

## License Compliance

- Only uses permissive licenses (MIT, Apache, BSD)
- Filters out copyleft licenses
- All fetched code cached with license metadata
- Source attribution included in fixes

## Testing

```bash
# Run tests
npm test -- knowledge

# Test Stack v2 streaming
npm test -- stack-v2-streaming

# Test S3 fetching
npm test -- swh-s3-fetch
```

## Troubleshooting

### HuggingFace connection issues
- Check network connectivity
- Verify HuggingFace token if using private datasets
- Streaming mode doesn't require full download

### S3 fetch failures
- Check rate limiting (429 errors)
- Verify blob IDs are valid
- Check network connectivity to S3

### Low cache hit rate
- Increase cache size
- Check Redis connection
- Verify TTL settings

### Low confidence fixes
- Increase relevance threshold
- Add more keywords to search
- Check LLM API key and quota
