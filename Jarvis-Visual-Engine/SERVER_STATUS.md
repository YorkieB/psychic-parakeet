# API Server Status

## Starting the Server

The API server is being started. Here's how to access it:

### Start Command
```bash
python start_api_server.py
```

Or directly:
```bash
python -m src.api.server
```

### Server Endpoints

Once running, the server will be available at:

**Base URL:** `http://localhost:5000`

**Available Endpoints:**

1. **Status Check** (No auth required)
   ```
   GET http://localhost:5000/api/v1/status
   ```

2. **Intelligence Insights** (Requires API key)
   ```
   GET http://localhost:5000/api/v1/intelligence/insights
   Headers: X-API-Key: YOUR_API_KEY
   ```

3. **Spatial Memory Query** (Requires API key)
   ```
   POST http://localhost:5000/api/v1/spatial/query
   Headers: X-API-Key: YOUR_API_KEY
   Body: {"query": "Where are people?"}
   ```

4. **Proactive Suggestions** (Requires API key)
   ```
   GET http://localhost:5000/api/v1/intelligence/suggestions
   Headers: X-API-Key: YOUR_API_KEY
   ```

5. **Context Awareness** (Requires API key)
   ```
   GET http://localhost:5000/api/v1/intelligence/context
   Headers: X-API-Key: YOUR_API_KEY
   ```

### Testing the Server

**PowerShell:**
```powershell
# Status check
Invoke-WebRequest -Uri "http://localhost:5000/api/v1/status"

# With API key
$headers = @{"X-API-Key" = "YOUR_API_KEY"}
Invoke-WebRequest -Uri "http://localhost:5000/api/v1/intelligence/insights" -Headers $headers
```

**curl:**
```bash
curl http://localhost:5000/api/v1/status
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:5000/api/v1/intelligence/insights
```

**Browser:**
Just open: `http://localhost:5000/api/v1/status`

### WebSocket Support

The server also supports WebSocket connections for real-time updates:
- **URL:** `ws://localhost:5000`
- **Events:** Subscribe to vision events, motion detection, etc.

### Server Configuration

- **Host:** 0.0.0.0 (all interfaces)
- **Port:** 5000
- **Debug Mode:** Enabled in development

### Note

The server may take a few seconds to start up. If you see connection errors, wait a moment and try again.

The server runs in the foreground by default - you'll see all logs and can stop it with Ctrl+C.
