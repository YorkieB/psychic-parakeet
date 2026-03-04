# Jarvis Visual Engine - Orchestrator Integration

This document explains how the Jarvis Visual Engine integrates with the Jarvis Orchestrator.

## Overview

The Visual Engine is a Python-based service that provides:
- **Face Recognition**: 99.38% accurate local face recognition
- **Vision API Integration**: GPT-4o Vision for scene analysis
- **Smart Triggering**: 90% cost reduction through intelligent frame analysis
- **Spatial Memory**: Track people and objects across rooms
- **Privacy-First**: UK GDPR compliant with local biometric processing

## Architecture

The Visual Engine runs as a standalone Python Flask API server, and the Orchestrator connects to it via a TypeScript agent wrapper.

```
┌─────────────────────┐
│  Orchestrator       │
│  (TypeScript)       │
└──────────┬──────────┘
           │
           │ HTTP/REST
           │
┌──────────▼──────────┐
│ VisualEngineAgent   │
│ (TypeScript)        │
│ Port: 3037          │
└──────────┬──────────┘
           │
           │ HTTP/REST
           │
┌──────────▼──────────┐
│ Visual Engine API   │
│ (Python Flask)      │
│ Port: 5000          │
└─────────────────────┘
```

## Prerequisites

1. Python 3.10+
2. PostgreSQL 13+ with TimescaleDB (optional, for persistence)
3. Redis 6+ (optional, for caching)
4. Camera (Obsbot Tiny 2 or ONVIF compatible, or USB webcam)

## Setup

### 1. Install Python Dependencies

```bash
cd Jarvis-Visual-Engine
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the environment template:
```bash
cp ENV_EXAMPLE.txt .env
```

Edit `.env` with your settings:
- `OPENAI_API_KEY` - For GPT-4o Vision
- `ANTHROPIC_API_KEY` - For Claude Vision (optional)
- `API_KEY` - API authentication key
- `DATABASE_URL` - PostgreSQL connection string (optional)
- `REDIS_URL` - Redis connection string (optional)
- `CAMERA_TYPE` - Camera type (usb, obsbot, onvif)
- `CAMERA_IP` - Camera IP address (for ONVIF)

### 3. Initialize Database (Optional)

If using PostgreSQL:
```bash
createdb vision_engine
python setup_database.py
```

### 4. Start Redis (Optional)

If using Redis for caching:
```bash
# Windows
.\start_redis_simple.ps1

# Linux/Mac
redis-server
```

### 5. Start the Visual Engine API Server

```bash
python start_api_server.py
```

Or:
```bash
python src/api/server.py
```

The API server will start on port 5000 (configurable via `SERVER_PORT` in `.env`).

## Configuration

Set environment variables for the Orchestrator:

```bash
# Visual Engine API Configuration
VISUAL_ENGINE_API_URL=http://localhost:5000
VISUAL_ENGINE_API_KEY=your_api_key_here
VISUAL_ENGINE_AGENT_PORT=3037
VISUAL_ENGINE_TIMEOUT=60000
```

## API Endpoints

The Visual Engine API provides the following endpoints (all require API key except `/health`):

### Health Check
- `GET /health` - Health check (no auth required)
- `GET /api/v1/health` - Health check with details

### Analysis
- `POST /api/v1/analyze` - Manually trigger AI vision analysis

### Status & Information
- `GET /api/v1/status` - Engine status and statistics
- `GET /api/v1/system/info` - System information

### Face Recognition
- `GET /api/v1/faces` - List known faces
- `POST /api/v1/faces` - Add new known face

### Spatial Memory
- `GET /api/v1/locations` - Get current locations
- `POST /api/v1/spatial/query` - Query spatial memory

### Events
- `GET /api/v1/events` - Get event history

### Intelligence
- `GET /api/v1/intelligence/insights` - Get intelligence insights

### Privacy
- `POST /api/v1/privacy/mode` - Toggle privacy mode

## TypeScript Agent Endpoints

The Orchestrator agent provides simplified endpoints that proxy to the Python API:

- `POST /api/analyze` - Trigger visual analysis
- `GET /api/status` - Get engine status
- `GET /api/faces` - List known faces
- `POST /api/faces` - Add new face
- `GET /api/locations` - Get locations
- `GET /api/events` - Get events
- `POST /api/spatial/query` - Query spatial memory
- `GET /api/intelligence/insights` - Get insights

## Example Usage

### Trigger Analysis via Orchestrator

```bash
curl -X POST http://localhost:3037/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req-123",
    "inputs": {}
  }'
```

### Get Status

```bash
curl http://localhost:3037/api/status
```

### Add Face

```bash
curl -X POST http://localhost:3037/api/faces \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req-124",
    "inputs": {
      "name": "John Doe",
      "imageData": "base64_encoded_image_data"
    }
  }'
```

## Troubleshooting

### API Server Won't Start

1. Check if port 5000 is available:
   ```bash
   netstat -an | findstr :5000
   ```

2. Check Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Check database connection (if using PostgreSQL):
   ```bash
   python check_postgres.py
   ```

### Camera Not Connecting

1. Check camera configuration in `.env`
2. Test camera connection:
   ```bash
   python test_camera_simple.py
   ```

3. List available USB cameras:
   ```bash
   python src/utils/list_usb_cameras.py
   ```

### Face Recognition Not Working

1. Ensure dlib is installed:
   ```bash
   pip install dlib
   ```

2. Check face recognition setup:
   ```bash
   python check_face_recognition.py
   ```

## Production Deployment

For production, consider:

1. Using a process manager (systemd, supervisord, PM2)
2. Running behind a reverse proxy (nginx, Apache)
3. Using gunicorn with multiple workers:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 "src.api.server:app"
   ```
4. Setting up proper logging and monitoring
5. Implementing rate limiting
6. Using HTTPS/TLS
7. Setting up database backups

## Security Notes

- All endpoints (except `/health`) require API key authentication
- API key is passed via `X-API-Key` header
- CORS is configured to restrict origins
- File uploads are validated and sanitized
- Sensitive data is encrypted in storage
- Audit logging is enabled

## Integration Checklist

- ✅ Visual Engine API server running on port 5000
- ✅ Environment variables configured
- ✅ Database initialized (if using PostgreSQL)
- ✅ Redis running (if using caching)
- ✅ Camera connected and tested
- ✅ Orchestrator environment variables set
- ✅ TypeScript agent registered in orchestrator

## Next Steps

1. Start the Visual Engine API server
2. Start the Orchestrator
3. Test the integration via the Orchestrator endpoints
4. Configure camera and face recognition
5. Set up monitoring and logging
