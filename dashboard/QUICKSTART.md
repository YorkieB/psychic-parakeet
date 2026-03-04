# Quick Start Guide

## 🚀 Get the Dashboard Running in 3 Steps

### Step 1: Install Dependencies

```bash
cd dashboard
npm install
```

### Step 2: Start Jarvis Backend

Make sure your Jarvis backend is running on `http://localhost:3000` with the self-healing infrastructure enabled.

### Step 3: Start Dashboard

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## ✅ What You'll See

1. **System Health Overview** - Top of the page showing overall system health
2. **Agent Grid** - All 29 agents displayed in cards with real-time health scores
3. **Health Chart** - Time-series graph showing health trends
4. **Event Feed** - Live stream of agent lifecycle events
5. **Control Panel** - Manual controls for managing agents

## 🎯 Key Features

- **Real-time Updates**: Dashboard updates every 30 seconds via API polling
- **WebSocket Events**: Instant notifications when agents spawn, crash, or respawn
- **Click Agents**: Click any agent card to see detailed metrics
- **Manual Controls**: Respawn or kill agents with one click
- **Export Data**: Export health reports and event logs

## 🔧 Troubleshooting

### Dashboard shows "Disconnected"

- Check that Jarvis backend is running on port 3000
- Verify WebSocket connection in browser console
- Check CORS settings if running on different ports

### No agents showing

- Ensure self-healing infrastructure is initialized in Jarvis
- Check that agents are spawned via `AgentPoolManager`
- Verify API endpoint `/health/agents` is accessible

### WebSocket not connecting

- Check `VITE_WS_URL` in `.env` file
- Verify Socket.IO is enabled in Jarvis backend
- Check browser console for connection errors

## 📊 Next Steps

- Monitor agent health in real-time
- Set up alerts for critical agents
- Review repair history
- Export health reports for analysis

Enjoy your self-healing dashboard! 🎉
