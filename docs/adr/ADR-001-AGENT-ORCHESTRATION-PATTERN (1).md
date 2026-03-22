# ADR-001: Agent Orchestration Pattern

## Status
Accepted

## Date Created
2026-03-22

## Date Superseded
N/A

## Context

Jarvis V4 is a production AI assistant ecosystem composed of 40+ discrete services spanning
dialogue management, web search, knowledge retrieval, code execution, self-healing, security,
voice synthesis, and more. As the codebase grew beyond 275 files, it became clear that the
original ad-hoc approach — where agents were imported directly and invoked procedurally —
was unsustainable. Direct imports created tight coupling between subsystems, making it
impossible to add a new agent without touching core orchestration logic, and impossible to
test agents in isolation.

The central challenge is that Jarvis must coordinate agents that operate at very different
timescales and modalities. Some requests (e.g., "What time is it?") are answered in
milliseconds by a lightweight local model. Others (e.g., "Research quantum computing and
write a 2,000-word report") require a multi-step planning cycle involving web search, RAG
retrieval, synthesis, and verification — potentially spanning 30+ seconds. A single
synchronous dispatch model cannot serve both cases well.

Additionally, Jarvis must handle the "thundering herd" problem: when multiple subsystems
request agent capacity simultaneously (e.g., self-healing triggers while the user is mid-query),
the system must gracefully prioritise and queue rather than deadlock or degrade. This requires
a well-defined lifecycle contract for every agent: registration, health reporting, job acceptance,
and graceful shutdown.

Finally, the architecture must support the Reliability Score System, which requires any agent
that generates factual output to be auditable. The orchestrator must be able to attach
provenance metadata — which agent ran, what tools it called, what sources it cited — to every
response, without requiring individual agents to implement this themselves.

## Decision

Adopt a **Registry + Supervisor + Worker-Dispatcher** pattern for all agent orchestration in
Jarvis V4, implemented on top of LangGraph's stateful graph model.

The architecture has four layers:

**1. Central Agent Registry (Singleton)**
A single `AgentRegistry` class, initialised at startup, holds a map of `agentId → AgentDescriptor`.
Each descriptor captures the agent's name, domain, capability tags (`@agent`, `@domain`,
`@critical`), health-check endpoint, concurrency limit, and current status
(`IDLE | BUSY | DEGRADED | OFFLINE`). Agents register themselves at module load time via
a `registry.register(descriptor)` call. No agent is hardcoded into the orchestrator.

**2. Supervisor Node (LangGraph Central Router)**
The Supervisor is a LangGraph node that runs on every user request and on every
inter-agent handoff. It receives the current `JarvisState` object — which contains the
conversation history, active tool outputs, pending tasks, and session metadata — and uses an
LLM call (Claude Sonnet as primary, GPT-4o in consensus mode for high-stakes routing
decisions) to decide which agent to dispatch to next. The Supervisor implements the ReAct
(Reason + Act) loop: it reasons over state, selects an agent, observes the agent's output,
and reasons again. This cycle continues until the task is complete or a maximum step limit is
reached.

**3. Orchestrator Service (Lifecycle Management)**
The `OrchestratorService` sits between the Supervisor and the Registry. It accepts job
requests from the Supervisor, checks Registry availability, enforces concurrency limits,
dispatches jobs to agents, and collects results. It also attaches provenance metadata to
every agent output before returning it to the Supervisor. Critically, the Orchestrator
implements graceful shutdown: when an agent needs to restart (e.g., during self-healing), the
Orchestrator stops routing new jobs to it but allows in-flight jobs to complete before
deregistration.

**4. Worker-Dispatcher Model for Stateless Scaling**
Following the Worker-Dispatcher pattern (as validated in the Jarvis Scalable Architecture
research), agents do not expose inbound HTTP ports. Instead, they connect outbound to the
Orchestrator's control plane via an internal WebSocket channel, signal availability, and
accept dispatched jobs. This eliminates the need for sticky-session configuration on the
Kubernetes ingress and allows true load balancing: a busy agent simply does not signal
availability.

The LangGraph `State` object is persisted via `PostgresSaver` at every graph step. Each user
session has a `thread_id`; the Orchestrator loads the checkpoint on session resume, ensuring
full conversational continuity even across agent restarts or pod evictions.

## Alternatives Considered

### Alternative A — Direct Agent Imports (Procedural Dispatch)
The original Jarvis V3 approach. Each feature that needed an agent imported it directly:
`import { DialogueAgent } from '../agents/dialogue'`. Works at small scale (< 10 agents) but
breaks down with 40+ agents because: (1) circular imports become likely, (2) adding a new
agent requires editing the calling code, (3) there is no central health visibility, (4) testing
requires instantiating the entire dependency tree.
**Rejected** because it does not scale to the current ecosystem size and produces tight
coupling that contradicts the layering standards in LAYERING-STANDARDS.md.

### Alternative B — Service Mesh (Istio / Linkerd)
A full service mesh would handle agent-to-agent communication via sidecar proxies, with
mTLS, circuit breaking, and observability built in. This is the standard pattern for large
microservices deployments. However, the overhead of injecting sidecars into 40+ agents,
managing Istio's control plane, and training the team on mesh configuration is disproportionate
for a system that currently runs on a single DigitalOcean droplet or small Kubernetes cluster.
**Rejected** for current scale. Revisit in ADR-004 if Jarvis is deployed across multiple
regional clusters.

### Alternative C — Publish-Subscribe (Kafka / NATS)
A fully async pub/sub model where agents subscribe to topic queues and produce results to
output topics. This would decouple agents completely and enable event-driven workflows.
However, the user-facing Dialogue Agent requires synchronous request-response semantics:
the user types a message and expects a reply. Wrapping synchronous dialogue in async topics
adds latency, complicates error propagation, and makes debugging substantially harder.
**Rejected** for the primary dialogue loop. Pub/sub remains appropriate for background agents
(e.g., the self-healing monitor, the knowledge base updater) and will be documented in a
separate ADR.

### Alternative D — OpenAI Assistants API / Proprietary Orchestration
Delegating orchestration to a managed service (e.g., OpenAI Assistants) would reduce
implementation effort but introduces vendor lock-in, limits control over the memory substrate,
and makes it impossible to audit the reliability scoring pipeline. The Jarvis V4 architecture
research explicitly identifies this as a critical risk.
**Rejected** on grounds of vendor lock-in and lack of control over retrieval logic and
provenance tracking.

## Consequences

**Benefits:**
- ✅ Agents are loosely coupled — a new agent is added by writing the agent class and calling
  `registry.register()`. Zero changes to the Supervisor or Orchestrator.
- ✅ Full health visibility — the Registry exposes a `/health` endpoint aggregating all agent
  statuses, enabling the Self-Healing subsystem (see ADR-003) to detect degraded agents
  automatically.
- ✅ Provenance metadata is attached at the Orchestrator layer, not in individual agents,
  keeping agent code clean and ensuring consistent audit trails across all 40+ agents.
- ✅ LangGraph's `PostgresSaver` checkpointing gives full conversational continuity across
  restarts, deployments, and pod evictions — critical for the Jarvis companion use case.
- ✅ The Worker-Dispatcher model maps directly onto Kubernetes deployment patterns,
  enabling KEDA-driven autoscaling based on job queue depth rather than CPU utilisation.

**Trade-offs:**
- ⚠️ The Registry adds one indirection layer to every agent call. Benchmarks on comparable
  systems show < 2ms overhead per dispatch, which is acceptable given typical agent
  execution times of 100ms–30,000ms.
- ⚠️ The Supervisor LLM call consumes tokens on every routing decision. For simple
  deterministic routes (e.g., "always send time queries to the Calendar Agent"), a rule-based
  fast path should be implemented to skip the LLM call and reduce cost.
- ⚠️ The `PostgresSaver` introduces a PostgreSQL dependency. This must be provisioned and
  backed up. Connection pooling (via PgBouncer) is recommended for high-concurrency
  scenarios.

**Risks accepted:**
- ❌ If the Registry singleton crashes, all agent routing fails. Mitigation: the Registry is
  stateless (agents re-register on startup) and should be deployed as a highly available
  service with a health watchdog.
- ❌ The Supervisor's LLM routing decisions are non-deterministic. A misrouted request could
  dispatch to the wrong agent. Mitigation: the Enforcement Supervisor validates all Supervisor
  decisions against a routing rules table before dispatch. Anomalies are logged and trigger
  a fallback to rule-based routing.

## Related Decisions
- ADR-002: Security Layer Design — the Orchestrator is the enforcement point for the security
  layer; all agent inputs/outputs pass through it.
- ADR-003: Self-Healing & Diagnostic Approach — the Registry's health status feeds the
  self-healing monitor; the Orchestrator's graceful shutdown protocol is a prerequisite for
  non-disruptive agent recovery.

## Review History
2026-03-22 — Accepted at project architecture review. No dissenting opinions recorded.
