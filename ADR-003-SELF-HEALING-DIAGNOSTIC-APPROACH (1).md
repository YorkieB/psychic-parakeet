# ADR-003: Self-Healing & Diagnostic Approach

## Status
Accepted

## Date Created
2026-03-22

## Date Superseded
N/A

## Context

Jarvis V4 is required to achieve a 99% task success rate. With 40+ services in the ecosystem
and a growing codebase of 275+ files, achieving this target through manual monitoring alone
is not feasible. Failures must be detected, diagnosed, and resolved with minimal human
intervention, and the system must continue serving the user during recovery where at all
possible.

The failure modes in a multi-agent AI system are qualitatively different from those in a
standard web application. In addition to conventional infrastructure failures (crashed pods,
network timeouts, database connection exhaustion), Jarvis must handle:

**Agent degradation**: An agent continues to run but produces unreliable outputs — for
example, the Knowledge Agent returns results with Reliability Scores below threshold because
its vector store index has become stale, or the SQL Agent produces syntactically invalid
queries after a database schema change.

**Dependency drift**: An npm package update silently breaks a dependent service. The
jarvis-guardian tooling has identified this as a recurring issue across the 40+ service
ecosystem, where mismatched peer dependencies caused cascade failures that were difficult
to trace.

**LLM hallucination drift**: Over time, the prompts and few-shot examples used to guide
agent behaviour become misaligned with the codebase's actual capabilities, causing the
Supervisor to route requests incorrectly or agents to attempt tool calls that no longer exist.

**Silent failures in background agents**: Agents that run asynchronously (e.g., the Knowledge
Base Updater, the ADR Freshness Monitor, the Reliability Score Re-evaluator) can fail silently
without the user ever noticing — until a query returns stale or incorrect data.

**Cascading failures**: A failure in one agent can propagate to dependent agents. If the
Orchestrator cannot reach the Knowledge Agent, it must not silently fall through to a less
reliable fallback — it must surface the degradation explicitly and attempt recovery before
serving the user.

The self-healing system must be non-disruptive: recovery actions must not interrupt in-flight
user sessions, and the system must maintain partial capability during recovery rather than
going fully offline.

## Decision

Implement a **three-tier self-healing architecture**: Passive Monitoring (always on),
Active Diagnosis (triggered on anomaly), and Autonomous Recovery (executed within defined
safe boundaries). This is implemented through the `jarvis-guardian` tooling repository,
the Agent Registry health system, and the error/fix database.

**Tier 1 — Passive Monitoring (Always On)**

The Agent Registry exposes a `/health` aggregation endpoint that polls all registered agents
every 30 seconds. Each agent implements a standardised `healthCheck()` method returning:

```json
{
  "agentId": "knowledge-agent-v2",
  "status": "HEALTHY | DEGRADED | OFFLINE",
  "metrics": {
    "requestsLast5Min": 42,
    "errorRateLast5Min": 0.02,
    "avgResponseTimeMs": 340,
    "queueDepth": 0
  },
  "lastSuccessfulRequest": "2026-03-22T00:00:00Z",
  "degradationReason": null
}
```

A status of `DEGRADED` is reported when the agent's error rate exceeds 5% in a 5-minute
window, or when average response time exceeds 3× the agent's baseline. `OFFLINE` is
reported when the agent fails to respond to the health check within 5 seconds.

In parallel, `jarvis-guardian` runs automated checks on every code change:
- `npm run check:deps` — scans all 40+ services for missing, mismatched, or conflicting
  dependencies using the Service Registry config.
- `npm run check:syntax` — AST-based validation of every JS/JSX/TS/Python file.
- `npm run test:ecosystem` — runs the full test suite with clear error reporting per service.

All failures are logged to the persistent JSON error/fix database (`database/errors.json`),
which stores the error pattern, affected service, severity, timestamp, and any known fix.

**Tier 2 — Active Diagnosis (Triggered on Anomaly)**

When Tier 1 detects an anomaly (agent status `DEGRADED` or `OFFLINE`, or a jarvis-guardian
check failure), the Diagnostic Engine is invoked. Diagnosis follows a structured pipeline:

1. **Error Pattern Matching**: The error signature is compared against the error/fix database
   using keyword scoring. If a known fix exists (sourced from the database or from the
   Hugging Face knowledge base imports — CodeXGLUE, SWE-bench, SWE-smith), the
   matched fix is surfaced immediately.

2. **Dependency Health Check**: `npm run check:deps -- --fix` is run against the affected
   service. Auto-fixable dependency issues (e.g., the `omit=dev` problem documented in the
   guardian system) are applied automatically.

3. **Root Cause Classification**: Errors are classified into categories:
   - `dependency-conflict` — npm peer dependency mismatch
   - `schema-drift` — database schema changed without agent update
   - `llm-misroute` — Supervisor dispatched to wrong agent (detected by provenance audit)
   - `reliability-degradation` — agent outputs failing Reliability Score threshold
   - `infrastructure-failure` — pod crash, OOM, network partition
   - `prompt-drift` — agent prompt misaligned with current tool contracts

4. **Confidence Scoring**: The diagnostic result includes a confidence score. Low-confidence
   diagnoses (< 70%) are escalated to the user for manual review rather than triggering
   automatic recovery.

**Tier 3 — Autonomous Recovery (Safe Boundaries)**

Recovery actions are executed automatically only within a predefined safe boundary. Actions
outside this boundary require user confirmation.

**Autonomous (no confirmation required):**
- Restart a single `OFFLINE` agent (via the Orchestrator's graceful restart protocol: drain
  in-flight jobs, deregister, restart, re-register)
- Apply auto-fixable dependency corrections flagged by `check:deps --fix`
- Roll back a single agent to its previous deployment version if restart fails
- Reroute traffic away from a `DEGRADED` agent to a backup agent (if one is registered with
  matching capability tags)
- Refresh a stale vector store index for the Knowledge Agent

**Requires user confirmation:**
- Restarting more than 2 agents simultaneously (risk of cascade restart)
- Applying schema migrations
- Modifying prompt templates or system instructions
- Any recovery action that would interrupt an active user session
- Any action classified with diagnosis confidence < 70%

All recovery actions — autonomous and confirmed — are written to the error/fix database with
outcome (`RESOLVED | FAILED | ESCALATED`), resolution timestamp, and the applied fix. This
builds the institutional memory that makes future recovery faster.

**Loop: Query Reformulation on Zero Results**

For the specific case where a web search or RAG retrieval returns zero results, Jarvis
implements the iterative research loop:
1. Agent signals `ZERO_RESULTS` to the Supervisor.
2. Supervisor transitions to a `QueryReformulation` node, prompting the LLM: "Your search
   for '{query}' returned no results. Generate 3 alternative queries."
3. Agent retries with each alternative.
4. If all alternatives fail, the Supervisor escalates to the user with a clear explanation
   rather than hallucinating a response.

This directly supports the zero-hallucination requirement: Jarvis never fabricates data to
cover a retrieval failure.

## Alternatives Considered

### Alternative A — Manual Monitoring with PagerDuty Alerts
Set up alerting on key metrics and rely on the developer to respond to incidents. Viable for
a small team managing a non-critical system, but incompatible with the 99% success rate
requirement and the companion use case — the user should not need to wait for human
intervention to fix a crashed agent at 2 AM.
**Rejected** — insufficient availability guarantee.

### Alternative B — Full Kubernetes Operator (Custom Controller)
Build a Kubernetes Operator that watches agent custom resources and manages recovery
through the K8s reconciliation loop. This is the production-grade approach for large-scale
deployments and maps naturally onto the infrastructure described in the Jarvis Scalable
Architecture research (KEDA, KServe). However, it requires significant Kubernetes expertise
to implement and maintain, and is disproportionate overhead for the current single-cluster
deployment.
**Accepted as a Phase 3+ evolution path.** The current design's agent health API and
graceful restart protocol are intentionally compatible with a future Kubernetes Operator
implementation without requiring a rewrite.

### Alternative C — LLM-Driven Self-Repair (No Rules Engine)
Allow a dedicated Self-Healing Agent to analyse failures and propose code-level fixes, then
apply them autonomously. This is conceptually appealing but introduces significant risk: an
LLM autonomously modifying production code is a non-trivial safety problem, and LLM-
generated patches may fix the immediate symptom while introducing new bugs.
**Rejected for autonomous code modification.** The LLM's role is limited to diagnosis and
fix suggestion (surfacing known patterns from the error/fix database). All code-level changes
require human review before application.

## Consequences

**Benefits:**
- ✅ The persistent error/fix database means every failure makes the system smarter. An error
  that took 30 minutes to debug the first time is resolved in seconds on the second occurrence.
- ✅ The three-tier architecture ensures the user is protected from the majority of failures
  without needing to intervene, directly supporting the 99% success rate target.
- ✅ The Hugging Face knowledge base integration (CodeXGLUE, SWE-bench, SWE-smith)
  gives the diagnostic engine a starting corpus of 50,000+ known error/fix patterns from
  day one, without waiting for production failures to accumulate.
- ✅ The Query Reformulation loop eliminates silent failures on zero-result retrievals,
  ensuring the user always receives either a valid answer or a clear explanation — never a
  hallucinated one.
- ✅ The safe boundary definition for autonomous recovery ensures the system never takes
  a recovery action that could make the situation worse, preserving user trust.

**Trade-offs:**
- ⚠️ The 30-second health check polling interval means agent failures may not be detected
  for up to 30 seconds. For time-critical agents, this interval can be reduced per agent in
  the Registry descriptor, at the cost of increased health-check traffic.
- ⚠️ The error/fix database is a flat JSON file (`database/errors.json`). At scale (>10,000
  entries), this will require migration to a structured store. The current schema is designed
  to be forward-compatible with SQLite or PostgreSQL migration.
- ⚠️ The Hugging Face knowledge base imports are weighted toward Python and Java
  (CodeXGLUE, SWE-bench). JavaScript/TypeScript and Node.js-specific error patterns are
  underrepresented. As Jarvis accumulates its own error/fix history, the HF corpus becomes
  less critical — but the gap is a known limitation in the early period.

**Risks accepted:**
- ❌ Autonomous recovery actions (agent restart, dependency fix) could theoretically worsen
  a failure if the root cause diagnosis is incorrect. Mitigation: Tier 3 autonomous actions are
  limited to reversible operations (restart, rollback, reroute). Irreversible operations always
  require user confirmation.
- ❌ The Diagnostic Engine's confidence scoring is itself LLM-assisted, meaning a degraded
  LLM provider could produce incorrect confidence scores. Mitigation: if the primary LLM
  provider is classified `OFFLINE`, the Diagnostic Engine falls back to pure rule-based pattern
  matching without any LLM assistance.

## Related Decisions
- ADR-001: Agent Orchestration Pattern — the Orchestrator's graceful shutdown and restart
  protocol is the execution mechanism for Tier 3 recovery actions.
- ADR-002: Security Layer Design — Layer 1 (input validation) and Layer 3 (tool call
  authorisation) violations are primary inputs to the Diagnostic Engine's error classification.

## Review History
2026-03-22 — Accepted at project architecture review. Autonomous recovery boundary reviewed
and agreed by project owner. Safe boundary definition to be revisited after first 90 days of
production operation.
