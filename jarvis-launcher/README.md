# 🚀 JARVIS Desktop Launcher

A beautiful, KITT-inspired desktop launcher for the JARVIS AI Assistant system.

## Features

- 🎨 **KITT-Inspired Design** - Classic Knight Rider red theme
- ⚡ **One-Click Launch** - Start backend and frontend with a single click
- 🎯 **Flexible Options** - Launch desktop only, backend only, or both
- 🖼️ **Frameless Window** - Modern, transparent design
- ⌨️ **Keyboard Shortcuts** - Quick access (Enter, Space, Esc)
- 🔴 **Animated Scanner** - Classic KITT scanning effect

## Installation

```powershell
cd jarvis-launcher
npm install
```

## Usage

### Development Mode
```powershell
npm start
```

### Build Executable

**Windows:**
```powershell
npm run build:win
```

**macOS:**
```powershell
npm run build:mac
```

**Linux:**
```powershell
npm run build:linux
```

## Launch Options

### 1. Launch Complete System (Recommended)
- Starts backend server first
- Waits 3 seconds for backend to initialize
- Launches desktop app
- Both run in background

### 2. Launch Desktop Only
- Starts only the Jarvis desktop app
- Backend must already be running

### 3. Launch Backend Only
- Starts only the backend server
- Good for development or debugging

## Keyboard Shortcuts

- `Enter` or `Space` - Launch complete system
- `Esc` - Close launcher
- `Click & Drag` - Move window

## Visual Design

### KITT-Inspired Elements
- **Red Color Scheme** - Classic Knight Rider red (#ff0000)
- **Scanning Animation** - Moving red bar at bottom
- **Pulsing Logo** - Animated JARVIS logo
- **Gradient Background** - Dark with red accents
- **Glowing Effects** - Text shadows and box shadows

### Layout
```
┌────────────────────────────────────────┐
│ KNIGHT INDUSTRIES AI SYSTEM      ○ ● │ Title Bar
├────────────────────────────────────────┤
│                                        │
│           ╔════════════╗               │
│           ║  J.A.R.V.I.S  ║             │ Logo
│           ╚════════════╝               │
│                                        │
│   Just A Rather Very Intelligent System │
│                                        │
│   [ 🚀 Launch Complete System ]       │
│   [ 💻 Launch Desktop Only     ]       │ Buttons
│   [ ⚙️ Launch Backend Only     ]       │
│                                        │
│   ═══════════════════                 │ Scanner
│                                        │
│        READY FOR DEPLOYMENT           │ Status
└────────────────────────────────────────┘
```

## Configuration

The launcher stores settings in:
- **Windows:** `%APPDATA%/jarvis-launcher/config.json`
- **macOS:** `~/Library/Application Support/jarvis-launcher/config.json`
- **Linux:** `~/.config/jarvis-launcher/config.json`

### Default Paths
```json
{
  "jarvisPath": "../jarvis-desktop",
  "backendPath": ".."
}
```

You can modify these in the app or manually edit the config file.

## Distribution

After building, executables will be in:
- **Windows:** `dist/JARVIS Launcher Setup x.x.x.exe` (installer)
- **Windows Portable:** `dist/JARVIS Launcher x.x.x.exe` (no install)
- **macOS:** `dist/JARVIS Launcher-x.x.x.dmg`
- **Linux:** `dist/JARVIS Launcher-x.x.x.AppImage`

## Icons

Place your custom icons in `assets/`:
- `icon.png` - 512x512 PNG (Linux, default)
- `icon.ico` - Windows icon
- `icon.icns` - macOS icon

## Technical Details

### Stack
- **Electron** - Desktop framework
- **electron-store** - Settings persistence
- **HTML/CSS/JS** - Pure vanilla (no frameworks)

### Window Settings
- **Frameless** - No standard window chrome
- **Transparent** - Fully custom design
- **Fixed Size** - 600x400 pixels
- **Always on Top** - Optional

### Launch Process
1. User clicks launch button
2. Launcher spawns detached processes
3. Processes run in background
4. Launcher closes after 2-5 seconds
5. JARVIS continues running independently

## Troubleshooting

### "Module not found" error
```powershell
cd jarvis-launcher
npm install
```

### Launcher doesn't find Jarvis
Edit paths in `main.js`:
```javascript
const jarvisPath = 'C:/path/to/jarvis-desktop';
const backendPath = 'C:/path/to/jarvis-orchestrator';
```

### Build errors
Install electron-builder globally:
```powershell
npm install -g electron-builder
```

## Development

### File Structure
```
jarvis-launcher/
├── main.js           # Electron main process
├── index.html        # Launcher UI
├── package.json      # Dependencies & build config
├── assets/           # Icons
│   ├── icon.png
│   ├── icon.ico
│   └── icon.icns
└── README.md         # This file
```

### Customization

**Change Colors:**
Edit CSS variables in `index.html`:
```css
/* Change from red to blue */
#ff0000 → #0000ff

/* Change from red to amber (Cylon) */
#ff0000 → #ffaa00
```

**Change Launch Behavior:**
Edit `main.js` IPC handlers to customize launch logic.

## Credits

**Design Inspiration:** Knight Rider (1982) - KITT
**Created for:** JARVIS AI Assistant
**Author:** Yorkie
**License:** MIT

---

## 🚗 "Michael, I am ready for deployment!"

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Theme:** KITT (Knight Rider)
**Coolness Factor:** 💯

Press Enter or click "Launch Complete System" to start JARVIS!
