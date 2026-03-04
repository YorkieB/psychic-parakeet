#!/usr/bin/env node  // [NRS-1503] Node.js executable

/** [NRS-1301]
 * LOCAL SETUP GUIDE [NRS-1301]
 * Get Jarvis + Multi-Agent Browser Use running locally [NRS-1301]
 */ // [NRS-1301]

// [NRS-1001] Display setup guide information
console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║           GET JARVIS + BROWSER USE RUNNING LOCALLY                    ║
╚════════════════════════════════════════════════════════════════════════╝

✅ STEP 1: Install Dependencies  // [NRS-1503] Install packages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run this command in the LightBrowser directory:  // [NRS-1503] Installation instruction

  npm install  // [NRS-1503] NPM install command

This installs:  // [NRS-1503] Dependency list
  ✓ browseruse (Browser automation)  // [NRS-1102] Browser control library
  ✓ anthropic (Claude API client)  // [NRS-1001] Claude API client
  ✓ dotenv (Environment management)  // [NRS-1503] Environment variables
  ✓ debug (Logging)  // [NRS-1001] Debugging utilities

═══════════════════════════════════════════════════════════════════════

✅ STEP 2: Create .env File  // [NRS-1503] Environment configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a file named .env in the LightBrowser root directory:  // [NRS-1503] File creation

  ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxx  // [NRS-1001] API key configuration
  DEBUG=jarvis:*  // [NRS-1001] Debug logging

Where sk-ant-... is your Anthropic API key.  // [NRS-1001] Key format info

⚠️  IMPORTANT:  // [NRS-1001] Important warnings
  - Get your API key from: https://console.anthropic.com/  // [NRS-1001] Key source
  - NEVER commit .env to git  // [NRS-1001] Security warning
  - Keep your API key secret  // [NRS-1001] Security reminder

═══════════════════════════════════════════════════════════════════════

✅ STEP 3: Start LightBrowser  // [NRS-1503] Application start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Start the application:  // [NRS-1503] Start instruction

  npm start  // [NRS-1503] Start command

You should see:  // [NRS-1001] Expected output
  ✓ Electron window opens  // [NRS-1503] Electron UI
  ✓ LightBrowser UI loads  // [NRS-1301] Browser interface
  ✓ Jarvis Agent Panel visible in sidebar  // [NRS-1001] Jarvis UI
  ✓ 4 agent cards (Researcher, Extractor, Automator, Analyst)  // [NRS-1102] Agent display

═══════════════════════════════════════════════════════════════════════

✅ STEP 4: Test the Integration  // [NRS-1001] Integration testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

With LightBrowser running:  // [NRS-1001] Test instruction

1. Open DevTools: Press F12 or Ctrl+Shift+I  // [NRS-1301] Developer tools

2. Go to Console tab  // [NRS-1301] Console access

3. Test agent initialization:  // [NRS-1001] Agent test
   await window.electronAPI.invoke('jarvis:agents:init')  // [NRS-1001] IPC call

   Expected output:  // [NRS-1001] Expected response
   { success: true, agents: [4 agents] }  // [NRS-1102] Success response

4. Try a simple research workflow:  // [NRS-1001] Workflow test
   await window.electronAPI.invoke(  // [NRS-1001] IPC call
     'jarvis:workflow:research',  // [NRS-1002] Workflow endpoint
     'What is AI?'  // [NRS-1002] Research topic
   )

   Expected output:  // [NRS-1001] Expected response
   { success: true, results: { workflowId, stages, duration } }  // [NRS-1002] Workflow response

═══════════════════════════════════════════════════════════════════════

✅ STEP 5: Use the Sidebar UI  // [NRS-1001] UI usage guide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Look at the right sidebar (or open with ☰ button):  // [NRS-1301] Sidebar access

🤖 Jarvis Agents  // [NRS-1001] Agent panel title
  ├─ 🔍 Research Agent (idle/executing/error)  // [NRS-1102] Research agent status
  ├─ 📊 Extractor Agent  // [NRS-1102] Extraction agent
  ├─ 🤖 Automator Agent  // [NRS-1102] Automation agent
  └─ 📈 Analyst Agent  // [NRS-1102] Analysis agent

Workflow Control Buttons:  // [NRS-1001] Button descriptions
  🔍 Research  → Research any topic  // [NRS-1002] Research button
  📊 Extract   → Extract data from websites  // [NRS-1102] Extract button
  🤖 Automate  → Automate browser tasks  // [NRS-1102] Automate button

Click any button and follow the prompts!  // [NRS-1001] Button usage

═══════════════════════════════════════════════════════════════════════

🐛 TROUBLESHOOTING  // [NRS-1001] Problem solving
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: "ANTHROPIC_API_KEY not set"  // [NRS-1001] Error: missing API key
Solution: Make sure your .env file has the API key  // [NRS-1001] Fix: add API key

Problem: "Module not found: browseruse"  // [NRS-1001] Error: missing module
Solution: Run 'npm install' again  // [NRS-1001] Fix: reinstall

Problem: "Agents not showing in sidebar"  // [NRS-1001] Error: UI issue
Solution: Check browser console for errors (F12 > Console tab)  // [NRS-1001] Fix: debug

Problem: "IPC handlers not registered"  // [NRS-1001] Error: IPC issue
Solution: Check that jarvis-integration.js is loading in main.js  // [NRS-1001] Fix: verify file

Enable detailed logging:  // [NRS-1001] Advanced debugging
  DEBUG=jarvis:* npm start  // [NRS-1001] Debug command

═══════════════════════════════════════════════════════════════════════

📖 FILES TO KNOW  // [NRS-1001] Important files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Core Files:  // [NRS-1001] Core file list
  /agents/  // [NRS-1001] Agents directory
    ├─ agent-orchestrator.js      # Task coordination  // [NRS-1001] Orchestrator
    ├─ browser-use-agent.js       # Browser control  // [NRS-1102] Browser agent
    ├─ multi-agent-coordinator.js # Workflow management  // [NRS-1001] Coordinator
    ├─ jarvis-integration.js      # IPC bridge  // [NRS-1001] IPC bridge
    └─ README.md                  # Full documentation  // [NRS-1001] Documentation

UI Files:  // [NRS-1001] UI file list
  src/  // [NRS-1001] Source directory
    ├─ jarvis-agent-panel.js      # Sidebar UI component  // [NRS-1301] Sidebar panel
    ├─ style.css                  # Styling (added agent panel styles)  // [NRS-1301] Styles
    └─ index.html                 # HTML (script tags added)  // [NRS-1301] HTML template

Main Process:  // [NRS-1001] Main process file
  main.js                          # setupJarvisAgentHandlers() call added  // [NRS-1001] IPC setup

═══════════════════════════════════════════════════════════════════════

🚀 WHAT'S NEXT?  // [NRS-1001] Next steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Test workflows in the sidebar  // [NRS-1001] Next step
2. Check the DevTools console while running workflows  // [NRS-1001] Next step
3. Look at agents/example-usage.js for code patterns  // [NRS-1001] Next step
4. Wire up Jarvis voice commands to agent workflows  // [NRS-1001] Next step
5. Create custom workflows for your use cases  // [NRS-1001] Next step

═══════════════════════════════════════════════════════════════════════

✨ WHEN IT WORKS  // [NRS-1001] Success indicators
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You'll see:  // [NRS-1001] Success signs
✅ Agent cards in sidebar with status  // [NRS-1001] UI indicator
✅ Three workflow buttons (Research, Extract, Automate)  // [NRS-1001] UI indicator
✅ Status messages as workflows execute  // [NRS-1001] UI indicator
✅ Detailed results showing in the UI  // [NRS-1001] UI indicator
✅ Agent status updating in real-time  // [NRS-1001] UI indicator

Your Jarvis now has FULL browser automation + multi-agent powers! 🎉

═══════════════════════════════════════════════════════════════════════
`); // [NRS-1001] End console output
