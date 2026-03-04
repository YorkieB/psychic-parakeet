# Vision Engine

AI-powered home vision system with face recognition, spatial memory, and GPT-4o Vision integration.

## Features

- **Face Recognition**: 99.38% accurate local face recognition
- **Vision API Integration**: GPT-4o Vision for scene analysis
- **Smart Triggering**: 90% cost reduction through intelligent frame analysis
- **Spatial Memory**: Track people and objects across rooms
- **Privacy-First**: UK GDPR compliant with local biometric processing
- **Event-Driven Architecture**: Modular and extensible design

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL 13+ with TimescaleDB
- Redis 6+
- Camera (Obsbot Tiny 2 or ONVIF compatible)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy environment template:
   ```bash
   cp .env.example .env
   ```

4. Configure `.env` with your settings:
   - API keys (OpenAI, Anthropic)
   - Database credentials
   - Camera IP address
   - API authentication key

5. Initialize database:
   ```bash
   createdb vision_engine
   python -m src.database.migrations
   ```

6. Run the application:
   ```bash
   python src/main.py
   ```

Or start the API server:
```bash
python src/api/server.py
```

## Project Structure

```
vision-engine/
├── src/
│   ├── camera/          # Camera integration
│   ├── vision/          # Vision processing
│   ├── database/        # Database models and connection
│   ├── features/        # Feature modules
│   ├── core/            # Core engine components
│   ├── api/             # Flask API server
│   └── utils/           # Utility functions
├── config/              # Configuration files
├── data/                # Data storage
├── tests/               # Test suite
└── docker/              # Docker deployment files
```

## API Endpoints

All endpoints require API key authentication via `X-API-Key` header (except `/health`).

- `GET /health` - Health check
- `GET /api/v1/status` - Engine status and statistics
- `POST /api/v1/privacy/mode` - Toggle privacy mode
- `GET /api/v1/faces` - List known faces
- `POST /api/v1/faces` - Add new known face
- `GET /api/v1/locations` - Get current locations
- `GET /api/v1/events` - Get event history
- `POST /api/v1/data/export` - Export user data (GDPR)
- `POST /api/v1/data/delete` - Delete user data (GDPR)

## Configuration

See `.env.example` for all configuration options.

## Security

- API key authentication on all endpoints
- CORS restrictions
- Input validation on file uploads
- Encrypted sensitive data storage
- Audit logging

## License

See LICENSE file for details.
