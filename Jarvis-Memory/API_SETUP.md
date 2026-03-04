# Jarvis Memory System API Setup

This document explains how to set up and run the Python API server for the Jarvis Memory System.

## Prerequisites

1. Python 3.8 or higher
2. pip package manager

## Installation

1. Navigate to the Jarvis-Memory directory:
```bash
cd Jarvis-Memory
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

Note: The memory system uses only Python standard library for core functionality, but Flask is required for the API server.

## Configuration

Set environment variables (optional, defaults shown):

```bash
# API Server Configuration
export MEMORY_API_PORT=3035
export MEMORY_API_HOST=0.0.0.0

# Memory System Configuration
export MEMORY_STM_MAX_SIZE=500
export MEMORY_MTM_MAX_SIZE=5000
export MEMORY_LTM_MAX_SIZE=100000
```

## Running the API Server

### Option 1: Direct Python execution
```bash
python api_server.py
```

### Option 2: Using Flask development server
```bash
export FLASK_APP=api_server.py
flask run --host=0.0.0.0 --port=3035
```

### Option 3: Using gunicorn (production)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:3035 api_server:app
```

## API Endpoints

Once running, the API will be available at `http://localhost:3035`:

- `GET /health` - Health check
- `GET /api` - API information
- `POST /api/ingest` - Ingest a new memory
- `POST /api/query` - Query memories across all tiers
- `POST /api/consolidate` - Run consolidation pipeline (STM → MTM → LTM)
- `GET /api/stats` - Get system statistics
- `GET /api/stm/recent` - Get recent STM memories
- `POST /api/stm/search` - Search STM memories

## Example Requests

### Ingest a Memory
```bash
curl -X POST http://localhost:3035/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I work at Google",
    "user_id": "user123",
    "emotion": "neutral",
    "context": "work",
    "importance_score": 0.8
  }'
```

### Query Memories
```bash
curl -X POST http://localhost:3035/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Google",
    "user_id": "user123",
    "top_k": 10
  }'
```

### Consolidate Memories
```bash
curl -X POST http://localhost:3035/api/consolidate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123"
  }'
```

### Get Statistics
```bash
curl http://localhost:3035/api/stats?user_id=user123
```

## Integration with Orchestrator

The TypeScript `MemorySystemAgent` will automatically connect to this Python API server. Make sure:

1. The Python API server is running before starting the orchestrator
2. The `MEMORY_SYSTEM_API_URL` environment variable matches the Python API URL (default: `http://localhost:3035`)
3. The `MEMORY_SYSTEM_AGENT_PORT` is set to the TypeScript agent port (default: `3036`)

## Memory System Architecture

The Jarvis Memory System implements a three-tier architecture:

1. **STM (Short-Term Memory)**: Recent memories (<1 hour), capacity: 500
2. **MTM (Medium-Term Memory)**: Important memories with vector search (1 hour - 60 days), capacity: 5000
3. **LTM (Long-Term Memory)**: Consolidated facts with deduplication (permanent), capacity: 100,000

### Data Flow

1. **Ingestion**: New memories are added to STM
2. **Consolidation**: Stale STM memories move to MTM, patterns in MTM consolidate to LTM
3. **Query**: Searches across all tiers and returns top results

## Troubleshooting

### Port already in use
If port 3035 is already in use, change it:
```bash
export MEMORY_API_PORT=3037
```

### Import errors
Make sure all Python files from the original Jarvis Memory directory are present:
- `jarvis_memory_system.py`
- `memory.py`
- `short_term_memory.py`
- `medium_term_memory.py`
- `long_term_memory.py`
- `integration_stm_to_mtm.py`
- `vector_search.py`
- `pattern_detection.py`
- `consolidation.py`
- `deduplication.py`

### Module not found
Ensure you're running from the Jarvis-Memory directory or the Python path includes it.

## Production Deployment

For production, consider:

1. Using a process manager like `systemd` or `supervisord`
2. Running behind a reverse proxy (nginx, Apache)
3. Using gunicorn with multiple workers
4. Setting up proper logging and monitoring
5. Implementing authentication/authorization if needed
6. Persisting memory data to a database (currently in-memory only)
