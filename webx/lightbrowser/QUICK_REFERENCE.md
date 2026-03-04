# Claude API Browser Use - Quick Reference

## Setup (First Time)

```bash
# 1. Install dependencies
cd LightBrowser
npm install

# 2. Set your API key (Windows)
$env:CLAUDE_API_KEY = "sk-ant-..."

# 3. Test it
node agents/example-claude-usage.js
```

## Usage Examples

### Initialize Agent
```javascript
const BrowserUseAgent = require('./agents/browser-use-agent');
const agent = new BrowserUseAgent();
```

### Session Workflow
```javascript
// Start
await agent.startSession({ url: 'https://example.com' });

// Do stuff
agent.setPageContent(pageHTML);
const decision = await agent.analyzeAndDecide('Search for X');

// End
await agent.closeSession();
```

### Key Methods
| Method | Purpose |
|--------|---------|
| `startSession(config)` | Start browser session |
| `closeSession()` | Close session |
| `navigate(url)` | Go to URL |
| `click(selector)` | Click element |
| `type(selector, text)` | Type into field |
| `extractContent(selector)` | Extract + analyze |
| `analyzeAndDecide(goal)` | Ask Claude what to do |
| `setPageContent(html)` | Feed Claude page content |

### Common Patterns

**Analyze page and get suggestions:**
```javascript
agent.setPageContent(document.documentElement.innerHTML);
const result = await agent.analyzeAndDecide('Find the search box');
console.log(result.suggestion);
```

**Extract and analyze content:**
```javascript
agent.setPageContent(pageHTML);
const extracted = await agent.extractContent('.news-article');
console.log(extracted.content);
```

**Multi-step workflow:**
```javascript
await agent.startSession({ url: 'https://google.com' });
await agent.navigate('https://google.com');
agent.setPageContent(page);

const decision = await agent.analyzeAndDecide('Search for Node.js');
// Claude tells you what to do next
```

## Electron Integration

### In main.js:
```javascript
const BrowserAutomationManager = require('./browser-automation-manager');
new BrowserAutomationManager();
```

### In preload.js:
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});
```

### In HTML:
```html
<script src="src/automation-ui.js"></script>
```

### IPC Channels:
- `automation:start-session` - Start new session
- `automation:execute` - Execute action (navigate, click, extract, analyze, etc.)
- `automation:update-content` - Update page content
- `automation:close-session` - Close session
- `automation:get-history` - Get session history

## Environment Variables

```env
CLAUDE_API_KEY=sk-ant-...           # Required
DEBUG=jarvis:*                      # Optional: enable debug logging
ANTHROPIC_API_KEY=sk-ant-...        # Alternative to CLAUDE_API_KEY
```

## Models

- `claude-3-opus-20250219` - Most capable
- `claude-3-5-sonnet-20241022` - **Recommended** 
- `claude-3-haiku-20250122` - Fastest

## Files Reference

| File | Purpose |
|------|---------|
| `agents/browser-use-agent.js` | Main Claude integration |
| `browser-automation-manager.js` | IPC handler for Electron |
| `src/automation-ui.js` | UI controls for automation |
| `CLAUDE_SETUP.md` | Full documentation |
| `agents/example-claude-usage.js` | Working examples |

## Troubleshooting

**"Client not initialized"**
- Set `CLAUDE_API_KEY` in environment
- Check `npm ls @anthropic-ai/sdk` (should show version)

**"Invalid API key"**
- Get key from https://console.anthropic.com
- Make sure it starts with `sk-ant-`

**Module not found**
- Run `npm install` again
- Check `package.json` has `@anthropic-ai/sdk`

## Testing

```bash
# Quick test
$env:CLAUDE_API_KEY = "your-key"
node agents/example-claude-usage.js

# With debug logging
$env:DEBUG = "jarvis:*"
node agents/example-claude-usage.js
```

## API Response Format

Most methods return:
```javascript
{
  status: 'completed',
  response: 'Claude\'s response...',
  executedAt: Date
}
```

Analysis returns:
```javascript
{
  status: 'analyzed',
  suggestion: 'Claude\'s suggestion...',
  analyzedAt: Date
}
```

---

**Everything is set up!** Just set your API key and you're ready to go.
