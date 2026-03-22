# ADR-003: Self-Healing Diagnostic Approach

## Status

Accepted

## Date

2026-03-22

## Context

Jarvis is designed to keep multiple agents running concurrently, which means
runtime health issues are not exceptional edge cases; they are a normal part of
operating the platform. The repository already includes a self-healing stack in
`src/self-healing/**`, including:

- sensors that probe agent health,
- lifecycle and pool management for spawn and respawn behavior,
- dashboard events for operational visibility,
- a diagnostic engine that turns incidents into structured bug reports, and
- a health event handler that decides when diagnosis or repair should run.

This subsystem is more than simple restart logic. `AgentPoolManager` isolates
health checks so one hung agent cannot block others. `HealthEventHandler`
records incident history and classifies events into warnings, errors, and
crashes. `DiagnosticEngine` converts those incidents into RAG-backed diagnosis
requests that can propose repair strategies. The system therefore needs an ADR
that clarifies when recovery is automatic, when diagnosis is advisory, and how
confidence affects repair decisions.

## Decision

Jarvis adopts a **supervised self-healing model with gated diagnosis and repair**.

- **Monitoring is continuous and parallelized.** Health checks should be
  isolated per agent so one failure never stalls the rest of the monitoring
  loop.
- **Incidents are normalized into health events.** Errors, crashes, and severe
  degradations are converted into a consistent event structure with metrics,
  message, stack trace, and component context.
- **Diagnosis is enabled by default.** When serious events occur, the
  `DiagnosticEngine` should attempt to explain the failure and recommend a fix
  strategy.
- **Auto-repair is gated by confidence and policy.** The repository defaults to
  diagnosis-on, repair-off unless explicitly enabled. Even when auto-repair is
  turned on, only strategies that meet the configured confidence threshold and
  allowed strategy list should execute automatically.
- **Restart remains the safest default repair path.** Code or configuration
  repair suggestions are valuable, but immediate runtime recovery should prefer
  bounded operations such as respawn or restart unless a stronger automation
  policy is intentionally enabled.

This decision balances resilience with safety. The system should learn from
incidents, surface structured explanations, and recover quickly where possible,
but it should not silently apply speculative code changes just because an LLM
produced them.

## Alternatives Considered

### Restart-only watchdog

A minimal watchdog that only restarts crashed agents is simple, but it loses the
operational context needed to improve the system over time. It was rejected as
too shallow for a platform that already carries diagnostic infrastructure.

### Fully autonomous code repair

Automatically applying generated fixes for every incident was rejected because
the confidence model and review process are not mature enough to make that safe
for all agent domains.

### Manual-only incident handling

Deferring all diagnosis to humans was rejected because it slows recovery and
throws away the value already present in the RAG-based diagnostic pipeline.

## Consequences

### Positive

- Operators get fast recovery plus richer incident context.
- Diagnosis output can feed future repairs, docs, and reliability work.
- The model scales from simple restart policies to more advanced automation
  without rewriting the subsystem.

### Negative

- The self-healing stack introduces more moving parts and more configuration.
- Poorly tuned confidence thresholds could produce noisy recommendations.
- Recovery behavior depends on accurate health signals from sensors.

### Follow-up

- Keep documenting the knowledge-base, diagnostic, and repair surfaces as the
  automation policy expands.
- Revisit repair strategy defaults when there is stronger evidence that specific
  automatic repairs are consistently safe.

## Related Decisions

- ADR-001: Agent Orchestration Pattern
- ADR-002: Security Layer Design
- `docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md`
