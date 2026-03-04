#!/usr/bin/env node  // [NRS-1503] Node.js executable

/** [NRS-1301]
 * QUICK START: Jarvis Multi-Agent Browser Use [NRS-1301]
 * [NRS-1301]
 * This is a quick reference guide to get started [NRS-1301]
 */ // [NRS-1301]

// [NRS-1001] Display quick start information
console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║          JARVIS MULTI-AGENT BROWSER USE - QUICK START                 ║
╚════════════════════════════════════════════════════════════════════════╝

📦 SETUP (One time only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Install dependencies:  // [NRS-1503] Install packages
   $ npm install  // [NRS-1503] NPM dependency installation

2. Configure environment:  // [NRS-1503] Environment setup
   $ cp .env.example .env  // [NRS-1503] Copy example config
   $ # Edit .env and add your ANTHROPIC_API_KEY  // [NRS-1503] Add API credentials

3. Start LightBrowser:  // [NRS-1503] Application start
   $ npm start  // [NRS-1503] Start development server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 FOUR POWERFUL AGENTS  // [NRS-1001] Multi-agent description
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 RESEARCHER  // [NRS-1102] Research agent
   └─ Gathers information from multiple sources  // [NRS-1102] Research capability
   └─ Best for: "What's the latest on AI safety?"  // [NRS-1102] Use case

📊 EXTRACTOR  // [NRS-1102] Extraction agent
   └─ Pulls structured data from unstructured content  // [NRS-1102] Extraction capability
   └─ Best for: "Extract product info from this webpage"  // [NRS-1102] Use case

🤖 AUTOMATOR  // [NRS-1102] Automation agent
   └─ Automates complex multi-step browser operations  // [NRS-1102] Automation capability
   └─ Best for: "Fill out this form and submit it"  // [NRS-1102] Use case

📈 ANALYST  // [NRS-1102] Analysis agent
   └─ Analyzes data and generates insights  // [NRS-1102] Analysis capability
   └─ Best for: "Summarize these research findings"  // [NRS-1102] Use case

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 FOUR WORKFLOW TYPES  // [NRS-1002] Workflow execution patterns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. RESEARCH WORKFLOW  // [NRS-1002] Research pattern
   Parallel research → Sequential analysis  // [NRS-1002] Workflow steps
   
   const result = await window.electronAPI.invoke(  // [NRS-1001] IPC invocation
     'jarvis:workflow:research',  // [NRS-1002] Workflow endpoint
     'Your topic here'  // [NRS-1002] Research topic
   );

2. EXTRACTION WORKFLOW  // [NRS-1002] Extraction pattern
   Navigate → Extract → Parse → Format  // [NRS-1002] Workflow steps
   
   const result = await window.electronAPI.invoke(  // [NRS-1001] IPC invocation
     'jarvis:workflow:extract',  // [NRS-1002] Workflow endpoint
     'https://example.com',  // [NRS-905] Target URL
     { title: '.title', content: '.content' }  // [NRS-1102] Extraction selectors
   );

3. AUTOMATION WORKFLOW  // [NRS-1002] Automation pattern
   Multi-step browser tasks in sequence  // [NRS-1002] Workflow steps
   
   const result = await window.electronAPI.invoke(  // [NRS-1001] IPC invocation
     'jarvis:workflow:automate',  // [NRS-1002] Workflow endpoint
     [  // [NRS-1002] Task list
       { description: 'Step 1', agentId: 'automator' },  // [NRS-1102] First task
       { description: 'Step 2', agentId: 'extractor' }  // [NRS-1102] Second task
     ]
   );

4. CUSTOM WORKFLOW  // [NRS-1002] Custom pattern
   Define your own stages and agent combinations  // [NRS-1002] Custom execution
   
   const result = await window.electronAPI.invoke(  // [NRS-1001] IPC invocation
     'jarvis:workflow:custom',  // [NRS-1002] Custom endpoint
     { id: 'custom', stages: [...] }  // [NRS-1002] Custom configuration
   );

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 ESSENTIAL IPC COMMANDS  // [NRS-1001] Core IPC operations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// [NRS-1001] Initialize agents (do this first)
await window.electronAPI.invoke('jarvis:agents:init');  // [NRS-1001] Agent initialization

// [NRS-1001] Get agent statistics
await window.electronAPI.invoke('jarvis:agents:stats');  // [NRS-1001] Request statistics

// [NRS-1001] Get execution history
await window.electronAPI.invoke('jarvis:agents:history', 10);  // [NRS-1001] Request history

// [NRS-1001] Start browser session
await window.electronAPI.invoke('jarvis:browser:start', { headless: true });  // [NRS-905] Browser startup

// [NRS-1001] Close browser session
await window.electronAPI.invoke('jarvis:browser:close');  // [NRS-905] Browser cleanup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 DEBUGGING  // [NRS-1001] Debugging configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enable detailed logs:  // [NRS-1001] Logging setup
   $ DEBUG=jarvis:* npm start  // [NRS-1001] Enable all debug logs

Specific component:  // [NRS-1001] Component-specific logging
   $ DEBUG=jarvis:coordinator npm start  // [NRS-1001] Coordinator logs
   $ DEBUG=jarvis:orchestrator npm start  // [NRS-1001] Orchestrator logs
   $ DEBUG=jarvis:browser-agent npm start  // [NRS-1001] Browser agent logs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 DOCUMENTATION  // [NRS-1001] Documentation references
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 agents/README.md  // [NRS-1001] Main documentation
   └─ Complete documentation and setup guide  // [NRS-1001] Doc description

💻 agents/example-usage.js  // [NRS-1001] Code examples
   └─ Working code examples for all workflow types  // [NRS-1001] Example description

📋 PROJECT_STRUCTURE.md  // [NRS-1001] Structure reference
   └─ Directory layout and integration points  // [NRS-1001] Structure description

📝 BROWSER_USE_INTEGRATION.md  // [NRS-1001] Integration guide
   └─ Integration summary and architecture  // [NRS-1001] Integration description

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ FIRST WORKFLOW TEST  // [NRS-1001] Quick test procedure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Start LightBrowser: npm start  // [NRS-1503] Start application
2. Open DevTools: F12 or Ctrl+Shift+I  // [NRS-1503] Open console
3. Paste this in console:  // [NRS-1001] Test command

   await window.electronAPI.invoke('jarvis:agents:init')  // [NRS-1001] Initialize
     .then(r => console.log('✅ Agents initialized:', r.agents.length, 'agents'))  // [NRS-1001] Success
     .catch(e => console.error('❌ Error:', e));  // [NRS-1001] Error handling

4. You should see: "✅ Agents initialized: 4 agents"  // [NRS-1001] Expected output

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 PRO TIPS  // [NRS-1001] Best practices
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Workflows return { success, results, error }  // [NRS-1001] Return format
✓ Always check result.success before using results  // [NRS-1001] Error checking
✓ Use DEBUG=jarvis:* to see what agents are doing  // [NRS-1001] Debugging tip
✓ Results are JSON-serializable, safe for IPC  // [NRS-1001] Data format
✓ Agents work in parallel by default (faster!)  // [NRS-1001] Performance note
✓ Check agents/example-usage.js for more patterns  // [NRS-1001] Learning resource

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 NEXT STEPS  // [NRS-1001] Recommended next steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Try a simple research workflow  // [NRS-1001] Next step
2. Test data extraction on a real website  // [NRS-1001] Next step
3. Wire up Jarvis voice commands to trigger workflows  // [NRS-1001] Next step
4. Create custom workflows for your use cases  // [NRS-1001] Next step
5. Build a UI to monitor agent status  // [NRS-1001] Next step

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Jarvis now has SUPERPOWERS! 🚀

`); // [NRS-1001] End console output
