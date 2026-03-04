# Jarvis Multi-Agent Browser Use Integration

This folder contains the multi-agent orchestration system that powers Jarvis with Browser Use capabilities. It enables coordinated multi-agent workflows for research, data extraction, and browser automation.

## Overview

The multi-agent system consists of four main components:

### 1. **Agent Orchestrator** (`agent-orchestrator.js`)
Manages agent lifecycle and coordinates task execution:
- Registers and manages multiple agents
- Executes tasks in parallel or sequentially
- Routes tasks to appropriate agents
- Tracks execution history and stats

### 2. **Browser Use Agent** (`browser-use-agent.js`)
Provides browser automation capabilities:
- Starts and manages browser sessions
- Performs actions: navigate, click, type, extract, etc.
- Takes screenshots and monitors page state
- Handles page state and JavaScript execution

### 3. **Multi-Agent Coordinator** (`multi-agent-coordinator.js`)
High-level workflow orchestration:
- Initializes default agents (Researcher, Extractor, Automator, Analyst)
- Executes predefined workflows (research, extraction, automation)
- Manages browser sessions
- Maintains execution history

### 4. **Jarvis Integration** (`jarvis-integration.js`)
IPC handlers connecting everything to Jarvis:
- Exposes multi-agent APIs via Electron IPC
- Handles workflow execution requests
- Manages agent lifecycle

## Default Agents

### Research Agent
- **Role**: Information gathering and analysis
- **Capabilities**: Web search, information gathering, analysis
- **Use**: Finding and synthesizing information

### Data Extraction Agent
- **Role**: Extracting structured data
- **Capabilities**: Data extraction, parsing, formatting
- **Use**: Pulling data from unstructured content

### Automation Agent
- **Role**: Executing automated browser tasks
- **Capabilities**: Browser control, task automation, workflow execution
- **Use**: Performing complex multi-step browser operations

### Analysis Agent
- **Role**: Synthesizing and analyzing information
- **Capabilities**: Data analysis, insights, recommendations
- **Use**: Generating summaries and conclusions

## Setup

### 1. Install Dependencies
```bash
npm install
```

Required packages:
- `browseruse` - Browser automation
- `anthropic` - Claude API access
- `dotenv` - Environment variable management
- `debug` - Logging

### 2. Configure Environment
Create a `.env` file in the LightBrowser root:
```env
ANTHROPIC_API_KEY=your_api_key_here
DEBUG=jarvis:*
```

Copy from `.env.example` if needed.

### 3. Integration in main.js
The integration is already added to `main.js`:
```javascript
const { setupJarvisAgentHandlers } = require('./agents/jarvis-integration');

app.whenReady().then(async () => {
  setupJarvisAgentHandlers(); // Initialize handlers
  // ...
});
```

## Usage

### Via Jarvis IPC

In your renderer process or Jarvis module:

#### Research Workflow
```javascript
const result = await window.electronAPI.invoke('jarvis:workflow:research', 
  'Topic to research'
);
```

#### Data Extraction Workflow
```javascript
const result = await window.electronAPI.invoke('jarvis:workflow:extract',
  'https://example.com',
  { selector: '.data', otherSelector: '.info' }
);
```

#### Automation Workflow
```javascript
const result = await window.electronAPI.invoke('jarvis:workflow:automate',
  [
    { description: 'Navigate to example.com', agentId: 'automator' },
    { description: 'Extract data', agentId: 'extractor' },
    { description: 'Analyze results', agentId: 'analyst' }
  ]
);
```

#### Get Agent Stats
```javascript
const result = await window.electronAPI.invoke('jarvis:agents:stats');
```

#### Get Execution History
```javascript
const history = await window.electronAPI.invoke('jarvis:agents:history', 10);
```

### Programmatic Usage

```javascript
const MultiAgentCoordinator = require('./agents/multi-agent-coordinator');

const coordinator = new MultiAgentCoordinator();
await coordinator.initializeDefaultAgents();

// Execute research
const results = await coordinator.executeResearchWorkflow('Your topic');

// Execute data extraction
const extracted = await coordinator.executeDataExtractionWorkflow(
  'https://example.com',
  { title: '.title', content: '.content' }
);

// Execute automation
const automated = await coordinator.executeAutomationWorkflow([
  { description: 'Step 1', agentId: 'automator' },
  { description: 'Step 2', agentId: 'extractor' }
]);
```

## Workflow Types

### 1. Research Workflow
**Stages**: Parallel research → Sequential analysis

Perfect for:
- Comprehensive research on topics
- Finding multiple perspectives
- Synthesizing information

### 2. Data Extraction Workflow
**Stages**: Navigate → Extract → Format → Analyze

Perfect for:
- Web scraping
- Information gathering
- Data transformation

### 3. Automation Workflow
**Stages**: Sequential task execution

Perfect for:
- Complex multi-step browser operations
- Workflow automation
- Task orchestration

### 4. Custom Workflow
Define your own stages and task flow:
```javascript
const workflow = {
  id: 'custom-id',
  stages: [
    {
      name: 'Stage 1',
      type: 'parallel', // or 'sequential'
      tasks: [
        { id: 'task-1', agentId: 'agent-id', description: 'Do something' }
      ]
    }
  ]
};

await coordinator.executeCustomWorkflow(workflow);
```

## Advanced Features

### Parallel Task Execution
Tasks run simultaneously across multiple agents:
```javascript
const results = await orchestrator.executeParallel([
  { agentId: 'agent-1', description: 'Task 1' },
  { agentId: 'agent-2', description: 'Task 2' },
  { agentId: 'agent-3', description: 'Task 3' }
]);
```

### Sequential with Context Passing
Each task has access to previous results:
```javascript
const results = await orchestrator.executeSequential([
  { agentId: 'researcher', description: 'Research X' },
  { agentId: 'analyst', description: 'Analyze results' } // Has research output
]);
```

### Smart Task Routing
Automatically route tasks to appropriate agents:
```javascript
const result = await orchestrator.routeTask(
  'Extract data from webpage',
  'data-extraction' // Required capability
);
```

## Debugging

Enable detailed logging:
```bash
DEBUG=jarvis:* npm start
```

Specific components:
```bash
DEBUG=jarvis:orchestrator npm start
DEBUG=jarvis:coordinator npm start
DEBUG=jarvis:integration npm start
DEBUG=jarvis:browser-agent npm start
```

## Error Handling

All operations return structured results:
```javascript
{
  success: boolean,
  results: WorkflowResults | null,
  error: string | null
}
```

### Workflow Results Structure
```javascript
{
  workflowId: string,
  stages: [
    {
      name: string,
      type: 'parallel' | 'sequential',
      results: TaskResult[]
    }
  ],
  startedAt: Date,
  completedAt: Date,
  totalDuration: number (ms)
}
```

## Performance Tuning

### Adjust Concurrent Tasks
```javascript
new MultiAgentCoordinator({
  maxConcurrentTasks: 5 // Default: 3
});
```

### Configure Model
```javascript
{
  model: 'claude-3-5-sonnet-20241022' // Default
}
```

## Integration with Existing Jarvis Features

The multi-agent system integrates seamlessly with Jarvis:
1. Commands can trigger agent workflows
2. Agents can access browser context from LightBrowser
3. Results can be displayed in Jarvis UI
4. Agent state persists across sessions

## Future Enhancements

- [ ] Persistent agent memory
- [ ] Custom agent creation UI
- [ ] Workflow templates library
- [ ] Real-time progress streaming
- [ ] Agent performance analytics
- [ ] Integration with local LLMs
- [ ] Multi-browser session coordination

## Support & Documentation

See `example-usage.js` for detailed code examples of all workflow types.

For more information about Browser Use capabilities, visit the [Anthropic documentation](https://docs.anthropic.com).
