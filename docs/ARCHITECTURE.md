# System Architecture

**Document Version**: 1.0  
**Last Updated**: 2026-03-22  
**Status**: Current

## Architecture Overview

Jarvis implements a **Distributed Multi-Agent Architecture** with centralized orchestration. The system is designed for:

- **Scalability**: Agents run independently and can be scaled horizontally
- **Reliability**: Redundancy and automatic failover mechanisms
- **Maintainability**: Clear separation of concerns and well-defined interfaces
- **Security**: Defense-in-depth with multiple security layers

## Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer (Client)                           │
│  - Web UI, Desktop App, Voice Interface, External APIs │
└──────────────────────┬────────────────────────────────┘

┌──────────────────────▼────────────────────────────────┐
│  API & Security Layer                                 │
│  - Authentication, Authorization, Rate Limiting       │
│  - Request Validation, Error Handling                 │
│  - HTTP & WebSocket Endpoints                         │
└──────────────────────┬────────────────────────────────┘

┌──────────────────────▼────────────────────────────────┐
│  Business Logic Layer                                 │
│  - Orchestration & Routing                            │
│  - AI Reliability Mechanisms                          │
│  - Self-Healing & Diagnostics                         │
├──────────────────────────────────────────────────────┤
│  - Dialogue, Analysis, Reasoning Agents              │
│  - LLM Integration & Provider Selection              │
│  - Memory & Context Management                       │
└──────────────────────┬────────────────────────────────┘

┌──────────────────────▼────────────────────────────────┐
│  Infrastructure & Data Layer                         │
│  - Database (PostgreSQL)                             │
│  - Cache (Redis)                                     │
│  - Logging & Metrics                                 │
└──────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### Request Flow (Happy Path)

```
Client Request
    │
    ▼
API Server (Express)
    │ [Authentication]
    ▼
Security Middleware
    │ [Rate Limiting, Validation]
    ▼
Orchestrator
    │ [Route to appropriate agent(s)]
    ├─ Query Agent Registry
    ├─ Select best agent based on capability
    ▼
Agent (Dialogue/Analysis/Reasoning)
    │ [Process request]
    ├─ LLM Provider Interface
    │   │ [Query LLM]
    │   ▼
    │ Claude/GPT/Vertex AI
    │   │ [Response]
    │   ▼
    │ LLM Response
    ▼
Reliability Engine
    │ [Verify response quality]
    ├─ Chain-of-Thought Verification
    ├─ Self-Consistency Checks
    ├─ Debate if conflicting
    └─ Score response
    ▼
Memory System
    │ [Store for future context]
    └─ Short-term Cache + Long-term DB
    ▼
Response to Client
```

### Error Recovery Flow

```
Failure Detected
    │
    ▼
Orchestrator Failover
    │ [Try backup agent]
    ├─ Check registry for alternatives
    ├─ Retry with different agent
    │
    ├─ If still failing:
    ▼
Self-Healing System
    │ [Automatic diagnosis]
    ├─ DiagnosticEngine: Analyze symptoms
    ├─ Identify root cause
    ├─ RecoverySystem: Execute fix
    │   ├─ Restart service
    │   ├─ Clear cache
    │   ├─ Reset connections
    ▼
Health Restored or Graceful Degradation
    │ [Return cached result or partial response]
    ▼
Client Notification
```

## Module Architecture

### Core Modules (Mandatory)

| Module | Responsibility | Scope |
|--------|---|---|
| **Orchestrator** | Request routing & agent coordination | System-wide |
| **Agents** | Specialized task execution | Domain-specific |
| **API** | HTTP server & request/response handling | Server interface |
| **Security** | Auth, authz, encryption, audit logging | System-wide |
| **Database** | Data persistence & queries | System-wide |
| **Config** | Configuration management | System-wide |

### Supporting Modules

| Module | Responsibility | Purpose |
|--------|---|---|
| **Reliability** | Response verification & quality scoring | AI quality assurance |
| **Self-Healing** | Diagnostics, recovery, learning | System resilience |
| **Memory** | Conversation history & context | Continuity |
| **LLM** | Multi-LLM provider abstraction | AI provider independence |
| **Voice** | Speech processing | Voice interaction |
| **Services** | Logging, metrics, utilities | Cross-cutting |
| **Middleware** | HTTP middleware components | Request processing |
| **Reasoning** | Inference & decision-making | Logic layers |

## Data Flow Architecture

### Synchronous Flows
- Request → Orchestration → Agent → Response (must complete)

### Asynchronous Flows
- Long-running analysis → Event notification
- Health check monitoring
- Memory optimization
- Audit logging

### Caching Strategy

```
L1: In-Memory Cache (Services layer)
    ├─ Agent capabilities: 5 minute TTL
    ├─ User permissions: 10 minute TTL
    ├─ Recent queries: 1 hour TTL

L2: Redis Cache (Distributed)
    ├─ Session data
    ├─ Short-term memory (24 hours)

L3: Database Cache (PostgreSQL)
    ├─ Long-term memory
    ├─ Audit logs
    ├─ Configuration
```

## Deployment Architecture

### Single-Node Deployment
```
Docker Container (Jarvis App)
├─ Node.js + all modules
├─ PostgreSQL (sidecar or shared)
└─ Redis (sidecar or shared)
```

### Multi-Node Deployment (Future)
```
Load Balancer
    ├─ Orchestrator Node 1
    ├─ Orchestrator Node 2
    └─ Orchestrator Node N
        ├─ Agent Nodes (separate cluster)
        ├─ Agent Nodes
        └─ Agent Nodes
    ├─ Shared PostgreSQL
    └─ Redis Cluster
```

## Dependency Graph

```
orchestrator
    ├─ agents
    ├─ security
    ├─ api
    ├─ config
    ├─ services
    └─ database

agents
    ├─ api
    ├─ llm
    ├─ security
    ├─ config
    ├─ services
    └─ memory

api
    ├─ security
    ├─ middleware
    ├─ services
    └─ config

reliability
    ├─ ai-engine (llm providers)
    ├─ services
    ├─ config
    └─ database

self-healing
    ├─ database
    ├─ services
    ├─ config
    └─ api

security
    ├─ database
    ├─ config
    ├─ services

database
    ├─ config
    └─ services

llm
    ├─ config
    ├─ security
    └─ services

memory
    ├─ database
    ├─ config
    └─ services

voice
    ├─ services
    └─ config

middleware
    ├─ security
    ├─ config
    └─ services
```

## Design Patterns Used

### Orchestrator Pattern
Central coordinator that directs requests to specialized services.

### Repository Pattern
Data access abstraction through repositories for consistency.

### Factory Pattern
Creating objects (providers, agents) through factory functions.

### Middleware Pattern
HTTP middleware pipeline for cross-cutting concerns.

### Strategy Pattern
Pluggable LLM providers and reasoning strategies.

### Observer Pattern
Event-based monitoring for health checks and diagnostics.

## Scalability Considerations

### Horizontal Scaling
- Agents can run on separate machines
- Load balancer distributes requests
- Shared database and cache required

### Vertical Scaling
- Increase CPU/memory on server
- Optimize cache sizes
- Database connection pooling

### Bottlenecks
1. **Database**: Use read replicas for scaling reads
2. **LLM APIs**: Rate limiting handled by provider
3. **Redis**: Memory constraints on large caches
4. **Agent availability**: Redundancy via multiple agents

## Security Architecture

### Defense in Depth

```
Layer 1: API Gateway
    └─ TLS encryption, IP whitelist, rate limiting

Layer 2: Authentication
    └─ JWT tokens, credentials validation

Layer 3: Authorization
    └─ RBAC, permission checking

Layer 4: Data Protection
    └─ Field-level encryption, database encryption

Layer 5: Audit Logging
    └─ All security events logged

Layer 6: Monitoring
    └─ Real-time alerts for suspicious activity
```

### Credential Management
- API keys in environment variables only
- Database credentials encrypted
- Secrets manager for sensitive data
- No credentials logged or transmitted in plaintext

## Performance Architecture

### Optimization Strategies

1. **Caching**: Multi-level caching (in-memory, Redis, DB)
2. **Async Processing**: Long operations don't block requests
3. **Connection Pooling**: Reuse database and LLM connections
4. **Request Batching**: Combine multiple requests when possible
5. **Load Balancing**: Distribute across available agents

### Target Performance

| Operation | Target | Actual |
|-----------|--------|--------|
| Health check | <50ms | 10-30ms |
| Simple query | <200ms | 150-400ms |
| Complex reasoning | <2s | 1-3s |
| CoT verification | <1s | 500ms-2s |

## Monitoring & Observability

### Metrics Collected
- Request latency (p50, p95, p99)
- Error rates by type
- Agent availability
- Cache hit rates
- Database query times
- LLM API latencies

### Logging Strategy
- **INFO**: Important business events
- **DEBUG**: Detailed execution flow
- **ERROR**: Exceptions and failures
- **AUDIT**: Security events

### Health Checks
- Orchestrator: Every 10 seconds
- Agents: Every 30 seconds
- Database: Every 60 seconds
- LLM providers: On failure

## Testing Strategy

### Unit Tests
- Module-level: 80%+ coverage
- Dependencies mocked

### Integration Tests
- Module interactions
- Database operations
- API endpoints

### End-to-End Tests
- Complete request flows
- Error scenarios
- Performance benchmarks

## Deployment Pipeline

```
Code Commit
    │
    ▼
CI Pipeline (GitHub Actions)
    ├─ Lint & Format Check
    ├─ Type Checking
    ├─ Unit Tests
    ├─ Integration Tests
    └─ Build Docker Image
    │
    ▼ (if all pass)
Push to Registry
    │
    ▼
Deploy to Staging
    ├─ Smoke Tests
    ├─ Performance Tests
    └─ Security Scan
    │
    ▼ (if staging passes)
Manual Approval
    │
    ▼
Deploy to Production
    ├─ Blue-Green Deployment
    ├─ Health Checks
    ├─ Metrics Validation
    └─ Rollback if issues
```

## Future Architecture Evolution

### Planned Improvements
1. **Distributed Orchestration**: Multi-region support
2. **Vector Database**: For semantic search in memory
3. **Event-Driven**: Kafka/RabbitMQ for async workflows
4. **GraphQL**: In addition to REST API
5. **Advanced Scheduling**: Job queues for long operations

### Potential Refactors
1. Microservices split (if scaling needed)
2. Service mesh for service-to-service communication
3. CQRS for complex queries
4. Event sourcing for audit trail

## Architecture Decision Records (ADRs)

Detailed decisions documented in `docs/adr/`:
- ADR-001: Agent Orchestration Pattern
- ADR-002: Security Layer Design
- ADR-003: Self-Healing Diagnostic Approach

See `docs/adr/` directory for full ADR history.

---

**Architecture Review**: 2026-03-22  
**Next Review**: 2026-06-22  
**Contact**: [Architecture Team]
