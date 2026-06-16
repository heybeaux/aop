# AOP v0.1 — Semantic Conventions

Normative field semantics for the Agent Observation Protocol envelope. The JSON
Schema (`agent-observation-event.schema.json`) and protobuf
(`agent_observation_event.proto`) define *shape*; this document defines
*meaning*. Where they disagree, the schema is authoritative for validation and
this document is authoritative for interpretation.

## Envelope identity (required)

| Field | Meaning |
|---|---|
| `aop_version` | AOP spec version this event targets. `"0.1"` for this revision. |
| `id` | Globally unique event id. ULID recommended; any unique string permitted. |
| `agent_id` | Stable identifier of the emitting agent. |
| `task_id` | Identifier of the unit of work this observation belongs to. |
| `timestamp` | ISO 8601 UTC instant the observation was produced. |
| `parent_id` | Optional id of the causally preceding event (call tree / step chain). |
| `trace_context` | Optional `{ trace_id, span_id }` linking this cognitive event to an execution-layer span, if the runtime produces one. Pure correlation; not required for conformance. |

## Cognitive blocks (all optional)

Each block is independently optional; presence signals the producer instrumented
that faculty. Absence means "not observed", never "false".

- **`capabilities`** — what the agent had mounted and how it was resolved
  (`mounted`, `resolution` at LOD levels, `budget_used`/`budget_limit`).
- **`memory`** — what recall informed the step (`refs`, optional `query`,
  `confidence`, optional `dream_cycle`).
- **`reasoning`** — how a decision was reached (`model`, `neurotypes`,
  `consensus`, `dissent`, `osi`, `rounds`).
- **`governance`** — what policy permitted/blocked the action. Carries
  `contract_id`, the `l1_pass`/`l2_pass`/`l3_pass` gate results, `violations`,
  `circuit_state`, and — when a tiered policy engine ran — `tier` (a `+`-joined
  list e.g. `"L0+L1"`), per-rule `evidence`, and an optional `approval_gate`.
- **`prediction`** — the agent's forecast of its own outcome (`outcome`,
  `confidence`, Beta `alpha`/`beta`, `model_id`).
- **`intent`** — what the agent meant to do (`action`, `step_trace_id`,
  `skipped`/`skip_reason`, `constraint_injected`).

## Post-execution

- **`outcome`** — written back after a gated action runs (`exit_code`,
  `isError`, optional `error`). Absent on pre-execution decision events.
- **`resources`** / **`paths`** — what the action touched.

## Conformance tiers

| Tier | Required blocks |
|---|---|
| `minimal` | identity only |
| `governance` | identity + `governance` |
| `full` | identity + all six cognitive blocks |

A consumer MUST accept any event at or above the tier it expects, and MUST
ignore blocks it does not understand (`additionalProperties` is open).

## Implementation provenance is NOT normative

Reference implementations may carry extra fields (version markers, hash chains,
signatures). These MUST NOT appear at the AOP top level. Producers SHOULD demote
them under `metadata.<impl>` (e.g. `metadata.sonder`) so the envelope stays
spec-clean while provenance remains recoverable.

## Versioning

`aop_version` is required. Additive changes (new optional blocks/fields) are
minor-version compatible. Removing or re-typing a field requires a new
major/minor schema directory under `spec/`.
