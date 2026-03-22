# ADR-001: Agent Orchestration Pattern

## Status

Accepted

## Date

2026-03-22

## Context

Jarvis is implemented as a multi-agent system rather than a single monolith.
The runtime starts many specialized agents, each with its own capabilities,
health endpoint, and operational concerns. The codebase already reflects this
through `src/orchestrator/agent-registry.ts`, `src/orchestrator/orchestrator.ts`,
the startup flow in `src/index.ts`, and the self-healing configuration under
`src/self-healing/config/agents.config.ts`.

Three pressures make the orchestration approach a first-class architectural
decision:

1. **Capability-based routing is required.** Dialogue, Web, Knowledge,
   Reliability, Voice, and other agents expose different behaviors and should be
   independently evolvable.
2. **Health and availability vary per agent.** Requests cannot be dispatched
   blindly; the system must check whether an agent is online or degraded before
   work is sent.
3. **Recovery must remain external to individual agents.** The self-healing
   subsystem needs a stable registration and endpoint model so it can monitor,
   restart, and diagnose agents without each agent reinventing supervision
   logic.

The existing runtime already favors HTTP-accessible agents with a shared
registration contract (`agentId`, `capabilities`, `healthEndpoint`,
`apiEndpoint`, `dependencies`, `priority`). This ADR formalizes that pattern so
future contributors extend the system consistently instead of coupling new
features directly into the startup layer or API server.

## Decision

Jarvis adopts a **registry + orchestrator + agent endpoint** pattern.

- **The Agent Registry is the source of runtime truth.** It owns registration,
  availability checks, health summaries, and the endpoint metadata required to
  reach each agent.
- **The Orchestrator is the execution coordinator.** It turns user or system
  intent into an `AgentRequest`, checks registry availability, and dispatches
  work with retries and backoff.
- **Agents expose stable HTTP contracts.** Each agent is responsible for a
  health endpoint plus a documented action surface that can be called by the
  orchestrator or by proxy controllers.
- **Startup remains composition-only.** `src/index.ts` can instantiate and
  register agents, but it should not become the place where routing rules,
  retry policy, or monitoring logic are duplicated.
- **Self-healing integrates through the same contract.** Monitoring, health
  events, respawn flows, and diagnostics operate on registered agents rather
  than hidden in-process references.

This means new agents should:

1. inherit from the shared base abstractions,
2. expose capabilities and dependencies explicitly,
3. register through the common contract, and
4. rely on the orchestrator for cross-agent dispatch instead of directly
   reaching into other agents whenever possible.

## Alternatives Considered

### Direct cross-agent imports

This would let one agent instantiate or call another directly. It was rejected
because it creates hidden dependencies, bypasses health checks, and makes
supervision harder.

### Central monolithic service layer

A single service could absorb all features and hide agents behind internal
classes. That was rejected because it removes the operational isolation that the
current system already depends on for health monitoring and targeted recovery.

### Event-only publish/subscribe orchestration

An asynchronous event bus could decouple agents further, but it was deferred for
Phase 1 because the current user-facing flows are request/response oriented and
already modeled as HTTP actions with execution metadata.

## Consequences

### Positive

- New agent domains can be added with a predictable onboarding path.
- Monitoring, recovery, and documentation all share one mental model.
- The API layer can proxy or document agent behavior without embedding agent
  internals.

### Negative

- The pattern introduces an extra layer of indirection compared with direct
  method calls.
- Endpoint and registration metadata must stay accurate or requests will fail in
  confusing ways.
- Startup code still carries manual registration steps that should eventually be
  reduced.

### Follow-up

- Expand documentation coverage so more agent surfaces are represented through
  curated domain entry points and OpenAPI controllers.
- Revisit whether selected agent-to-agent calls should move fully behind the
  orchestrator contract.

## Related Decisions

- ADR-002: Security Layer Design
- ADR-003: Self-Healing Diagnostic Approach
- `docs/DOCUMENTATION-STRATEGY.md`
- `docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md`
