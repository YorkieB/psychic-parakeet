# Jarvis Documentation Glossary

This glossary captures the repository-specific language used throughout the
Jarvis multi-agent platform and its documentation system.

## ADR

Architecture Decision Record. An append-only document in `docs/ARCHITECTURE/`
that captures why a structural decision was made, what alternatives were
considered, and what consequences follow from that choice.

## Agent Registry

The orchestration component that tracks agent identity, capabilities, health
endpoints, dependencies, and runtime status so requests can be routed safely.

## Checkpointer

A persistence checkpoint or state-capture point used to preserve execution
context, diagnostic evidence, or intermediate workflow state for recovery and
inspection.

## Diagnostic Engine

The self-healing component that converts health events into structured bug
reports, queries the RAG repair pipeline, and proposes a root cause plus a fix
strategy.

## Docs Guardian

The governance role defined in `AGENTS.md` that audits documentation integrity,
detects drift between docs and implementation, and flags missing or stale
documentation updates.

## Domain Entry Point

A curated `index.ts` file that exposes the public, documented API of a domain
such as agents, orchestrator, security, or shared utilities for TypeDoc.

## Drift Detection

The practice of identifying when documentation, tests, configuration, or
architecture records no longer match the current codebase or runtime behavior.

## Dual-LLM Router

The security-layer component that separates privileged reasoning from
untrusted-content handling by summarizing risky inputs before passing them to
the main assistant flow.

## Health Event Handler

The self-healing coordinator that classifies health degradations, stores recent
incident history, and decides when diagnosis or repair should be attempted.

## jarvis-guardian

A shorthand name used for Jarvis governance and enforcement workflows that keep
quality, architecture, and documentation expectations aligned with the code.

## Orchestrator

The runtime coordinator that builds agent requests, checks availability through
the registry, and dispatches work with retries, backoff, and execution
metadata.

## Reliability Score System

The scoring model in the reliability domain that combines source type, evidence
quality, recency, consensus, and independence into a normalized trust label.

## RAG Repair Pipeline

The retrieval-augmented generation pipeline used by self-healing diagnostics to
search prior fixes and code knowledge before proposing repair guidance.

## Self-Healing

The monitoring and recovery subsystem that spawns agents, watches health
signals, emits operational events, and escalates issues into diagnosis and
repair flows.

## Supervisor

The enforcement role that reads governance documents, analyzes change scope,
and determines which specialist or coder agents should act next.

## Thread ID

A correlation identifier used to trace a single conversational, diagnostic, or
workflow execution path across logs, events, and agent boundaries.

## Tool Gate

The security-layer component that enforces rate limits, permission checks, and
user confirmations before high-risk tools are allowed to execute.

## tsoa

The TypeScript-first OpenAPI generator used in Phase 1 to derive representative
REST documentation from decorated controller classes rather than hand-written
spec files.

## Worker-Dispatcher

A general Jarvis pattern in which one component accepts work, normalizes it,
and hands it to the right specialized worker or agent based on capability and
availability.

## WebSocket Events

The real-time operational event stream emitted by self-healing and dashboard
components to report agent spawns, crashes, recoveries, and health changes.
