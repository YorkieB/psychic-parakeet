# Jarvis Desktop Application

Modern desktop application for the Jarvis AI Assistant built with Electron + React + TypeScript.

## Features

- 🎨 Modern, clean UI with dark mode
- 🎤 Voice input/output with visualizer
- 💬 Real-time conversation interface
- 📊 Status cards for all agents
- 🎵 Music player with 100-bar sound visualizer
- 📧 Email, Calendar, Finance panels
- ⚙️ Settings and customization

## Prerequisites

- Node.js 18+ (20+ recommended)
- For full features (chat, agents, LLM): Jarvis backend running on `http://localhost:3000`

## Installation

```bash
cd jarvis-desktop
npm install
```

If install fails at postinstall (electron-builder), run `npm install --ignore-scripts` then `npm install --include=dev` to ensure dev dependencies are installed.

## Development

```bash
# Start Vite dev server and Electron (one command)
npm run dev
```

The app opens in a window; with no backend you’ll see “Backend offline” and can still use the UI. Start the main Jarvis server (e.g. `npm run dev` in the repo root) on port 3000 for chat, agents, and LLM status.

To run Vite and Electron separately: `npm run dev:vite` (then in another terminal) `npm run dev:electron`. To open DevTools in development: `OPEN_DEVTOOLS=1 npm run dev` (Windows: `set OPEN_DEVTOOLS=1 && npm run dev`).

**Port 5173:** The dev server uses port 5173. If it’s already in use, stop the other process or `npm run dev` will fail. On Windows you can free it with `netstat -ano | findstr ":5173"` then `taskkill /F /PID <pid>`.

## Building

```bash
# Build for production
npm run build

# Package for distribution
npm run package        # All platforms
npm run package:win    # Windows only
npm run package:mac    # macOS only
npm run package:linux  # Linux only
```

## Project Structure

```
jarvis-desktop/
├── src/
│   ├── main/          # Electron main process
│   ├── renderer/      # React frontend
│   └── preload/       # Electron preload script
├── public/            # Static assets
└── scripts/           # Build scripts
```

## Configuration

Create `.env` file:

```bash
VITE_JARVIS_API_URL=http://localhost:3000
NODE_ENV=development
```

## Keyboard Shortcuts

- `Space` - Hold to speak (voice input)
- `Ctrl/Cmd + Space` - Activate voice (from system tray)

## License

MIT
