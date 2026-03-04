# Jarvis Self-Healing Dashboard

Real-time dashboard for monitoring and controlling the Jarvis v4 self-healing infrastructure.

## Features

- **Real-time Monitoring**: Live updates via WebSocket for all 29 agents
- **Health Visualization**: Charts and graphs showing agent health trends
- **Event Feed**: Real-time stream of agent lifecycle events
- **Manual Controls**: Respawn, kill, and manage agents manually
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: System-style dashboard with dark mode

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Jarvis backend running on `http://localhost:3000`

### Installation

```bash
cd dashboard
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Project Structure

```
dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── AgentCard.tsx
│   │   ├── AgentGrid.tsx
│   │   ├── AgentDetailModal.tsx
│   │   ├── HealthOverview.tsx
│   │   ├── HealthChart.tsx
│   │   ├── EventFeed.tsx
│   │   ├── ControlPanel.tsx
│   │   └── AlertBanner.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAgentHealth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useHealthHistory.ts
│   │   └── useRepairHistory.ts
│   ├── contexts/           # React contexts
│   │   └── HealthContext.tsx
│   ├── api/                # API client
│   │   └── healthApi.ts
│   ├── types/              # TypeScript types
│   │   ├── agent.types.ts
│   │   ├── health.types.ts
│   │   └── event.types.ts
│   ├── utils/              # Utility functions
│   │   ├── healthCalculations.ts
│   │   ├── colorUtils.ts
│   │   └── timeUtils.ts
│   ├── pages/              # Page components
│   │   └── DashboardPage.tsx
│   ├── styles/             # Global styles
│   │   └── index.css
│   └── main.tsx            # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## API Integration

The dashboard connects to the Jarvis backend health API:

- `GET /health/agents` - Get all agent statuses
- `GET /health/agents/:name` - Get specific agent status
- `POST /health/agents/:name/respawn` - Respawn an agent
- `POST /health/agents/:name/kill` - Kill an agent
- `GET /health/agents/:name/metrics` - Get agent metrics
- `GET /health/agents/:name/history` - Get agent spawn history

## WebSocket Events

The dashboard listens for real-time events:

- `agent_spawned` - Agent was spawned
- `agent_crashed` - Agent crashed
- `agent_respawned` - Agent was respawned
- `agent_health_changed` - Agent health score changed
- `agent_killed` - Agent was killed
- `agent_error` - Agent encountered an error

## Features in Detail

### Agent Grid

- Displays all 29 agents in a responsive grid
- Grouped by category (Core, Specialized, Creative, Technical, Voice)
- Search and filter by name or status
- Sort by health, name, or activity
- Click any agent card to view detailed metrics

### Health Overview

- System-wide health score
- Agent count by status (Healthy, Degraded, Critical, Offline)
- Auto-repair status
- System uptime
- Repair statistics

### Health Chart

- Time-series visualization of agent health
- Multiple time ranges (6h, 24h, 7d, 30d)
- Shows top 5 agents by health score
- Interactive tooltips and legend

### Event Feed

- Real-time stream of all agent events
- Filter by event type
- Pause/resume stream
- Export events to JSON
- Auto-scrolls to latest events

### Agent Detail Modal

- Comprehensive agent metrics
- Real-time health charts
- Lifecycle history
- Manual control buttons
- Tabbed interface for different views

### Control Panel

- Batch operations (respawn all, kill all, respawn unhealthy)
- Auto-repair toggle
- Export health reports
- System actions
- Danger zone for critical operations

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader announcements
- High contrast mode support
- Focus indicators

## Performance

- Virtual scrolling for large lists
- Debounced search/filter
- Lazy loading of agent details
- Memoized calculations
- Efficient re-renders with React.memo
- WebSocket reconnection logic

## License

Part of the Jarvis v4 Multi-Agent AI Assistant project.
