# 🚀 Start the Dashboard

## Quick Commands

```bash
# Navigate to dashboard
cd dashboard

# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

The dashboard will open at: **http://localhost:5173**

## What You'll See

1. **System Health Overview** - Top section showing overall health
2. **Agent Grid** - All 29 agents in cards with real-time health scores
3. **Health Chart** - Time-series graph (right side)
4. **Event Feed** - Live event stream (right side)
5. **Control Panel** - Manual controls at bottom

## Prerequisites

✅ Jarvis backend running on `http://localhost:3000`
✅ Self-healing infrastructure initialized
✅ Health API endpoints active
✅ WebSocket server running

## Features Ready to Use

- ✅ Real-time agent monitoring
- ✅ Health score visualization
- ✅ Event feed with filtering
- ✅ Manual respawn/kill controls
- ✅ Agent detail modals
- ✅ Export health reports
- ✅ Responsive design

## Troubleshooting

If you see TypeScript errors during build, the dev server (`npm run dev`) will still work - Vite handles types more leniently during development.

For production builds, ensure all type definitions are installed:
```bash
npm install --save-dev @types/react @types/react-dom
```

Enjoy monitoring your self-healing system! 🎉
