# ✅ LOCAL SETUP CHECKLIST

## Before You Start
- [ ] You have Node.js installed (v16+)
- [ ] You have an Anthropic API key
- [ ] You're in the LightBrowser directory
- [ ] You have 5 minutes

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```
- [ ] Command completes without errors
- [ ] See "added X packages" message
- [ ] `/node_modules` folder created

### 2. Create Environment File
```bash
# Copy template
cp .env.example .env

# Edit .env and add your API key
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxx
```
- [ ] `.env` file created in root
- [ ] `ANTHROPIC_API_KEY` set to your actual key
- [ ] `.env` is in `.gitignore` (don't commit it!)

### 3. Start the Application
```bash
npm start
```
- [ ] Electron window opens
- [ ] LightBrowser loads
- [ ] No error messages in console
- [ ] Can browse websites normally

## Verification

### In the Application
- [ ] Open Jarvis panel (🤖 button, top right)
- [ ] Look at right sidebar
- [ ] See "🤖 Jarvis Agents" section
- [ ] See 4 agent cards:
  - [ ] 🔍 Research Agent
  - [ ] 📊 Extractor Agent
  - [ ] 🤖 Automator Agent
  - [ ] 📈 Analyst Agent
- [ ] Agent status shows (⚪ = idle, 🟡 = running)

### In DevTools Console (F12 > Console)
Test the IPC bridge:
```javascript
await window.electronAPI.invoke('jarvis:agents:init')
```
- [ ] Returns `{ success: true, agents: [...] }`
- [ ] No error messages

### Test First Workflow
In sidebar, click one of the buttons:
- [ ] "🔍 Research" button → Enter a topic
- [ ] Watch for "⏳ Running workflow..."
- [ ] See "✅ Workflow Complete"
- [ ] View Details to see results

## Enabling Detailed Logging

If something doesn't work:

```bash
# Terminal 1: Start with debug logging
DEBUG=jarvis:* npm start

# Terminal 2: Run tests in DevTools
```

Watch the terminal for debug output from agents.

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| API key errors | Verify `ANTHROPIC_API_KEY` in `.env` |
| Module not found | Run `npm install` again |
| Agent panel not showing | Check browser console (F12) for errors |
| No IPC communication | Make sure `main.js` has agent initialization |
| Agents not responding | Check `.env` file exists with valid API key |

## Success Criteria

You've successfully set up when:
1. ✅ Application starts without errors
2. ✅ Agent panel visible in sidebar
3. ✅ All 4 agents displayed
4. ✅ Can click workflow buttons
5. ✅ DevTools console shows agent responses
6. ✅ At least one workflow completes

## Next Steps

Once local setup is complete:
1. [ ] Test all 3 workflow types
2. [ ] Try with different topics/URLs
3. [ ] Read `/agents/example-usage.js` for patterns
4. [ ] Plan custom workflows
5. [ ] Wire up Jarvis voice commands

## Documentation

Need help? Check these files:
- `agents/README.md` - Complete guide
- `agents/example-usage.js` - Code examples
- `QUICK_START.js` - Quick reference
- `ARCHITECTURE.md` - System design

---

**You're now ready to use Jarvis with multi-agent Browser Use!** 🚀
