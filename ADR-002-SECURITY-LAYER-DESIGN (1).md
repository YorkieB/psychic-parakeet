# ADR-002: Security Layer Design

## Status
Accepted

## Date Created
2026-03-22

## Date Superseded
N/A

## Context

Jarvis V4 operates with an unusually broad threat surface for a personal AI assistant. It holds
the user's financial details, personal history, credentials, and private documents. It executes
arbitrary SQL against the user's databases, runs code in sandboxed environments, makes
outbound web requests, and manages multi-agent workflows that cross subsystem boundaries.
Any single failure point — an injected prompt, an over-privileged database connection, an
unvalidated tool call — could result in data exfiltration, data corruption, or execution of
unintended actions on the user's behalf.

Standard application security (authentication + HTTPS) is necessary but not sufficient for an
agentic AI system. The unique risks introduced by LLM-driven orchestration include:

**Prompt injection**: A malicious web page, document, or database entry crafted to instruct
Jarvis to ignore its system prompt and exfiltrate data or take harmful actions. This is distinct
from traditional injection attacks because the payload is natural language, not code.

**Tool call abuse**: The LLM Supervisor can issue arbitrary tool calls. Without enforcement, a
sufficiently adversarial prompt could cause Jarvis to call `sql_db_query` with a `DROP TABLE`
statement, or call `web_search` to leak private data to an attacker-controlled URL.

**Reliability contamination**: The knowledge base must only contain high-reliability sources
(scored ≥ 4.0 on the Reliability Score System). If unvalidated sources are ingested, Jarvis will
hallucinate confident-sounding falsehoods derived from low-quality inputs.

**Agent privilege escalation**: In a multi-agent system, a compromised or misbehaving agent
could attempt to register itself with elevated privileges in the Agent Registry, or forge
provenance metadata on its outputs.

**Session boundary violations**: If session isolation fails, one user session could read or
modify the LangGraph checkpoint state of another session.

The design must achieve a 99% task success rate (as specified in the Jarvis V4 requirements)
without compromising security, meaning security controls must not produce false positives
that block legitimate requests.

## Decision

Implement a **five-layer defence-in-depth security architecture**. Every agent input and output
passes through all five layers in sequence. No layer can be bypassed. Violations at any layer
halt the pipeline and trigger the appropriate recovery path.

**Layer 1 — Input Validation & Sanitisation**
All inputs entering Jarvis — user messages, tool outputs, database query results, web search
results, and document ingestion payloads — are sanitised before being passed to the LLM or
any agent. Sanitisation includes:
- Length enforcement (max token budget per input type)
- Character encoding normalisation (prevent Unicode smuggling attacks)
- Prompt injection pattern detection: a lightweight classifier scans inputs for known injection
  signatures (e.g., "ignore previous instructions", "system:", role-switch markers). Flagged
  inputs are quarantined and the user is notified.
- For web search results: the Tavily API already strips HTML, ads, and scripts. The additional
  layer strips any `<script>`, `<iframe>`, or `data:` URI patterns from raw content before
  injecting into the LLM context.

**Layer 2 — Reliability Score Enforcement**
Before any information is written to the knowledge base or used in a critical decision, it is
evaluated by the Reliability Score System. Scores are computed as a weighted average across
six criteria: Source Type (25%), Evidence Quality (20%), Consensus (15%), Author Credentials
(15%), Independence (15%), and Recency (10%). The AI Assessment Engine uses Claude
Sonnet as primary assessor and GPT-4o in consensus mode for ambiguous cases.

Thresholds enforced:
- Score < 1.0: Excluded entirely from knowledge base and context.
- Score 1.0–2.5: Flagged LOW_RELIABILITY; may only be used for non-critical tasks and must
  be disclosed to the user.
- Score 2.5–4.0: MODERATE; usable for general tasks, not for financial or medical advice.
- Score ≥ 4.0: HIGH; approved for all task types including critical decisions.

**Layer 3 — Tool Call Authorisation**
Before the Orchestrator dispatches any tool call issued by the Supervisor, it validates the
call against a static authorisation matrix. The matrix defines, per agent role, which tools are
permitted, which argument patterns are allowed, and which are explicitly denied.

Key rules:
- `sql_db_query` — all connections are **read-only** by default. Write access requires an
  explicit `WRITE_AUTHORISED` flag set by the user in the session config, plus a
  confirmation step for any mutating SQL.
- `web_request` (outbound HTTP) — blocked for all internal IP ranges (RFC 1918) to prevent
  SSRF attacks. Outbound requests must match a domain allowlist unless the user has
  explicitly enabled unrestricted web access.
- `file_write` — restricted to the user's designated workspace directory. Path traversal
  attempts (`../`) are rejected at the validation layer.
- `agent_register` — only the `OrchestratorService` may call this. Direct calls from any agent
  are rejected.

**Layer 4 — Output Verification & Provenance**
Every agent output is wrapped in a `VerifiedOutput` envelope before being returned to the
Supervisor:

```json
{
  "data": { ... },
  "provenance": {
    "agentId": "knowledge-agent-v2",
    "toolsCalled": ["rag_retrieve", "reranker"],
    "sourcesUsed": [{ "url": "...", "reliabilityScore": 4.7 }],
    "executionTimeMs": 340,
    "reliabilityBand": "HIGH"
  },
  "meta": {
    "version": "1.0",
    "timestamp": "2026-03-22T00:00:00Z",
    "sessionId": "sess_abc123",
    "threadId": "thread_xyz789"
  },
  "error": null
}
```

The Supervisor is instructed (via its system prompt) to always surface the `reliabilityBand`
to the user for factual claims. Outputs with `reliabilityBand: LOW_RELIABILITY` are presented
with an explicit caveat.

**Layer 5 — Session Isolation**
Each user session is assigned a unique `threadId` (UUID v4). All LangGraph checkpoint reads
and writes are scoped to this `threadId`. The PostgreSQL checkpoints table enforces row-level
security (RLS) ensuring that a query for `thread_id = X` can never return rows for `thread_id = Y`.
Redis session keys are prefixed with `session:{threadId}:` and TTL-expired after session
inactivity. No agent is permitted to hold a reference to another session's `threadId`.

## Alternatives Considered

### Alternative A — Single Validation Layer (Input Only)
Validate inputs at the edge and trust all downstream data. Simpler to implement, but
fundamentally inadequate because tool outputs (web search, SQL results) re-enter the LLM
context and are equally capable of carrying prompt injection payloads. The SQL self-correction
loop is particularly vulnerable: a database that returns a crafted error message could
manipulate the agent into issuing a harmful correction query.
**Rejected** — insufficient for an agentic system where data flows bidirectionally between the
LLM and external tools.

### Alternative B — Sandboxed LLM Execution (Air-Gapped Agent)
Run the LLM in a fully sandboxed environment with no network access. All tool calls are
mediated by a separate trusted process. This is the most secure option but eliminates the
value of Jarvis's web-connected, tool-calling capability.
**Rejected** — incompatible with the core Jarvis requirement for autonomous internet access
and tool use.

### Alternative C — OAuth + Scoped Tokens Only
Rely entirely on standard OAuth2 scopes and API tokens to limit what tools can do. This
handles authorisation at the API credential level but provides no defence against prompt
injection, reliability contamination, or agent privilege escalation — all of which occur inside
the trust boundary.
**Rejected** — OAuth is necessary but not sufficient; must be combined with the other layers.

## Consequences

**Benefits:**
- ✅ Prompt injection is detected and quarantined before it reaches the LLM, protecting
  against the most common class of agentic AI attacks.
- ✅ Read-only SQL enforcement prevents accidental or malicious data destruction, a critical
  protection given Jarvis's access to the user's personal financial data.
- ✅ The Reliability Score System ensures that factual outputs are grounded in verified
  sources, directly supporting the 99% reliability requirement and the anti-hallucination goal.
- ✅ Provenance envelopes make every output auditable, enabling the user to trace any
  Jarvis response back to its source and reliability score.
- ✅ Session isolation via PostgreSQL RLS and Redis key prefixing prevents cross-session
  data leakage as the system scales.

**Trade-offs:**
- ⚠️ The five-layer pipeline adds latency. Benchmarks show approximately 15–40ms of
  overhead per request across all layers. This is acceptable given that LLM inference
  typically takes 500ms–5,000ms.
- ⚠️ The prompt injection classifier will produce false positives on legitimate security-related
  queries (e.g., "What does the phrase 'ignore previous instructions' mean in AI safety?").
  The classifier must be tunable; start with a permissive threshold and tighten based on
  observed false positive rate.
- ⚠️ The domain allowlist for outbound web requests requires maintenance as new legitimate
  domains are needed. A process for requesting allowlist additions must be documented in
  `docs/GOVERNANCE-PROCESSES.md`.

**Risks accepted:**
- ❌ Sophisticated adversarial prompts may evade the injection classifier. The classifier is a
  probabilistic defence, not a guarantee. Mitigation: the tool call authorisation matrix (Layer 3)
  provides a hard enforcement layer that does not depend on LLM-based detection.
- ❌ The Reliability Score System's AI assessor (Claude/GPT-4o) could itself be manipulated
  into assigning inflated scores to adversarial content. Mitigation: the rules engine enforces
  hard upper bounds on scores that the AI assessor cannot exceed without human review.

## Related Decisions
- ADR-001: Agent Orchestration Pattern — the Orchestrator is the enforcement point for Layers
  3 and 4; this ADR defines what it must enforce.
- ADR-003: Self-Healing & Diagnostic Approach — Layer 1 violations and Layer 3 rejections
  feed into the error/fix database and trigger self-healing diagnostics.

## Review History
2026-03-22 — Accepted at project architecture review. Layer 2 thresholds subject to tuning
after first 30 days of production operation.
