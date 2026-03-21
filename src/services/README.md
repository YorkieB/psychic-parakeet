# Services Module

## Overview

The services module provides high-level business logic and orchestration services that combine multiple components. Services expose clean APIs for complex multi-step operations like conversation management, user onboarding, and system integration.

## Architecture

```
Controllers/Routes
    ↓
Services (business logic)
    ├── Compose multiple modules
    ├── Implement workflows
    ├── Handle transactions
    └── Manage state
    ↓
Agents, Memory, LLM, Database, etc.
```

## Key Services

- **Conversation Service** — Manage conversations, context, history
- **User Service** — User profiles, preferences, settings
- **Agent Service** — Agent lifecycle and integration
- **Analytics Service** — Usage tracking and reporting
- **Integration Service** — Third-party service integration
- **Notification Service** — User notifications and alerts

## Service Pattern

Each service follows this pattern:

```typescript
export class ConversationService {
  constructor(
    private repo: ConversationRepository,
    private memory: MemoryManager,
    private llm: LLMClient
  ) {}

  async startConversation(userId: string, topic: string) {
    // Validation
    // Execute business logic
    // Update state (database, memory)
    // Return result
  }
}
```

## Usage Examples

### Conversation Service

```typescript
import { getConversationService } from './conversation.service';

const service = getConversationService();

// Start new conversation
const conversation = await service.startConversation(
  'user123',
  'discuss-project'
);

// Add message
const message = await service.addMessage({
  conversationId: conversation.id,
  role: 'user',
  content: 'Hello, let\'s discuss the project'
});

// Get context (includes memory and history)
const context = await service.getContext(conversation.id);

// End conversation
await service.endConversation(conversation.id);
```

### User Service

```typescript
import { getUserService } from './user.service';

const service = getUserService();

// Get user profile
const user = await service.getProfile('user123');

// Update preferences
await service.updatePreferences('user123', {
  language: 'es',
  theme: 'dark'
});

// Get user history
const history = await service.getHistory('user123', { limit: 10 });
```

### Agent Service

```typescript
import { getAgentService } from './agent.service';

const service = getAgentService();

// Get available agents
const agents = await service.listAgents();

// Execute agent with automatic orchestration
const result = await service.execute({
  agentType: 'knowledge',
  input: 'Research topic: quantum computing',
  context: userContext
});
```

## Configuration

```env
# Services
SERVICE_TIMEOUT=30000
SERVICE_RETRY_MAX=3
SERVICE_CACHE_ENABLED=true
SERVICE_CACHE_TTL=3600
```

## Common Patterns

### Error Handling

```typescript
try {
  const result = await service.operation();
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  } else if (error instanceof NotFoundError) {
    // Handle not found
  } else {
    // Handle generic error
    throw error;
  }
}
```

### Logging

```typescript
// Services log important operations
logger.info('Conversation started', {
  conversationId: conv.id,
  userId: 'user123',
  topic: 'project-discussion'
});
```

### Dependency Injection

```typescript
// Services receive dependencies via constructor
const conversationService = new ConversationService(
  new ConversationRepository(db),
  memoryManager,
  llmClient,
  logger
);
```

## Related Standards

- `.github/docs/architecture/LAYERING-STANDARDS.md` — Service layer responsibilities
- `.github/docs/logic/PURE-FUNCTION-STANDARDS.md` — Service purity
- `.github/docs/error-handling/ERROR-HANDLING-STANDARDS.md` — Error handling

## Testing Services

```typescript
// Mock dependencies
const mockRepo = {
  findById: jest.fn(),
  create: jest.fn()
};

const service = new ConversationService(mockRepo, memory, llm);

// Test
it('should start conversation', async () => {
  const result = await service.startConversation('user123', 'topic');
  expect(result).toBeDefined();
});
```

## Integration Points

- **Controllers** (`src/api/`): Call services to handle requests
- **Agents** (`src/agents/`): Services may use agents
- **Memory** (`src/memory/`): Services persist state
- **Database** (`src/database/`): Services query data
- **LLM** (`src/llm/`): Services use LLM for reasoning

## Best Practices

- [ ] Keep services focused on one business capability
- [ ] Inject dependencies via constructor
- [ ] Validate input at service boundary
- [ ] Use transactions for multi-step operations
- [ ] Log important operations
- [ ] Implement timeouts
- [ ] Handle partial failures gracefully
- [ ] Test services with mocked dependencies
