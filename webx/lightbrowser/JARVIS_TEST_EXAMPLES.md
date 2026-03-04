# 🤖 Jarvis Agents Panel - Test Examples

## Quick Setup

1. Start the browser:
```bash
npm start
```

2. Open DevTools to see logs:
   - Press `F12` or `Ctrl+Shift+I`

3. Toggle sidebar:
   - Click **View** → **Toggle Sidebar**
   - Or press the sidebar button

## Example 1: Test Agent Initialization

**What to check:**
- Look in DevTools console for: `✅ Jarvis Agent Panel initialized`
- Should see 4 agents in the sidebar panel

**Expected agents:**
- Research Agent (⚪ idle)
- Extractor Agent (⚪ idle)
- Automator Agent (⚪ idle) ← Uses your Claude API!
- Analysis Agent (⚪ idle)

## Example 2: Run Research Workflow

**Steps:**
1. Find the "Research Topic" input field in the Jarvis panel
2. Type: `Node.js best practices`
3. Click the **"🔍 Research"** button

**What happens:**
- Research Agent activates (🟡 executing)
- Console shows workflow progress
- Results appear in workflow history

**Console output to expect:**
```
📊 Research workflow started: Node.js best practices
🔄 Agents coordinating...
✅ Research completed
```

## Example 3: Sort Demo Workflow

**Steps:**
1. Find the "Sort Demo" section
2. Type in the input: `banana, apple, cherry, date`
3. Press **Enter** or click **"Sort Demo"** button

**What happens:**
- Multiple agents coordinate to sort the list
- Shows agent collaboration in action
- Status dots change: ⚪ → 🟡 → ⚪

**Expected result:**
```
Sorted: apple, banana, cherry, date
```

## Example 4: Test Browser Automation Agent

**Steps:**
1. Click on the **Automator Agent** card
2. This agent uses your Claude API for intelligent automation
3. Try a custom task (if UI has the option)

**Example task:**
```
Navigate to example.com and extract the heading
```

**Expected behavior:**
- Agent status: 🟡 executing
- Uses Claude to analyze the page
- Returns extracted content
- Status returns to: ⚪ idle

## Example 5: View Agent Details

**Steps:**
1. **Click** on any agent card in the panel
2. A detail view should appear showing:
   - Agent name and role
   - Full capabilities list
   - Current status
   - Recent tasks

**Try clicking:**
- Research Agent → See research capabilities
- Automator Agent → See automation capabilities

## Example 6: Check Agent Stats

**In the panel, look for:**
- **Total Agents**: Should show `4`
- **Active Tasks**: `0` (when idle) or `1+` (when running)
- **Completed Workflows**: Increments after each test

## Example 7: Run Multiple Workflows

**Test parallel execution:**

1. Start a research task: `Python vs JavaScript`
2. Immediately start another: `Docker containers`
3. Watch both agents work simultaneously

**Console output:**
```
[Agent 1] 🟡 Researching: Python vs JavaScript
[Agent 2] 🟡 Researching: Docker containers
[Agent 1] ✅ Research complete
[Agent 2] ✅ Research complete
```

## Example 8: Test Custom Workflow

**If custom workflow UI is available:**

1. Click **"Custom Workflow"** button
2. Enter workflow steps:
```json
{
  "steps": [
    { "agent": "researcher", "task": "Find info about Claude API" },
    { "agent": "analyzer", "task": "Summarize findings" }
  ]
}
```
3. Click **"Execute"**

## Troubleshooting Examples

### If panel doesn't appear:
```javascript
// Open DevTools Console and type:
window.jarvisPanel?.init();
```

### If agents don't respond:
Check console for:
- `✅ Jarvis Agent Panel initialized` - Good!
- `⚠️ API key not configured` - Need to set CLAUDE_API_KEY

### Force refresh agents:
```javascript
// In DevTools Console:
window.electronAPI.invoke('jarvis:agents:init')
  .then(r => console.log('Agents:', r));
```

## Expected Console Messages

**On startup:**
```
📌 Sidebar shown for Jarvis Agent Panel
✅ Jarvis Agent Panel initialized: 4 agents
👉 Agent panel is in the RIGHT sidebar
```

**When running workflows:**
```
📊 Workflow started: [workflow-name]
🔄 Agent [agent-name] executing...
✅ Agent [agent-name] completed
📈 Workflow finished in 2.3s
```

**If Claude API is used:**
```
🤖 Automator Agent using Claude API
📡 Sending request to Claude Sonnet 4...
✅ Claude response received
```

## Quick Test Script

**Run this in DevTools Console:**
```javascript
// Test 1: Check panel exists
console.log('Panel exists:', !!window.jarvisPanel);

// Test 2: Get agent count
window.electronAPI.invoke('jarvis:agents:status')
  .then(s => console.log('Agents:', s.orchestrator.totalAgents));

// Test 3: Run quick test
window.electronAPI.invoke('jarvis:workflow:research', { topic: 'Test' })
  .then(r => console.log('Test result:', r));
```

## Success Indicators

✅ **Working correctly if you see:**
- Agent panel in sidebar
- 4 agent cards displayed
- Status dots update (⚪ → 🟡 → ⚪)
- Console shows workflow messages
- No error messages in red

❌ **Check setup if you see:**
- Empty sidebar
- "API key not configured" warnings
- Red error messages
- Agents stuck in 🔴 error state

## Advanced: Test with DevTools

**Monitor IPC calls:**
```javascript
// Log all IPC messages
const originalInvoke = window.electronAPI.invoke;
window.electronAPI.invoke = function(...args) {
  console.log('📡 IPC:', args[0]);
  return originalInvoke.apply(this, args);
};
```

**Check agent state:**
```javascript
// Get full agent details
window.electronAPI.invoke('jarvis:agents:status')
  .then(s => console.table(s.orchestrator.agents));
```

---

## 🎯 Recommended Test Order

1. ✅ Start browser → Check panel appears
2. ✅ View all agents → Verify 4 cards visible
3. ✅ Run Sort Demo → Test basic workflow
4. ✅ Run Research → Test Claude integration
5. ✅ Click agent cards → Test UI interactions
6. ✅ Check console logs → Verify no errors
7. ✅ Run parallel workflows → Test coordination

---

**Have fun testing! 🚀**
