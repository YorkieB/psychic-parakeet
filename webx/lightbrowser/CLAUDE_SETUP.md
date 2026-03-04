# Claude API Integration for Browser Use

## Overview
The Browser Use Agent has been updated to integrate Claude API for intelligent browser automation. Claude now powers the decision-making logic for browser interactions, content analysis, and workflow coordination.

## What Changed

### 1. **Updated Dependencies**
- Added `@anthropic-ai/sdk` to package.json
- Run `npm install` to install it

### 2. **Browser Use Agent Enhancements**
The `browser-use-agent.js` now:
- Uses Claude API instead of the old BrowserUseClient
- Makes intelligent decisions about browser actions
- Analyzes page content and suggests next actions
- Provides natural language reasoning for automation tasks

## Setup

### Step 1: Install Dependencies
```bash
cd LightBrowser
npm install
```

### Step 2: Set Your Claude API Key
```bash
# Windows (PowerShell)
$env:CLAUDE_API_KEY = "your-api-key-here"

# Windows (Command Prompt)
set CLAUDE_API_KEY=your-api-key-here

# Or add to your .env file
echo CLAUDE_API_KEY=your-api-key-here >> .env
```

### Step 3: Use in Your Code

#### Basic Usage
```javascript
const BrowserUseAgent = require('./agents/browser-use-agent');

const agent = new BrowserUseAgent({
  model: 'claude-3-5-sonnet-20241022', // or 'claude-3-opus-20250219'
});

// Start a session
await agent.startSession({ url: 'https://example.com' });

// Set page content (from your browser/renderer process)
agent.setPageContent(pageHTML);

// Let Claude analyze and decide what to do next
const decision = await agent.analyzeAndDecide('Search for information about Node.js');
console.log(decision.suggestion);

// Or perform specific actions
await agent.navigate('https://google.com');
await agent.type('#search-input', 'search query');
await agent.click('button[type="submit"]');

// Extract and analyze content with Claude
const result = await agent.extractContent('.search-results');

// Close session
await agent.closeSession();
```

#### With Agent Orchestrator
```javascript
const AgentOrchestrator = require('./agents/agent-orchestrator');
const BrowserUseAgent = require('./agents/browser-use-agent');

const orchestrator = new AgentOrchestrator();

// Register the browser agent
orchestrator.registerAgent('browser', {
  name: 'Browser Agent',
  role: 'browser-automation',
  capabilities: ['navigate', 'click', 'type', 'analyze'],
});

// Execute browser tasks
const task = {
  agentId: 'browser',
  description: 'Navigate to Google and search for the latest Node.js news',
};

const result = await orchestrator.executeAgentTask('browser', task);
console.log(result.output);
```

## Key Methods

### Session Management
- `startSession(config)` - Start a new browser session
- `closeSession()` - Close the active session
- `getPageState()` - Get current session state
- `getSessionHistory()` - Get history of all sessions

### Browser Actions
- `navigate(url)` - Navigate to a URL
- `click(selector)` - Click an element
- `type(selector, text)` - Type text into a field
- `extractContent(selector)` - Extract and analyze content
- `executeScript(script)` - Execute JavaScript
- `takeScreenshot()` - Take a screenshot
- `waitForElement(selector, timeout)` - Wait for element

### AI-Powered Actions
- `analyzeAndDecide(goal)` - Ask Claude what action to take next
- `setPageContent(content)` - Update page content for Claude to analyze

## Example Files

### Test the Integration
```bash
# Run the example (make sure CLAUDE_API_KEY is set)
node agents/example-claude-usage.js
```

## Environment Variables

```env
# Required
CLAUDE_API_KEY=your-api-key-here

# Optional
DEBUG=jarvis:* # Enable debug logging
```

## Models Available

- `claude-3-opus-20250219` - Most capable (slower, more expensive)
- `claude-3-5-sonnet-20241022` - Balanced (recommended)
- `claude-3-haiku-20250122` - Fastest (less capable, cheaper)

## Integration Points

### In Agent Orchestrator
The orchestrator already supports Claude API. Update your workflow definitions to use browser automation:

```javascript
const workflow = {
  id: 'web-search-workflow',
  stages: [
    {
      name: 'Search Preparation',
      type: 'parallel',
      tasks: [
        {
          agentId: 'browser',
          description: 'Navigate to Google and prepare for search',
        },
      ],
    },
    {
      name: 'Execute Search',
      type: 'sequential',
      tasks: [
        {
          agentId: 'browser',
          description: 'Type search query and submit form',
        },
        {
          agentId: 'browser',
          description: 'Extract and analyze search results',
        },
      ],
    },
  ],
};

const results = await orchestrator.executeWorkflow(workflow);
```

## Troubleshooting

### "Claude API client not initialized"
- Check that `CLAUDE_API_KEY` is set in your environment
- Verify the Anthropic SDK is installed: `npm ls @anthropic-ai/sdk`

### "API key invalid or expired"
- Get a new API key from https://console.anthropic.com
- Make sure it's correctly set in the environment

### Models not available
- Ensure you're using a valid Claude model name
- Check Claude API documentation for available models

## Next Steps

1. **Integrate with your browser process**: Update your renderer or browser component to call `agent.setPageContent()` with actual page content
2. **Set up keyboard/mouse simulation**: For actual clicks and typing, integrate with a browser automation library
3. **Add error handling**: Wrap Claude API calls with proper try-catch and retry logic
4. **Monitor usage**: Track API calls and token usage

## References

- [Anthropic Claude API Documentation](https://docs.anthropic.com)
- [Agent Orchestrator](./agent-orchestrator.js)
- [Example Usage](./example-claude-usage.js)
