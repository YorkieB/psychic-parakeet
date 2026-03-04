# Jarvis Desktop - Setup Instructions

## Quick Start

### 1. Install Dependencies

```bash
cd jarvis-desktop
npm install
```

### 2. Create Environment File

Create `.env` in the `jarvis-desktop` directory:

```bash
VITE_JARVIS_API_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Add Icon Files

Place icon files in `public/icons/`:
- `icon.png` (256x256) - Main app icon
- `icon.ico` (Windows) - Windows icon
- `icon.icns` (macOS) - macOS icon
- `tray-icon.png` (16x16) - System tray icon

**Note:** You can use placeholder icons for now. The app will work without them, but they're needed for production builds.

### 4. Add Sound Files (Optional)

Place sound files in `public/sounds/`:
- `notification.mp3` - Notification sound
- `voice-beep.mp3` - Voice activation beep

### 5. Start Development

```bash
# Start both React and Electron
npm run dev

# Or separately:
npm run dev:react    # React dev server (port 5173)
npm run dev:electron # Electron app
```

## Prerequisites

1. **Backend Running**: Ensure your Jarvis backend is running on `http://localhost:3000`
2. **Node.js**: Version 20 or higher
3. **All Agents Running**: Make sure all 12 agents are started and accessible

## Build for Production

```bash
# Build the application
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
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   ├── ipc-handlers.ts # IPC communication
│   │   ├── tray.ts        # System tray
│   │   └── window-manager.ts
│   ├── renderer/          # React frontend
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API clients
│   │   ├── store/         # Zustand stores
│   │   └── styles/       # CSS files
│   └── preload/          # Electron preload script
├── public/               # Static assets
├── scripts/              # Build scripts
└── dist/                 # Build output
```

## Features Implemented

✅ **Core UI**
- Modern header with search and theme toggle
- Menu bar with agent icons and badges
- Status cards showing agent summaries
- Bottom status bar with system info

✅ **Voice Interface**
- Voice visualizer with 40-bar waveform
- Space key to activate voice
- Real-time audio amplitude visualization

✅ **Conversation**
- Message bubbles (user/assistant)
- Typing indicator
- Auto-scroll to latest message
- Voice input button

✅ **Music Player**
- 100-bar animated sound visualizer
- Playback controls (play, pause, skip, shuffle, repeat)
- Volume slider
- Queue management
- Album art display

✅ **Panels**
- Email panel (real Gmail integration)
- Calendar panel (real Google Calendar)
- Finance panel (real Plaid UK)
- Music panel (full player)
- Media gallery (placeholder)
- Code editor (placeholder)
- Web browser (placeholder)
- Settings panel

✅ **State Management**
- Zustand stores for all state
- Persistent settings (localStorage)
- Real-time agent status polling

✅ **Services**
- Backend API client
- Audio service (Howler.js)
- WebSocket service (for real-time updates)

## Keyboard Shortcuts

- `Space` - Hold to speak (voice input)
- `Ctrl/Cmd + Space` - Activate voice (from system tray menu)

## Troubleshooting

### App won't start
- Check that backend is running on `http://localhost:3000`
- Verify all dependencies are installed: `npm install`
- Check console for errors

### Icons not showing
- Add icon files to `public/icons/`
- For development, icons are optional

### Voice not working
- Grant microphone permissions in browser/Electron
- Check browser console for errors

### Panels not opening
- Check that panel store is initialized
- Verify imports in MainLayout.tsx

## Next Steps

1. Test all features with real backend
2. Add actual icon files
3. Customize styling if needed
4. Add any additional features from remaining parts

## Support

If you encounter issues:
1. Check browser console (DevTools)
2. Check Electron main process logs
3. Verify backend API endpoints
4. Ensure all agents are running
