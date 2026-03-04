# Quick Fix for Blank Window

## Issue
The Jarvis desktop app window is open but showing blank/white screen.

## Solutions

### Solution 1: Start the Backend (Required!)

The desktop app needs the Jarvis backend to be running:

```powershell
# Open a NEW PowerShell window
cd "C:\Users\conta\Jarvis Ochestrator"
npm start
```

Keep this window open - the backend must stay running!

### Solution 2: Run in Development Mode (Easier to Debug)

Instead of the packaged app, run in development mode:

```powershell
cd "C:\Users\conta\Jarvis Ochestrator\jarvis-desktop"
npm run dev
```

This will:
- Start Vite dev server (port 5173)
- Launch Electron
- Show developer tools automatically
- Hot-reload on changes

### Solution 3: Check Console for Errors

If the app is running, press `F12` or `Ctrl+Shift+I` to open developer tools and check for errors.

## Expected Behavior

When working correctly, you should see:
- ✅ Header with "Jarvis" logo and search
- ✅ Menu bar with 12 agent icons
- ✅ Voice visualizer section
- ✅ Conversation panel
- ✅ Status cards at bottom
- ✅ Status bar showing "All systems online"

## If Still Blank

1. **Check backend is running:**
   ```powershell
   Test-NetConnection localhost -Port 3000
   ```

2. **Check Electron console:**
   - Right-click in the app window
   - Select "Inspect Element"
   - Check Console tab for errors

3. **Rebuild the app:**
   ```powershell
   cd "C:\Users\conta\Jarvis Ochestrator\jarvis-desktop"
   npm run build
   ```

4. **Run from source (dev mode):**
   ```powershell
   npm run dev
   ```

---

**Most likely fix: Start the backend with `npm start` in the main project folder!**
