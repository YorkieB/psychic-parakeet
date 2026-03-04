# Jarvis Multi-Agent System

A sophisticated multi-agent AI orchestration system built with TypeScript and Node.js. This system enables coordination and communication between specialized AI agents through a central orchestrator.

## Architecture Overview

Jarvis follows an **Orchestrator Pattern** where:

- **Orchestrator**: Receives requests and intelligently routes them to specialized agents
- **Agent Registry**: Tracks all agents, monitors their health, and manages availability
- **Agents**: Independent HTTP services that perform specific tasks (e.g., dialogue, analysis, etc.)
- **Communication**: HTTP/REST with JSON payloads for agent-to-orchestrator communication

## Quick Start

### Prerequisites

- Node.js 20+ installed
- PostgreSQL (optional, for future database integration)

### Installation

```bash
npm install
```

### Development

```bash
# Start in development mode with watch
npm run dev

# Or start normally
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Compile TypeScript to JavaScript
npm run build
```

## Project Structure

```
jarvis-system/
├── src/
│   ├── agents/           # Agent implementations
│   │   ├── base-agent.ts      # Abstract base class for all agents
│   │   └── dialogue-agent.ts  # Dialogue/conversation agent
│   ├── orchestrator/     # Orchestration logic
│   │   ├── agent-registry.ts  # Agent registration and health monitoring
│   │   └── orchestrator.ts    # Request routing and execution
│   ├── types/            # TypeScript type definitions
│   │   └── agent.ts           # Agent interfaces and enums
│   ├── utils/            # Utility functions
│   │   └── logger.ts          # Winston logger factory
│   └── index.ts          # Main entry point
├── tests/                # Test files
│   └── unit/
│       └── agent-registry.test.ts
├── logs/                 # Application logs (auto-generated)
├── .env.example          # Environment variables template
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Current Status

### ✅ Implemented

- **Agent Registry**: Registration, health monitoring, and availability tracking
- **Orchestrator**: Request routing with retry logic and exponential backoff
- **Base Agent**: Abstract class providing common agent functionality
- **Dialogue Agent**: First concrete agent implementation for conversation handling
- **Web Agent**: Real web search powered by Brave Search API
- **Knowledge Agent**: Research, fact-checking, and summarization with multi-source synthesis
- **Simple Reasoning Engine**: Intent detection, smart routing, and response synthesis 🆕
- **Health Checks**: Automatic health monitoring every 30 seconds
- **Logging**: Winston-based logging with file and console transports
- **Type Safety**: Strict TypeScript configuration with comprehensive types
- **Multi-Agent Coordination**: Parallel execution, priority handling, graceful failures

## Reasoning Engine

Jarvis now includes a Simple Reasoning Engine that provides intelligent request routing and intent detection.

### Features

- **Intent Detection**: Automatically detects user intent (greeting, search, research, fact-check, etc.)
- **Smart Routing**: Routes requests to the appropriate agent based on intent
- **Execution Planning**: Creates and executes multi-step plans
- **Response Synthesis**: Formats agent outputs into coherent responses
- **Audit Trail**: Full reasoning traces for debugging and analysis

### Supported Intents

| Intent       | Keywords                           | Routed To | Example                           |
| ------------ | ---------------------------------- | --------- | --------------------------------- |
| GREETING     | hello, hi, hey                     | Dialogue  | "Hello Jarvis"                    |
| SEARCH       | search, find, look up              | Web       | "Search for TypeScript tutorials" |
| RESEARCH     | research, investigate, learn about | Knowledge | "Research quantum computing"      |
| FACT_CHECK   | fact check, verify, is it true     | Knowledge | "Verify that Python is popular"   |
| SUMMARIZE    | summarize, summary, brief me       | Knowledge | "Summarize AI developments"       |
| CONVERSATION | what, why, how (questions)         | Dialogue  | "What is machine learning?"       |

### Example Usage

```typescript
import { SimpleReasoningEngine } from './src/reasoning';

const reasoningEngine = new SimpleReasoningEngine(orchestrator, logger);

const input: UserInput = {
  text: 'Research artificial intelligence',
  source: 'text',
  userId: 'user-123',
  sessionId: 'session-456',
  timestamp: new Date(),
};

const response = await reasoningEngine.processInput(input);
console.log(response.text); // Formatted research results
console.log(response.metadata.intentType); // 'RESEARCH'
console.log(response.agentsUsed); // ['Knowledge', 'Web']
```

### Architecture

```
User Input → Intent Detection → Plan Creation → Plan Execution → Response Synthesis → User Response
                  ↓                    ↓              ↓                  ↓
              Confidence          Agent Selection   Orchestrator    Format Output
```

### Future Enhancements

- Multi-agent coordination (parallel execution)
- Context awareness (session memory)
- Learning from user feedback

## LLM Integration (Vertex AI)

Jarvis now includes optional LLM integration powered by Google's Vertex AI models for superior performance and Google ecosystem integration.

### Features

- **Intelligent Intent Detection**: Natural language understanding (no keyword matching)
- **Natural Conversations**: Real dialogue with context awareness
- **Smart Response Synthesis**: Coherent, helpful responses from agent outputs
- **Graceful Fallback**: Works without LLM using keyword-based detection

### Setup

1. Set up Google Cloud project and enable Vertex AI API

2. Add to `.env`:

```bash
VERTEX_AI_ENDPOINT_URL=https://your-endpoint-url.vertex-ai.goog
VERTEX_AI_PROJECT_ID=your-project-id
VERTEX_AI_REGION=europe-west4
VERTEX_AI_MODEL=qwen3-30b-a3b-claude-4_5-opus-high-reasoning
VERTEX_AI_MAX_TOKENS=4000
VERTEX_AI_TEMPERATURE=0.7
```

3. Install dependencies:

```bash
npm install
```

4. Start the system:

```bash
npm start
```

### Cost Estimates

**Using GPT-4o-mini (recommended):**

- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- Typical query: ~500 tokens input + 200 tokens output = $0.00019 per query
- 1000 queries/month: ~$0.19/month

**Using GPT-4o:**

- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- Typical query: ~$0.003 per query
- 1000 queries/month: ~$3/month

### Example Usage

```typescript
import { VertexLLMClient } from './src/llm';

const llm = new VertexLLMClient(logger);

// Simple completion
const response = await llm.complete('Explain AI agents');

// Intent detection
const intent = await llm.detectIntent('Search for TypeScript tutorials');

// Response synthesis
const synthesized = await llm.synthesizeResponse('RESEARCH', agentOutputs);
```

## Advanced Reasoning Engine

The Advanced Reasoning Engine provides enterprise-grade decision-making capabilities with chain-of-thought reasoning, multi-path analysis, and pre-execution verification.

### Features

#### 1. Chain-of-Thought Reasoning

Explicit reasoning steps visible to users:

**Example:**

```
User: "Should I invest in quantum computing stocks?"

Reasoning:
[ANALYSIS] User asks investment advice (CRITICAL domain: finance)
[PLANNING] Need: market data, expert analysis, risk factors
[PLANNING] Sequence: Research QC market → Latest news → Fact-check → Synthesize
[VERIFICATION] Check: sources authoritative, disclaimers present
[DECISION] Execute plan with risk disclaimer
[ANALYSIS] Uncertain: user's risk tolerance, investment timeline
```

#### 2. Multi-Path Reasoning

For critical decisions, generates 3 alternative approaches and selects best:

- **Conservative approach**: Minimize risk
- **Balanced approach**: Optimize speed + accuracy
- **Thorough approach**: Maximize information gathering

**Triggered for:**

- Finance domain
- System changes
- Security decisions
- High-risk operations
- Low-confidence goals (<0.7)

#### 3. Pre-Execution Verification

Four verification checks before execution:

- **Safety**: Checks for destructive operations
- **Permissions**: Verifies agent availability and authorization
- **Feasibility**: Ensures inputs complete and steps executable
- **Goal Alignment**: Confirms plan achieves success criteria

If verification fails, explains why without executing.

#### 4. Goal Parsing

Converts natural language to structured goals:

```typescript
Input: "Research AI and verify if it's safe"
↓
Goal: {
  primaryObjective: "Research AI safety",
  subGoals: ["Research AI capabilities", "Fact-check safety claims"],
  domains: ["knowledge", "research"],
  riskLevel: "MEDIUM",
  confidence: 0.85,
  successCriteria: ["Comprehensive research completed", "Safety claims verified"]
}
```

### Example Usage

```typescript
import { AdvancedReasoningEngine } from './src/reasoning/advanced-reasoning-engine';

const engine = new AdvancedReasoningEngine(orchestrator, logger, llm);

const input: UserInput = {
  text: 'Should I invest $10,000 in technology stocks?',
  source: 'text',
  userId: 'user-123',
  sessionId: 'session-456',
  timestamp: new Date(),
};

const response = await engine.processInput(input);
console.log(response.text); // Natural response with reasoning
console.log(response.metadata.reasoning); // Visible reasoning steps
console.log(response.uncertainties); // Explicit uncertainties
```

## Context & Memory System

Jarvis maintains conversation history and resolves references for natural multi-turn conversations.

### Features

#### 1. Reference Resolution

Automatically resolves pronouns and references to previous topics:

```
User: "Research artificial intelligence"
Jarvis: [comprehensive research]

User: "Is it dangerous?"
Jarvis: ✓ Resolves "it" → "artificial intelligence"
        [fact-check about AI safety]

User: "What are its applications?"
Jarvis: ✓ Resolves "its" → "artificial intelligence's"
        [research on AI applications]
```

#### 2. Conversation History

Maintains up to 50 messages per session (1-hour TTL):

- User messages
- Assistant responses
- Metadata (agents used, confidence, reasoning traces)

#### 3. Entity Tracking

Tracks mentioned entities across conversation:

- Topics (AI, quantum computing, etc.)
- People (researchers, companies, etc.)
- Concepts (algorithms, theories, etc.)
- Automatic alias resolution ("it", "that", "them")

#### 4. Context-Aware Reasoning

Reasoning engine considers conversation context:

- Previous topics
- Related entities
- User's conversational flow
- Natural follow-up questions

### Usage Example

```typescript
import { ContextManager } from './src/memory';
import { AdvancedReasoningEngine } from './src/reasoning/advanced-reasoning-engine';

const contextManager = new ContextManager(logger, llm);
const engine = new AdvancedReasoningEngine(orchestrator, logger, llm, contextManager);

// Multi-turn conversation
const sessionId = 'user-session-123';

// Turn 1
await engine.processInput({
  text: 'Research machine learning',
  sessionId,
  // ...
});
// Context established: "machine learning"

// Turn 2 - reference resolution
await engine.processInput({
  text: 'How does it work?',
  sessionId, // Same session
  // ...
});
// "it" → "machine learning" (automatic)

// Turn 3 - context-aware
await engine.processInput({
  text: 'What are the benefits?',
  sessionId,
  // ...
});
// Knows we're still discussing machine learning
```

### Performance

Reference resolution adds minimal overhead:

- **Pattern matching**: <1ms
- **LLM resolution**: ~500-800ms (only when references detected)
- **Total impact**: +0-1s per query (only for follow-ups)

### Context Statistics

```typescript
const stats = contextManager.getStats();
// {
//   activeSessions: 5,
//   totalMessages: 47,
//   averageMessagesPerSession: 9.4
// }
```

### Testing Context & Memory

```bash
# Run dedicated context tests
npm run test:context

# Or run full system tests (includes context tests)
npm start
```

## Database Persistence (PostgreSQL)

Jarvis persists conversation history, reasoning traces, and research cache to PostgreSQL for production-grade data persistence.

### Features

1. **Conversation History**: All messages, sessions, and entities stored permanently
2. **Reasoning Traces**: Full audit trail of all reasoning processes
3. **Research Cache**: Cached results persist across restarts
4. **Graceful Degradation**: System works without database (memory-only mode)

### Setup

#### 1. Install PostgreSQL

**macOS:**

```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

#### 2. Configure Database

```bash
# Run setup script (PowerShell on Windows)
.\scripts\set

up-database.ps1

# Or bash script (Linux/macOS)
./scripts/setup-database.sh

# Or manually:
psql -U postgres
CREATE USER jarvis_user WITH PASSWORD 'your_password';
CREATE DATABASE jarvis_db OWNER jarvis_user;
\q
```

#### 3. Update .env

```env
DATABASE_URL=postgresql://jarvis_user:your_password@localhost:5432/jarvis_db
```

#### 4. Initialize Schema

Schema is automatically initialized on first run, or manually:

```bash
psql -U jarvis_user -d jarvis_db -f src/database/schema.sql
```

### Database Schema

**Tables:**

- `users`: User profiles and preferences
- `sessions`: Conversation sessions (1-hour TTL)
- `messages`: All conversation messages
- `entities`: Tracked entities for reference resolution
- `reasoning_traces`: Full reasoning audit trail
- `research_cache`: Cached research results (1-hour TTL)
- `query_cache`: Cached query responses (1-hour TTL)
- `analytics`: System usage analytics

### Automatic Cleanup

Expired records are automatically deleted every 10 minutes:

- Expired sessions (> 1 hour inactive)
- Expired cache entries
- Orphaned messages (via CASCADE)

### Performance

Database operations add minimal overhead:

- **Session lookup**: ~5-10ms
- **Message save**: ~5ms
- **Cache lookup**: ~5-10ms
- **Total overhead**: ~20ms per query ✅

### Graceful Degradation

If database is unavailable:

- ✅ System continues in memory-only mode
- ✅ All features work (conversation, reasoning, caching)
- ⚠️ Data lost on restart (not persisted)
- ✅ Automatic retry on next startup

### Monitoring

Check database health:

```typescript
const isHealthy = await db.healthCheck();
const stats = await db.getStats();
// { totalConnections, idleConnections, waitingConnections }
```

### Backup & Restore

**Backup:**

```bash
pg_dump -U jarvis_user jarvis_db > backup.sql
```

**Restore:**

```bash
psql -U jarvis_user jarvis_db < backup.sql
```

## Expanded Agent Capabilities

Jarvis now includes 4 additional agents for practical daily tasks:

### Finance Agent 💰

**Capabilities:**

- Track spending and expenses
- Analyze budget vs actual
- Categorize expenses
- Financial summaries and insights
- Set and check budgets
- Spending recommendations

**Example queries:**

- "Track $50 spending on groceries"
- "Show my budget analysis"
- "What's my spending in dining this month?"
- "Am I over budget in any category?"
- "Give me spending insights"

**Actions:**

- `track_spending`: Record a new expense
- `analyze_budget`: Compare spending vs budgets
- `categorize_expenses`: Group expenses by category
- `financial_summary`: Get overall financial overview
- `spending_insights`: Get recommendations
- `set_budget`: Set budget for a category
- `check_budget`: Check budget status

**Port:** 3004 (configurable via `FINANCE_AGENT_PORT`)

### Calendar Agent 📅

**Capabilities:**

- Create and manage events
- Find free time slots
- Set reminders
- Check schedule
- Cancel/reschedule events
- Time management insights

**Example queries:**

- "Create a meeting tomorrow at 2 PM"
- "What events do I have this week?"
- "Find free time tomorrow"
- "Set reminder to call John at 3 PM"
- "Am I busy on Friday?"

**Actions:**

- `create_event`: Create new calendar event
- `list_events`: List events for a period (today/week/month)
- `find_free_time`: Find available time slots
- `set_reminder`: Set a reminder
- `check_schedule`: Check schedule for a day
- `cancel_event`: Cancel an event
- `reschedule_event`: Move event to new time

**Port:** 3005 (configurable via `CALENDAR_AGENT_PORT`)

### Email Agent 📧

**Capabilities:**

- List and filter emails
- Auto-categorize messages
- Search inbox
- Mark read/archive
- Email summaries
- Inbox insights

**Example queries:**

- "Show unread emails"
- "Find emails from John"
- "Categorize my inbox"
- "What's in my inbox today?"
- "Email summary for this week"

**Actions:**

- `list_emails`: List emails (inbox/archived/spam)
- `filter_emails`: Filter by sender, subject, category, priority
- `categorize_emails`: Auto-categorize uncategorized emails
- `mark_read`: Mark email as read
- `archive_email`: Archive an email
- `search_emails`: Search by query
- `email_summary`: Get inbox summary and insights

**Port:** 3006 (configurable via `EMAIL_AGENT_PORT`)

### Code Agent 💻

**Capabilities:**

- Code review and feedback
- Explain code functionality
- Generate code from description
- Debug and fix issues
- Suggest improvements
- Write tests
- Generate documentation

**Example queries:**

- "Review this TypeScript code: [code]"
- "Explain what this function does: [code]"
- "Generate a function to sort an array"
- "Debug this code: [code with error]"
- "Suggest improvements for: [code]"
- "Write tests for: [code]"

**Actions:**

- `review_code`: Review code quality and provide feedback
- `explain_code`: Explain what code does
- `generate_code`: Generate code from description
- `debug_code`: Debug code and identify issues
- `suggest_improvements`: Suggest code improvements
- `write_tests`: Generate test code
- `document_code`: Generate documentation

**Requirements:**

- Requires LLM (Vertex AI endpoint) - all actions use LLM

**Port:** 3007 (configurable via `CODE_AGENT_PORT`)

### Total Agent Count: 7

1. **Dialogue Agent** - Conversational AI
2. **Web Agent** - Real-time search
3. **Knowledge Agent** - Deep research
4. **Finance Agent** - Budget tracking (NEW!)
5. **Calendar Agent** - Scheduling (NEW!)
6. **Email Agent** - Inbox management (NEW!)
7. **Code Agent** - Coding assistance (NEW!)

### Integration

All agents integrate seamlessly with:

- ✅ Advanced Reasoning Engine (intelligent routing)
- ✅ Context Manager (conversation awareness)
- ✅ Database Persistence (data saved)
- ✅ Orchestrator (coordinated execution)

## Voice Interface 🎙️

Jarvis now includes a complete voice interface with emotion-aware responses and barge-in capability.

### Features

#### 1. Speech-to-Text (STT)

- Powered by Google Speech-to-Text
- High accuracy transcription
- Multi-language support
- Real-time processing

#### 2. Text-to-Speech (TTS) with Emotion

- Powered by ElevenLabs
- 8 emotion types: neutral, warm, empathetic, excited, calm, serious, playful, urgent
- Voice cloning support (use your own voice)
- Natural, expressive speech

#### 3. Emotion Analysis

- LLM-powered emotion detection from user input
- Automatic tone matching for responses
- Context-aware emotional responses

#### 4. Barge-In (Interrupt While Speaking)

- Real-time voice activity detection (Picovoice Cobra)
- Instant interruption capability
- Preserves conversation context
- Full-duplex audio support

### Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure API Keys

Add to `.env`:

```env
# Voice & TTS
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
JARVIS_VOICE_ID=your_cloned_voice_id_here  # Optional

# Voice Activity Detection (Barge-In)
PICOVOICE_ACCESS_KEY=your_picovoice_access_key_here  # Optional
```

#### 3. Voice Cloning (Optional)

```bash
# Create directory
mkdir voice-samples

# Add your audio files (1-5 minutes total)
cp your-recording.mp3 voice-samples/sample1.mp3

# Run cloning script
npx ts-node scripts/clone-voice.ts

# Add voice ID to .env
JARVIS_VOICE_ID=your_voice_id_here
```

### Usage

#### Voice Mode Function

```typescript
// Voice mode is available globally after system start
handleVoiceMode();
```

#### Example Flow

1. **User speaks**: "I'm stressed about my finances"
2. **System**:
   - Transcribes speech (Whisper)
   - Detects emotion: "anxious"
   - Suggests tone: "empathetic"
   - Processes query (Finance Agent)
   - Generates empathetic response
   - Speaks in cloned voice with emotion
3. **User interrupts**: "Wait, show me details"
4. **System**:
   - Detects voice (Cobra VAD)
   - Stops speaking immediately
   - Processes interruption
   - Responds naturally

### Emotion Types

| Emotion        | When Used   | Example                             |
| -------------- | ----------- | ----------------------------------- |
| **Neutral**    | Facts, data | "Your balance is $1,250"            |
| **Warm**       | Greetings   | "Good morning! How can I help?"     |
| **Empathetic** | Problems    | "I understand this is stressful"    |
| **Excited**    | Good news   | "That's amazing! Congratulations!"  |
| **Calm**       | Anxiety     | "Let's work through this together"  |
| **Serious**    | Important   | "This requires immediate attention" |
| **Playful**    | Casual      | "Haha, that's a good one!"          |
| **Urgent**     | Emergency   | "Calling emergency services now"    |

### Costs

| Service                   | Free Tier       | Paid          |
| ------------------------- | --------------- | ------------- |
| **ElevenLabs**            | 10K chars/mo    | $5-22/mo      |
| **Picovoice**             | 10K requests/mo | Contact sales |
| **Google Speech-to-Text** | 60 min/mo free  | ~$0.004/min   |

**Estimated cost**: $0-10/month for personal use

### Troubleshooting

**No audio detected**

- Check microphone permissions
- Test: `arecord -l` (Linux) or System Preferences (Mac)

**Voice cloning failed**

- Ensure 1+ minute of audio
- Check audio quality (clear, no noise)
- Verify ElevenLabs API key

**Barge-in not working**

- Verify `PICOVOICE_ACCESS_KEY` in `.env`
- Check console for "Cobra VAD initialized"
- Install: `npm install @picovoice/cobra-node`

**Poor emotion detection**

- Provide more context in query
- Check LLM temperature settings

### Port

Voice Agent runs on port **3008** (configurable via `VOICE_AGENT_PORT`)

## Knowledge Agent Features

The Knowledge Agent provides intelligent research and information synthesis:

- **Research**: Multi-angle investigation of topics
  - Quick (1 query), Medium (3 queries), Deep (5 queries)
  - Automatic deduplication
  - Source relevance scoring
- **Fact Checking**: Verify claims with confidence scores
  - Multiple source verification
  - Confirming vs contradicting evidence
  - Verdicts: CONFIRMED, DISPUTED, UNVERIFIED
- **Summarization**: Generate summaries from web sources
  - Configurable source count
  - Snippet synthesis
  - Citation tracking

### Dependencies

Knowledge Agent depends on Web Agent for search capabilities. Ensure Web Agent is running before starting Knowledge Agent.

### Example Usage

**Research a Topic:**

```bash
curl -X POST http://localhost:3003/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "topic": "quantum computing applications",
      "depth": "medium"
    }
  }'
```

**Fact Check a Claim:**

```bash
curl -X POST http://localhost:3003/api/fact-check \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "claim": "TypeScript is a superset of JavaScript",
      "sources": 3
    }
  }'
```

**Summarize Information:**

```bash
curl -X POST http://localhost:3003/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "query": "AI agent architecture patterns",
      "maxSources": 5
    }
  }'
```

## Web Search Features

The Web Agent now provides real web search powered by Brave Search API:

- ✅ High-quality search results
- ✅ API key required (get free key at https://brave.com/search/api/)
- ✅ Safe search enabled (moderate by default)
- ✅ Configurable result count (default: 10, max: configurable)
- ✅ Automatic fallback on errors
- ✅ Average response time: 200-500ms
- ✅ Returns title, URL, snippet, and hostname for each result

### Example Usage

```bash
curl -X POST http://localhost:3002/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req_123",
    "agentId": "Web",
    "action": "search",
    "inputs": {
      "query": "artificial intelligence agents",
      "maxResults": 5
    },
    "userId": "test-user",
    "timestamp": "2026-01-30T12:00:00Z",
    "priority": "MEDIUM"
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "title": "Result Title",
        "url": "https://example.com",
        "snippet": "Result description...",
        "hostname": "example.com",
        "icon": "https://example.com/favicon.ico"
      }
    ],
    "query": "artificial intelligence agents",
    "resultCount": 5,
    "totalAvailable": 50,
    "timestamp": "2026-01-30T12:00:00Z",
    "source": "brave",
    "duration": 234
  },
  "metadata": {
    "duration": 234,
    "retryCount": 0
  }
}
```

### 🚧 Next Steps

- [ ] Database integration (PostgreSQL) for persistent agent state
- [ ] Additional specialized agents (analysis, search, etc.)
- [ ] Authentication and authorization
- [ ] Request queuing and priority handling
- [ ] Cost tracking and budget management
- [ ] WebSocket support for real-time communication
- [ ] Agent discovery and auto-registration
- [ ] Distributed tracing and monitoring

## Configuration

Copy `.env.example` to `.env` and configure:

- `LOG_LEVEL`: Logging verbosity (error, warn, info, debug)
- `ORCHESTRATOR_PORT`: Port for orchestrator service
- `DIALOGUE_AGENT_PORT`: Port for dialogue agent
- `HEALTH_CHECK_INTERVAL`: Health check frequency in milliseconds
- `DATABASE_URL`: PostgreSQL connection string (future use)

## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3+ (strict mode)
- **Web Framework**: Express
- **Database**: PostgreSQL (types only for now)
- **Testing**: Jest with ts-jest
- **Logging**: Winston
- **Environment**: dotenv

## License

ISC
