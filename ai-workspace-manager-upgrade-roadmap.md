# AI Workspace Manager Upgrade Roadmap

## Delivery model

The upgrade will be delivered as **20 reviewable versions**, one version at a time. Each version will add a bounded capability, preserve the existing seller workflow, and include browser verification before the next version is started. External posting, account actions, payments, deletion, and other consequential actions remain user-controlled unless a later version receives explicit approval and has an appropriate safety gate.

The supplied archive is being used as an architectural reference rather than copied wholesale. The relevant patterns are deterministic constraint checks, staged agent orchestration, explicit planning and memory boundaries, auditable event histories, model/tool routing, retries with escalation, and runtime health monitoring. Unreviewed third-party code and downloaded model runtimes are not executed in the seller page.

## Twenty-stage plan

| Version | Capability | Review outcome |
|---|---|---|
| **1** | **Safe self-diagnosis core**: health checks, mission-state analysis, staged task hierarchy, guardrails, auditable events, and a visible upgrade checklist | Confirm the workspace can explain its current state without taking unsafe actions |
| 2 | Goal graph: mission → operations → programs → projects → objectives → tasks with dependency links | Approve the hierarchy and dependency model |
| 3 | Persistent workspace memory with typed facts, decisions, assumptions, and provenance | Approve what may be remembered and for how long |
| 4 | Planner and plan-diff view with explicit preconditions, expected outcomes, and rollback notes | Approve plan transparency |
| 5 | Multi-role orchestration: planner, researcher, executor, verifier, and safety reviewer | Approve role boundaries |
| 6 | Tool registry and capability discovery with permission scopes and dry-run mode | Approve which tools may be invoked |
| 7 | Safe retry and recovery policies with backoff, alternative strategies, and escalation | Approve retry limits and escalation rules |
| 8 | Structured task execution records with inputs, outputs, evidence, and completion proofs | Approve proof requirements |
| 9 | Content and publication workbench with review queues and version comparison | Approve content workflow |
| 10 | Advertisement campaign optimizer using existing schedules, listings, and platform results | Approve optimization signals |
| 11 | Research workspace with source capture, citations, confidence, and contradiction flags | Approve research evidence rules |
| 12 | Model routing layer with cost, latency, capability, and fallback policies | Approve model-selection policy before connecting an AI provider |
| 13 | Human approval gates for login, CAPTCHA, publication, financial, legal, or destructive actions | Approve consequential-action boundaries |
| 14 | Simulation and sandbox mode for end-to-end mission rehearsals | Approve simulation fidelity |
| 15 | Metrics, scorecards, leading indicators, and mission-progress attribution | Approve success metrics |
| 16 | Event-driven automation hooks and durable background execution | Approve triggers, hosting, and operating limits |
| 17 | Secure secrets, connector permissions, audit export, and retention controls | Approve security and retention settings |
| 18 | Continuous evaluation: regression tests, adversarial prompts, failure-injection tests, and quality gates | Approve release gates |
| 19 | Cross-project program portfolio management and resource conflict resolution | Approve portfolio policies |
| 20 | Mission-completing control room: governed autonomous cycles with user approvals, evidence, rollback, and final mission review | Approve production readiness |

## Version 1 acceptance criteria

Version 1 is complete when the Workspace Manager can run a deterministic self-diagnosis, identify the first unresolved stage, display safe next actions, record an auditable event, show the 20-stage roadmap, and keep execution in a dry-run or user-controlled state. It must not claim that an objective succeeded without evidence.

## Version 2 acceptance criteria

Version 2 is complete when the Workspace Manager displays a mission-to-task goal graph with explicit dependency links, derives node status from current workspace evidence, propagates blocked and active states upward without inventing completion, and records graph refreshes in the audit history. The graph remains read-only in this version; it does not execute external actions or mutate mission goals automatically.

## Version 3 acceptance criteria

Version 3 is complete when the Workspace Manager can persist typed **facts**, **decisions**, and **assumptions** with explicit provenance, confidence, timestamps, search, and user-controlled deletion. Memory records remain local to the browser in this version, are not treated as verified evidence automatically, and every memory mutation is recorded in the audit history.

## Version 4 acceptance criteria

Version 4 is complete when the Workspace Manager can generate a review-only plan from current evidence, display explicit preconditions, expected outcomes, evidence requirements, and rollback notes for each step, compare a draft with the last saved plan, and save a plan without executing it. Plan generation and saving must be auditable, and no plan step may submit an external action automatically.

## Version 5 acceptance criteria

Version 5 is complete when the Workspace Manager runs bounded, sequential role reviews for planner, researcher, executor, verifier, and safety reviewer; displays each handoff and result; persists a trace; and keeps the executor explicitly gated. Role output must be based on local workspace evidence, and the run must end at user-controlled review without external submission.

## Version 6 acceptance criteria

Version 6 is complete when the Workspace Manager exposes a capability registry with discoverable tools, explicit permission scopes, approval states, and dry-run behavior. Local read, planning, memory, and handoff-draft tools may be dry-run tested; external publication and account-access tools must remain blocked and cannot be enabled from the registry. Tool runs and blocked attempts are auditable.

## Version 7 acceptance criteria

Version 7 is complete when unresolved work uses bounded retry policies with explicit alternatives, exponential-style backoff, a maximum attempt count, and mailbox escalation. Successful work clears its retry state; escalated work stops retrying and remains user-visible. Retry behavior must remain client-only and auditable.

## Version 8 acceptance criteria

Version 8 is complete when the Workspace Manager records structured execution evidence with task inputs, observed outputs, evidence references, completion proofs, status, timestamps, and an explicit no-external-action boundary. A record cannot claim completion without output, evidence, and proof; records persist locally and every mutation is auditable.

## Version 9 acceptance criteria

Version 9 is complete when the Workspace Manager provides a local content workbench for advertisement and publication drafts with required title, destination, and body fields; tone, CTA, and keyword metadata; revision numbering; review status; persistent history; and audit events. Drafting and review must never publish externally.

## Version 10 acceptance criteria

Version 10 is complete when the Workspace Manager scores local advertisement drafts against a transparent completeness checklist, identifies missing title, destination, body, tone, CTA, keyword, or review evidence, stores assessments, and presents review-only recommendations. Optimization must not mutate drafts or publish externally.

## Version 11 acceptance criteria

Version 11 is complete when the Workspace Manager provides a local research workspace that captures claims with source titles, optional URLs, excerpts or observation notes, citation identifiers, confidence levels, freshness labels, and user-set contradiction flags. Evidence must render as citation-ready records, preserve a review status, support marking contradiction reviews complete, persist in local storage, and create auditable capture/review events. The workspace must not fetch sources, infer verification, call external research services, or publish claims automatically; all evidence remains subject to human review.

## ZIP references used for Version 1

The archive suggests several useful patterns: AutoGPT and Ouroboros for bounded iterative loops; CrewAI and MultiMind for separated roles and model routing; OpenClaw, CentaurLoop, and StreamCore for runtime and event-oriented structure; and the hard-logic kernel project for deterministic constraints and an append-only audit concept. These references inform the design only. No archive executable is trusted or run as part of Version 1.
