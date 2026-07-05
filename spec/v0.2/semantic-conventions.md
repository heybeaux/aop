# AOP v0.2 — Semantic Conventions

Normative field semantics for the Agent Observation Protocol envelope. The JSON
Schema (`agent-observation-event.schema.json`) and protobuf
(`agent_observation_event.proto`) define *shape*; this document defines
*meaning*. Where they disagree, the schema is authoritative for validation and
this document is authoritative for interpretation.

v0.2 = v0.1 + the optional `payload_contract` block. Everything in v0.1 is
carried forward unchanged; the only addition is the payload-contract semantics
below (see "Payload contracts & negotiation semantics").

## Envelope identity (required)

| Field | Meaning |
|---|---|
| `aop_version` | AOP spec version this event targets. `"0.2"` for this revision. |
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

## Payload contracts & negotiation semantics (v0.2)

The v0.1 envelope authenticates *authorship* and *history*; the `payload` is
opaque, so **nothing authenticates meaning**. v0.2 closes that gap with an
optional `payload_contract`: a peer declares the semantic identity of each
payload field as a transmitted, typed term. The *semantics* below are normative
spec; the negotiator that consumes them is an implementation concern, the same
stance AOP takes on chain/signature.

A `payload_contract` carries a `contract_id` (stable hash of the canonicalized
`fields`), an array of `field_contract`s, and optional `stateful` /
`edge_regions` directives (exp-11: statefulness and edge regions are contract
terms because black-box probing cannot recover them). Each `field_contract`
declares `name`, `wire`, `concept`, and `unit`.

Normative matching rules:

- **Match IFF `concept` AND `unit` are equal.** Wire-name equality contributes
  nothing; `name` is advisory and MAY differ between peers (honest renames).
  `concept` and `unit` MUST NOT be inferred from `name`.
- **Same name + different `concept` ⇒ `false_friend`.** This MUST be
  surfaced/named and MUST NOT be silently mapped.
- **Same `concept` + different `unit` ⇒ `unit_mismatch`.** Mappable only through
  an explicit declared conversion.
- **Unmatched fields ⇒ `unmapped`.**
- Implementations SHOULD report negotiation results using this mismatch taxonomy
  (`false_friend` / `unit_mismatch` / `unmapped`) so results are comparable
  across implementations.

Evidence: SwarmLab exp-12 retest of typed contracts drove
`falseFriendMissRate` `0.908 → 0.00` and worst-cell silent corruption
`0.845 → 0.00` (0/960 injected false friends escaped). See
`swarmlab/experiments/12-schema-negotiation/README.md` ("Retest: typed
contracts") and the Sonder reference implementation
(`packages/core/src/contract.ts`, branch `typed-payload-contracts`, PR #10).

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
major/minor schema directory under `spec/`. v0.2 is such an additive step:
it adds the optional `payload_contract` block and freezes `spec/v0.1/**`
unchanged, so a consumer branches on `aop_version` and v0.1 emitters remain
conformant against the v0.1 schema.
