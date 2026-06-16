# Agent Observation Protocol (AOP)

**A language-neutral standard for agent *cognitive* observability.**

AOP defines a versioned envelope for what an agent knew, was allowed to do, and
why it decided — memory, reasoning, governance, capability, prediction, intent.
It is vendor-, runtime-, and transport-agnostic. Any runtime can emit a
conformant event without importing a specific implementation.

## Why this exists

OpenTelemetry instruments *execution* (spans, metrics, logs). Its GenAI SIG
**explicitly defers** the cognitive fields — what memory was active, what the
agent was permitted to do, what reasoning path was taken — to the application
layer. AOP **is** that deferred layer, standardized, and stays complementary to
OTel (an AOP event can carry the OTel trace/span IDs of its execution sibling).

| OpenTelemetry | Agent Observation Protocol |
|---|---|
| Spec + semantic conventions | AOP envelope schema + cognitive semantic conventions |
| SDKs / Collector (reference impl) | Sonder (reference impl) |
| Instruments execution | Instruments cognition |
| GenAI SIG defers cognitive fields | AOP standardizes them |

## Spec / impl split

- **AOP (this repo)** — the spec: envelope schema, field semantics, conformance
  tiers, versioning. Plus `@heybeaux/aop`, the TypeScript bindings (types +
  projection helpers + schema validator).
- **[Sonder](https://github.com/heybeaux/sonder)** — the reference
  implementation: an in-process event bus that produces AOP events from six
  faculties, with a tamper-evident hash chain, signing, and an audit log. None
  of those runtime concerns are normative for AOP.

**Litmus test:** a Python LangGraph shop can emit a conformant AOP event without
importing a line of Sonder. The `@heybeaux/aop` test suite proves the
TypeScript side of this — it validates projected events against the schema with
no Sonder dependency.

## Layout

```
spec/v0.1/
  agent-observation-event.schema.json   # normative JSON Schema
  agent_observation_event.proto         # protobuf wire schema
  semantic-conventions.md               # field semantics & conformance tiers
packages/
  aop-ts/                               # @heybeaux/aop — types, projection, validator
docs/
  rationale.md                          # the repositioning one-pager
```

## Conformance tiers

A producer need not emit all six faculties. Tiers provide an on-ramp:

- **minimal** — identity fields only (`id`, `agent_id`, `task_id`, `timestamp`).
- **governance** — identity + `governance` (policy/gate decisions + evidence).
- **full** — all six cognitive blocks.

## Status

v0.1, quiet-moat posture: AOP is the public-facing standard; Sonder is the
reference runtime underneath. The spec is stable enough to dogfood across the
faculties (Lattice governance, Parliament reasoning, Engram memory, …) and
loud evangelism is deliberately deferred.
