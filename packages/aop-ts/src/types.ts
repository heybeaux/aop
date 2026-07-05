/**
 * AOP v0.1 — language-neutral cognitive observation types.
 *
 * These are the spec's TypeScript bindings. They mirror
 * `spec/v0.1/agent-observation-event.schema.json` and carry NO runtime
 * concerns: no bus, no hash chain, no signing, no storage. Any runtime can
 * import these to emit a conformant event without depending on a reference
 * implementation (e.g. Sonder).
 *
 * The six cognitive blocks (capability/memory/reasoning/governance/
 * prediction/intent) are AOP-layer concepts. Sonder previously owned these
 * types in its core `event.ts`; AOP is now their canonical home and Sonder
 * re-imports them.
 */

export type LODLevel = 'index' | 'summary' | 'standard' | 'deep';

export interface CapabilityContext {
  mounted: string[];
  resolution: Record<string, LODLevel>;
  budget_used: number;
  budget_limit: number;
}

export interface MemoryContext {
  refs: string[];
  query?: string;
  confidence: number;
  dream_cycle?: string;
}

export interface ReasoningContext {
  model: string;
  neurotypes: string[];
  consensus: boolean;
  dissent: string[];
  osi: number;
  rounds: number;
}

/** Per-rule evidence emitted by a governance/policy engine (e.g. Lattice L0). */
export interface PolicyEvidenceRow {
  rule_id: string;
  rule_kind: string;
  path?: string;
  outcome: 'pass' | 'deny' | 'mask';
  matched?: string;
  message?: string;
}

/** Pre-emit approval gate — records that an action paused for supervision. */
export interface ApprovalGate {
  state: 'pending' | 'allowed' | 'denied';
  gate_id: string;
  reason?: string;
  default_action: 'deny' | 'allow';
  /** Wall-clock deadline (ISO 8601). After this, default_action applies. */
  expires_at?: string;
}

export interface GovernanceContext {
  contract_id: string;
  validated: boolean;
  l1_pass: boolean;
  l2_pass: boolean;
  l3_pass: boolean;
  violations: string[];
  circuit_state: 'closed' | 'open' | 'half-open';
  /** `+`-joined list of tiers that produced evidence, e.g. 'L0+L1'. */
  tier?: string;
  /** Per-rule policy evidence. Required when `tier` references L1/L2/L3. */
  evidence?: PolicyEvidenceRow[];
  /** Pre-emit approval gate. When present and pending, the action paused. */
  approval_gate?: ApprovalGate;
}

export interface PredictionContext {
  outcome: string;
  confidence: number;
  alpha: number;
  beta: number;
  model_id: string;
}

export interface IntentContext {
  action: string;
  step_trace_id: string;
  skipped: boolean;
  skip_reason?: string;
  constraint_injected: boolean;
}

/** Structured post-execution outcome, written back after a gated action runs. */
export interface OutcomeContext {
  /** Process/tool exit code. 0 = clean; non-zero = error. */
  exit_code?: number;
  /** True when the tool reported an error result regardless of exit code. */
  isError: boolean;
  /** Structured error message when the action failed. */
  error?: string;
}

/** Optional link from a cognitive event to its execution-layer span, if any. */
export interface AopTraceContext {
  trace_id?: string;
  span_id?: string;
}

/**
 * Semantic identity of a single payload field (AOP v0.2). Mirrors the
 * `field_contract` $def in agent-observation-event.schema.json and Sonder's
 * shipped `FieldContract` (packages/core/src/types/contract.ts). The `concept`
 * and `unit` are declared by the field owner and transmitted to the peer — never
 * inferred from the wire `name`. Two fields match IFF concept AND unit are equal.
 */
export interface FieldContract {
  /** Wire name — advisory only; allowed to differ between peers (honest renames). */
  name: string;
  /** Physical wire type. */
  wire: 'string' | 'int' | 'float' | 'bool' | 'enum';
  /** Semantic concept ID (e.g. 'order.total.posttax'). Never inferred from name. */
  concept: string;
  /** Unit as part of the type: 'cents_pretax' | 'epoch_ms' | 'epoch_s' | 'none' | ... */
  unit: string;
}

/**
 * A complete payload contract (AOP v0.2). Mirrors the `payload_contract` $def
 * and Sonder's shipped `PayloadContract`. `stateful` / `edge_regions` are exp-11
 * contract terms (probing cannot recover them), hence carried in the contract.
 */
export interface PayloadContract {
  /** Stable hash of the canonicalized fields. Deterministic, order-independent. */
  contract_id: string;
  fields: FieldContract[];
  /** exp-11: whether the producing surface is stateful (probing self-poisons on it). */
  stateful?: boolean;
  /** exp-11: human-readable enumeration of cliffs/promos/thresholds probing can't find. */
  edge_regions?: string[];
}

/** AOP spec version this binding targets. */
export const AOP_VERSION = '0.1' as const;

/** AOP v0.2 spec version — v0.1 + the optional payload_contract block. */
export const AOP_VERSION_V02 = '0.2' as const;

/**
 * AOP v0.1 envelope. Mirrors agent-observation-event.schema.json. Only the
 * five identity fields are guaranteed present; cognitive blocks are optional
 * so producers can emit at any conformance tier (minimal → full).
 * `additionalProperties` is open in the schema.
 */
export interface AopEvent {
  aop_version: typeof AOP_VERSION;
  id: string;
  agent_id: string;
  task_id: string;
  parent_id?: string;
  timestamp: string;
  trace_context?: AopTraceContext;

  capabilities?: CapabilityContext;
  memory?: MemoryContext;
  reasoning?: ReasoningContext;
  governance?: GovernanceContext;
  prediction?: PredictionContext;
  intent?: IntentContext;

  outcome?: OutcomeContext;
  resources?: string[];
  paths?: string[];

  payload?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * AOP v0.2 envelope. Identical to {@link AopEvent} except `aop_version` is
 * `'0.2'` and the optional `payload_contract` block may be present. Mirrors
 * agent-observation-event.schema.json under spec/v0.2/.
 */
export interface AopEventV02 extends Omit<AopEvent, 'aop_version'> {
  aop_version: typeof AOP_VERSION_V02;
  payload_contract?: PayloadContract;
}

/**
 * Minimal source shape a producer must provide to project an AOP event.
 * Any object carrying these fields (plus optional cognitive blocks) can be
 * lifted via `toAopEvent` — it does not have to be a Sonder event.
 */
export interface AopSource {
  id: string;
  agent_id: string;
  task_id: string;
  parent_id?: string;
  timestamp: string;
  capabilities?: CapabilityContext;
  memory?: MemoryContext;
  reasoning?: ReasoningContext;
  governance?: GovernanceContext;
  prediction?: PredictionContext;
  intent?: IntentContext;
  outcome?: OutcomeContext;
  resources?: string[];
  paths?: string[];
  payload?: unknown;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}
