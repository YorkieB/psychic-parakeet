# Jarvis Multi-Agent Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIGHT BROWSER (ELECTRON)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    JARVIS (AI ASSISTANT)                         │   │
│  │  (Voice Input → Natural Language → Command Execution)           │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│                    Electron IPC (window.electronAPI)                     │
│                               │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │          JARVIS INTEGRATION LAYER                                │   │
│  │     (jarvis-integration.js - IPC Handlers)                       │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │  • jarvis:workflow:research                                      │   │
│  │  • jarvis:workflow:extract                                       │   │
│  │  • jarvis:workflow:automate                                      │   │
│  │  • jarvis:workflow:custom                                        │   │
│  │  • jarvis:agents:init/stats/history                              │   │
│  │  • jarvis:browser:start/close                                    │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│                               ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │        MULTI-AGENT COORDINATOR                                  │   │
│  │    (multi-agent-coordinator.js)                                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  WORKFLOW ORCHESTRATION                                 │   │   │
│  │  │  • Research Workflow                                    │   │   │
│  │  │  • Extraction Workflow                                  │   │   │
│  │  │  • Automation Workflow                                  │   │   │
│  │  │  • Custom Workflows                                     │   │   │
│  │  └──────────────────────┬──────────────────────────────────┘   │   │
│  │                         │                                       │   │
│  └─────────────────────────┼───────────────────────────────────────┘   │
│                            │                                            │
│                            ▼                                            │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │          AGENT ORCHESTRATOR                                    │    │
│  │      (agent-orchestrator.js)                                   │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │  • Task Routing                                                │    │
│  │  • Parallel Execution (up to 3 concurrent)                     │    │
│  │  • Sequential Execution with Context Passing                   │    │
│  │  • Agent Lifecycle Management                                  │    │
│  │  • Execution Tracking & History                                │    │
│  └────────────────────────────┬───────────────────────────────────┘    │
│                               │                                         │
│        ┌──────────────────────┼──────────────────────┐                 │
│        │                      │                      │                 │
│        ▼                      ▼                      ▼                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐        │
│  │   RESEARCH   │      │  EXTRACTOR   │      │  AUTOMATOR   │        │
│  │    AGENT     │      │    AGENT     │      │    AGENT     │        │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘        │
│         │ Info Gathering       │ Data Parsing        │ Browser Control
│         └──────────────────────┼────────────────────┘                 │
│                                │                                       │
│        ┌───────────────────────▼───────────────────────┐              │
│        │       ANTHROPIC CLAUDE API                    │              │
│        │   (LLM Processing & Understanding)            │              │
│        └───────────────────────┬───────────────────────┘              │
│                                │                                       │
│        ┌───────────────────────▼───────────────────────┐              │
│        │    BROWSER USE AGENT                          │              │
│        │  (browser-use-agent.js)                       │              │
│        ├───────────────────────────────────────────────┤              │
│        │ • Navigate                                     │              │
│        │ • Click                                        │              │
│        │ • Type                                         │              │
│        │ • Extract Content                              │              │
│        │ • Take Screenshots                             │              │
│        │ • Execute JavaScript                           │              │
│        │ • Wait for Elements                            │              │
│        └───────────────────────┬───────────────────────┘              │
│                                │                                       │
│        ┌───────────────────────▼───────────────────────┐              │
│        │    BROWSER AUTOMATION                         │              │
│        │  (Real Browser Instance)                      │              │
│        └───────────────────────────────────────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflow Execution Flow

### Research Workflow
```
User Command: "Research AI safety"
        │
        ▼
Jarvis receives: 'jarvis:workflow:research'
        │
        ▼
MultiAgentCoordinator.executeResearchWorkflow()
        │
        ├─→ Stage 1: PARALLEL
        │   ├─→ Researcher Agent 1: Find recent developments
        │   └─→ Researcher Agent 2: Find practical applications
        │
        └─→ Stage 2: SEQUENTIAL (with context)
            └─→ Analyst Agent: Synthesize findings
                (Has access to both researcher outputs)
        │
        ▼
Results: { workflowId, stages, duration, success }
        │
        ▼
Return to Jarvis for display
```

### Data Extraction Workflow
```
User Command: "Extract data from example.com"
        │
        ▼
Jarvis receives: 'jarvis:workflow:extract'
        │
        ├─→ Automator: Navigate to URL
        │
        ├─→ Extractor: Parse and extract data
        │
        ├─→ Extractor: Format structured output
        │
        └─→ Analyst: Validate and summarize
        │
        ▼
Results: { extracted data, format, validation }
        │
        ▼
Return to Jarvis for display
```

## Agent Capabilities Matrix

```
┌─────────────┬──────────────┬──────────────┬──────────────┬─────────────┐
│ Capability  │  Researcher  │  Extractor   │  Automator   │   Analyst   │
├─────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│ Search      │      ✓       │              │              │             │
│ Analysis    │      ✓       │              │              │      ✓      │
│ Parsing     │              │      ✓       │              │      ✓      │
│ Formatting  │              │      ✓       │              │      ✓      │
│ Navigation  │              │              │      ✓       │             │
│ Interaction │              │              │      ✓       │             │
│ Synthesis   │      ✓       │              │              │      ✓      │
│ Extraction  │      ✓       │      ✓       │      ✓       │             │
└─────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

## Parallel vs Sequential Execution

### Parallel Execution (Fast)
```
Time
│
├─ Task 1 [Agent A] ─────┤
│                        ├── Gather All Results
├─ Task 2 [Agent B] ─────┤
│                        ├── Gather All Results
├─ Task 3 [Agent C] ─────┤
│
└─ Total: ~Time of longest task
```

### Sequential Execution (Context-aware)
```
Time
│
├─ Task 1 [Agent A] ─────┐
│                        ├─ Use Result 1
│                        │
├─ Task 2 [Agent B] ─────┤ (has Result 1)
│                        │
│                        ├─ Use Results 1+2
│                        │
├─ Task 3 [Agent C] ─────┤ (has Result 1+2)
│                        │
└─ Total: Task1 + Task2 + Task3 times
```

## IPC Communication Pattern

```
Renderer Process (Jarvis)
       │
       │ window.electronAPI.invoke('jarvis:workflow:research', params)
       │
       ▼─────────────────┐
                         │ IPC Channel
                         │
Main Process  ◄─────────┘
       │
       ├─ handler = 'jarvis:workflow:research'
       │
       ├─ event = IPC event object
       │
       ├─ params = [topic, options]
       │
       ▼
       coordinatorInstance.executeResearchWorkflow(topic, options)
       │
       ├─ orchestrator.executeWorkflow()
       │
       ├─ agents execute tasks
       │
       ├─ collect results
       │
       ▼
       { success: true, results: {...}, error: null }
       │
       └──────────────────────────┐
                              IPC │
                                  │
Renderer Process                   ▼
       │
       ├─ Receive result
       │
       ├─ Check result.success
       │
       ├─ Use result.results or display error
       │
       ▼
       Display to user / Jarvis response
```

## Data Flow Example: Research Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ INPUT: topic = "AI Safety"                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────┐
        │ Stage 1: PARALLEL (2 researchers)   │
        └─────────┬───────────────────────────┘
                  │
        ┌─────────┴──────────┬──────────────┐
        │                    │              │
        ▼                    ▼              │
 ┌────────────────┐  ┌────────────────┐    │
 │ Researcher 1   │  │ Researcher 2   │    │
 │ "Find recent   │  │ "Find practical│    │
 │  developments" │  │  applications" │    │
 └────────┬───────┘  └────────┬───────┘    │
          │                   │            │
          ▼                   ▼            │
      Claude API         Claude API        │
          │                   │            │
          ▼                   ▼            │
    Result 1: "Recent   Result 2: "Apps   │
    papers on AI        include X, Y, Z"  │
    safety from 2024"                     │
          │                   │            │
        ┌─┴───────────────────┴─┐          │
        │ Collect Results (R1+R2)│          │
        └─┬─────────────────────┘          │
          │                                 │
          ▼                                 │
        ┌──────────────────────────────────┐│
        │ Stage 2: SEQUENTIAL (1 analyst)  ││
        └──────────┬───────────────────────┘│
                   │                        │
                   ▼                        │
           ┌────────────────┐               │
           │ Analyst Agent  │               │
           │ "Synthesize    │               │
           │  findings from │               │
           │  R1 + R2"      │               │
           └────────┬───────┘               │
                    │                       │
                    ▼                       │
                Claude API                  │
                    │                       │
                    ▼                       │
              Final Result:                 │
         "Comprehensive synthesis          │
          of AI safety research..."        │
                    │                       │
                    └───────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │ OUTPUT: {                           │
        │   workflowId: "research-1234567",   │
        │   stages: [                         │
        │     { name: "Research",            │
        │       type: "parallel",             │
        │       results: [R1, R2] },          │
        │     { name: "Analysis",            │
        │       type: "sequential",           │
        │       results: [Final] }            │
        │   ],                                │
        │   totalDuration: 8234ms             │
        │ }                                   │
        └─────────────────────────────────────┘
```

## Agent Selection & Routing

```
User Request: "Extract and analyze prices"
       │
       ▼
       Determine Capabilities Needed:
       - data-extraction (needed)
       - data-analysis (needed)
       │
       ├─ Find agents with: data-extraction
       │  → Extractor (✓ available, idle)
       │
       ├─ Find agents with: data-analysis
       │  → Analyst (✓ available, idle)
       │
       ▼
       Route to best agents:
       - Primary: Extractor Agent
       - Secondary: Analyst Agent
       │
       ▼
       Execute workflow
```

## Error Handling Flow

```
Task Execution Starts
       │
       ├─ Try to execute task
       │
       ├─ If success:
       │  └─ return { status: 'completed', output: result }
       │
       ├─ If error:
       │  ├─ Mark agent status: 'error'
       │  ├─ Log error with context
       │  ├─ Format error message
       │  └─ return { status: 'failed', error: message }
       │
       └─ Always:
          ├─ Clean up resources
          ├─ Update agent status: 'idle'
          └─ Record execution metrics
```

---

This architecture enables Jarvis to:
- **Think** (Claude processes tasks)
- **Coordinate** (Agents work together)
- **Act** (Browser automation)
- **Learn** (Context passing between agents)
- **Scale** (Parallel execution)
- **Recover** (Error handling)
