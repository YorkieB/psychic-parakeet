# ADR-002: Security Layer Design

## Status

Accepted

## Date

2026-03-22

## Context

Jarvis handles user prompts, external content, tool execution, and generated
output. That means the system faces several classes of risk at once:

- malicious or obfuscated input,
- prompt-injection attempts arriving through external documents or URLs,
- inadvertent leakage of secrets or sensitive data in model output, and
- misuse of high-impact tools such as file mutation, code execution, or payment
  flows.

The repository already implements a layered security design in
`src/security/security-agent.ts` and the `src/security/layer1` through
`src/security/layer5` folders. Those layers are not incidental helper classes;
they represent a deliberate defense-in-depth strategy that should guide future
security work and documentation.

The main architectural tension is that Jarvis must remain useful and interactive
without allowing security logic to collapse into one giant filter or one
over-privileged LLM call. The code shows a strong preference for distributing
responsibility across input screening, content quarantine, output sanitization,
tool access control, and anomaly monitoring. This ADR records that split as the
canonical model.

## Decision

Jarvis adopts a **five-layer security pipeline** coordinated by the
`SecurityAgent`.

1. **Layer 1 - Input Firewall**
   Blocks obvious prompt-injection patterns, runs PII detection, and can call
   Lakera Guard for deeper screening when enabled.
2. **Layer 2 - Dual-LLM Router**
   Separates privileged reasoning from untrusted content by summarizing risky
   material before it reaches the main assistant path.
3. **Layer 3 - Output Sanitizer**
   Redacts emails, phone numbers, keys, and system-prompt leakage before
   responses are returned.
4. **Layer 4 - Tool Gate**
   Enforces permissions, rate limits, and explicit confirmation requirements for
   high-risk tools.
5. **Layer 5 - Security Monitor**
   Tracks events over time, detects abusive patterns, throttles or blocks users,
   and raises higher-severity alerts when behavior crosses thresholds.

This decision means security behavior should be added to the layer where it
belongs instead of being implemented ad hoc inside individual agents. A new
input risk belongs in the firewall, not in every downstream controller. A new
high-risk capability belongs in the Tool Gate, not in random UI checks. A new
pattern of suspicious behavior belongs in the Security Monitor, not in a
single-use endpoint.

The design also formalizes the **fail-open vs fail-closed** stance:

- Input threats that are positively detected are blocked.
- Auxiliary controls such as Lakera can fail open when unavailable so the system
  remains operable.
- High-risk tool access remains blocked when authorization or confirmation is
  missing.

## Alternatives Considered

### Single security filter in front of the LLM

This was rejected because one filter cannot safely own screening, quarantine,
output redaction, tool policy, and behavioral monitoring without becoming opaque
and brittle.

### Security logic embedded in each agent

This would distribute checks across Dialogue, Web, Knowledge, and every future
agent. It was rejected because consistency would erode quickly and auditability
would suffer.

### Tool-gating only

A tool-centric design reduces some operational risk, but it does not address
prompt injection, secret leakage, or long-running abuse patterns. It was deemed
insufficient as a primary security posture.

## Consequences

### Positive

- Security responsibilities are explicit and teachable.
- Each layer can evolve independently as threats change.
- The system can log and explain security decisions with better granularity.

### Negative

- More layers introduce more configuration surface and operational tuning.
- Some requests pay extra latency for screening and sanitization.
- Threat rules must be maintained so they do not over-block legitimate usage.

### Follow-up

- Document which agent routes should call into the security pipeline before
  broader API coverage is added.
- Review logging and redaction behavior regularly to avoid leaking sensitive
  details through observability tooling.

## Related Decisions

- ADR-001: Agent Orchestration Pattern
- ADR-003: Self-Healing Diagnostic Approach
- `docs/DOCUMENTATION-STRATEGY.md`
