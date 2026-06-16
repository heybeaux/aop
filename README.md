# Agent Observation Protocol (AOP)

**A language-neutral standard for agent *cognitive* observability.**

AOP defines a versioned envelope for what an agent knew, was allowed to do, and
why it decided — memory, reasoning, governance, capability, prediction, intent.
It is vendor-, runtime-, and transport-agnostic. Any runtime can emit a
conformant event without importing a specific implementation.

## Why this exists

When an agent acts, the *why* evaporates. Logs and traces capture what ran —
which function, how long, what error. They do not capture what the agent knew
when it decided, what it was permitted to do, what it reasoned, or what it
predicted would happen. That context lives for one turn inside a model's prompt
and is gone.

AOP makes the *why* a first-class, durable record. It defines a versioned event
that an agent emits at decision points, capturing the cognitive state behind the
action: the recall that informed it, the reasoning that produced it, the policy
that permitted it, the capabilities it had, the outcome it predicted, the intent
it carried. The result is an agent decision you can inspect, govern, and replay
after the fact — instead of a black box you can only re-run and hope.

It is vendor-, runtime-, and transport-agnostic. The schema is the contract; any
runtime in any language can emit a conformant event.

## Spec / impl split

- **AOP (this repo)** — the spec: envelope schema, field semantics, conformance
  tiers, versioning. Plus `@heybeaux/aop`, the TypeScript bindings (types +
  projection helpers + schema validator).
- **[Sonder](https://github.com/heybeaux/sonder)** — the reference
  implementation: an in-process event bus that produces AOP events, with a
  tamper-evident hash chain, signing, and an audit log. None of those runtime
  concerns are normative for AOP.

**Litmus test:** a runtime that has none of Sonder's internals — say a Python
LangGraph shop with its own retriever, its own policy check, its own planner —
can emit a conformant AOP event by mapping its existing concepts onto the
generic faculty fields, without importing a line of Sonder. The schema's
vocabulary is the domain (recall, reasoning, policy decision, tool capability,
forecast, intent), not any one product's subsystems. The `@heybeaux/aop` test
suite proves the TypeScript side — it validates projected events against the
schema with no Sonder dependency.

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
