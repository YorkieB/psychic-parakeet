# Reasoning Module

## Overview

The reasoning module implements multiple reasoning engines and inference strategies for the Jarvis system. It handles intent detection, decision-making, multi-step reasoning, and response synthesis using both LLMs and rule-based logic.

## Architecture

```
User Query
    ↓
Intent Detection
    ↓
Reasoning Engine Selection
    ├── Chain-of-Thought (COT)
    ├── Tree of Thought (TOT)
    ├── Graph-based Reasoning
    └── Rule-based Inference
    ↓
Response Synthesis
    ↓
Response Formatting
```

## Key Components

- **Intent Detector** (`intent-detector.ts`): Classify user intents
- **Chain-of-Thought** (`cot-reasoning.ts`): Step-by-step reasoning
- **Tree-of-Thought** (`tot-reasoning.ts`): Explore multiple reasoning paths
- **Graph Reasoner** (`graph-reasoning.ts`): Entity and relationship reasoning
- **Rule Engine** (`rule-engine.ts`): Apply domain-specific rules
- **Response Synthesizer** (`response-synthesizer.ts`): Generate coherent responses

## Usage

### Intent Detection

```typescript
import { detectIntent } from './intent-detector';

const intent = await detectIntent('Schedule a meeting tomorrow at 2 PM');
// { intent: 'schedule_event', confidence: 0.95, parameters: { time: '2 PM', date: 'tomorrow' } }
```

### Chain-of-Thought Reasoning

```typescript
import { ChainOfThoughtReasoner } from './cot-reasoning';

const reasoner = new ChainOfThoughtReasoner();

const result = await reasoner.reason({
  question: 'If Alice has 5 apples and Bob gives her 3 more, how many does she have?',
  maxSteps: 5
});

// Returns step-by-step reasoning with final answer
```

### Graph-Based Reasoning

```typescript
import { GraphReasoner } from './graph-reasoning';

const reasoner = new GraphReasoner();

// Add facts to knowledge graph
await reasoner.addFact('Alice is a doctor');
await reasoner.addFact('Doctors help people');

// Query with reasoning
const result = await reasoner.query('What does Alice do?');
// Infers: Alice helps people
```

### Rule Engine

```typescript
import { RuleEngine } from './rule-engine';

const engine = new RuleEngine();

// Define rules
engine.addRule({
  condition: (user) => user.purchaseHistory > 1000,
  action: () => ({ discount: 0.20, label: 'VIP' })
});

// Apply rules
const result = engine.apply({ purchaseHistory: 1500 });
// { discount: 0.20, label: 'VIP' }
```

## Configuration

```env
# Reasoning Engine
REASONING_ENGINE=cot  # cot, tot, graph, rule

# LLM Integration
REASONING_LLM_MODEL=gpt-4
REASONING_TEMPERATURE=0.7

# Intent Detection
INTENT_DETECTION_THRESHOLD=0.7
INTENT_FALLBACK_STRATEGY=ask_clarification

# Reasoning Parameters
MAX_REASONING_STEPS=5
MAX_REASONING_BRANCHES=3
REASONING_TIMEOUT=30000

# Knowledge Graph
KNOWLEDGE_GRAPH_ENABLED=true
KNOWLEDGE_GRAPH_BACKEND=neo4j
```

## Reasoning Strategies

### Chain-of-Thought (COT)
- Best for: Multi-step logical problems
- Process: Break down → reason step-by-step → conclude
- Example: Math problems, instructions

### Tree-of-Thought (TOT)
- Best for: Complex decisions with multiple paths
- Process: Explore branches → evaluate → select best
- Example: Planning, optimization

### Graph-Based
- Best for: Relationship and entity reasoning
- Process: Build knowledge graph → query → infer
- Example: Who, what, where questions

### Rule-Based
- Best for: Domain-specific logic
- Process: Match conditions → apply rules
- Example: Business rules, classifications

## Related Standards

- `.github/docs/logic/PURE-FUNCTION-STANDARDS.md` — Reasoning purity
- `.github/docs/logic/INVARIANT-ENFORCEMENT-STANDARDS.md` — Reasoning invariants
- `.github/docs/logic/ASYNC-FLOW-CORRECTNESS.md` — Async reasoning

## Performance Optimization

- **Caching** — Cache reasoning results for repeated queries
- **Lazy Evaluation** — Only compute necessary branches
- **Memoization** — Cache intermediate reasoning steps
- **Parallelization** — Explore multiple branches concurrently

## Integration Points

- **LLM** (`src/llm/`): Uses LLM for reasoning
- **Agents** (`src/agents/`): Agents use reasoning for decisions
- **Memory** (`src/memory/`): Reasoning accesses memory for context
- **Services** (`src/services/`): High-level service layer
