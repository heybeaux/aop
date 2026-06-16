/**
 * AOP v0.1 projection helpers.
 *
 * `toAopEvent` lifts any AopSource (an object carrying the identity fields and
 * zero or more cognitive blocks) into a conformant AOP v0.1 envelope. It is a
 * pure, total transform — never throws, never mutates input — which is exactly
 * why a non-Sonder runtime can produce the same shape without importing a
 * reference implementation.
 *
 * Reference implementations (e.g. Sonder) carry extra provenance —
 * version markers, hash chains, signatures. Those are NOT part of AOP. Pass
 * their keys via `options.demoteKeys` and they are moved under
 * `metadata[demoteNamespace]` so the AOP top level stays spec-clean while the
 * impl-specific provenance remains recoverable.
 */

import {
  AOP_VERSION,
  type AopEvent,
  type AopSource,
  type AopTraceContext,
  type GovernanceContext,
} from './types.js';

export interface ToAopOptions {
  /** OTel trace/span IDs to attach. The producer's execution-layer tracer
   *  supplies these; AOP does not own them. */
  trace_context?: AopTraceContext;
  /** Top-level keys to demote into metadata (reference-impl provenance such
   *  as version/chain/signature). Defaults to none. */
  demoteKeys?: readonly string[];
  /** metadata sub-key the demoted provenance is nested under. Default 'impl'. */
  demoteNamespace?: string;
}

const SPEC_FIELDS = new Set([
  'id',
  'agent_id',
  'task_id',
  'parent_id',
  'timestamp',
  'capabilities',
  'memory',
  'reasoning',
  'governance',
  'prediction',
  'intent',
  'outcome',
  'resources',
  'paths',
  'payload',
  'metadata',
]);

/** Project any AopSource into an AOP v0.1 envelope. Pure and total. */
export function toAopEvent(source: AopSource, options: ToAopOptions = {}): AopEvent {
  const demoteKeys = options.demoteKeys ?? [];
  const demoteNamespace = options.demoteNamespace ?? 'impl';
  const src = source as Record<string, unknown>;

  const provenance: Record<string, unknown> = {};
  for (const key of demoteKeys) {
    if (key in src && src[key] !== undefined) provenance[key] = src[key];
  }

  const baseMetadata = source.metadata;
  const mergedMetadata: Record<string, unknown> | undefined =
    baseMetadata !== undefined || Object.keys(provenance).length > 0
      ? {
          ...(baseMetadata ?? {}),
          ...(Object.keys(provenance).length > 0 ? { [demoteNamespace]: provenance } : {}),
        }
      : undefined;

  const aop: AopEvent = {
    aop_version: AOP_VERSION,
    id: source.id,
    agent_id: source.agent_id,
    task_id: source.task_id,
    timestamp: source.timestamp,
  };

  if (source.parent_id !== undefined) aop.parent_id = source.parent_id;
  if (options.trace_context !== undefined) aop.trace_context = options.trace_context;

  if (source.capabilities !== undefined) aop.capabilities = source.capabilities;
  if (source.memory !== undefined) aop.memory = source.memory;
  if (source.reasoning !== undefined) aop.reasoning = source.reasoning;
  if (source.governance !== undefined) aop.governance = source.governance;
  if (source.prediction !== undefined) aop.prediction = source.prediction;
  if (source.intent !== undefined) aop.intent = source.intent;

  if (source.outcome !== undefined) aop.outcome = source.outcome;
  if (source.resources !== undefined) aop.resources = source.resources;
  if (source.paths !== undefined) aop.paths = source.paths;

  if (source.payload !== undefined) aop.payload = source.payload;
  if (mergedMetadata !== undefined) aop.metadata = mergedMetadata;

  // Pass through any non-standard producer fields (schema is
  // additionalProperties: true), minus the keys already demoted.
  const aopRecord = aop as unknown as Record<string, unknown>;
  const demoted = new Set(demoteKeys);
  for (const [k, v] of Object.entries(src)) {
    if (SPEC_FIELDS.has(k) || demoted.has(k) || v === undefined) continue;
    aopRecord[k] = v;
  }

  return aop;
}

/**
 * Governance conformance tier: identity + governance only. The minimal read
 * for a consumer that cares only about policy/gate decisions (the Lattice
 * gate-registry credibility path).
 */
export type AopGovernanceObservation = Pick<
  AopEvent,
  'aop_version' | 'id' | 'agent_id' | 'task_id' | 'timestamp'
> &
  Partial<Pick<AopEvent, 'parent_id' | 'trace_context' | 'governance'>>;

export function projectGovernanceObservation(
  source: AopSource,
  options: ToAopOptions = {},
): AopGovernanceObservation {
  const full = toAopEvent(source, options);
  const minimal: AopGovernanceObservation = {
    aop_version: full.aop_version,
    id: full.id,
    agent_id: full.agent_id,
    task_id: full.task_id,
    timestamp: full.timestamp,
  };
  if (full.governance !== undefined) minimal.governance = full.governance as GovernanceContext;
  if (full.parent_id !== undefined) minimal.parent_id = full.parent_id;
  if (full.trace_context !== undefined) minimal.trace_context = full.trace_context;
  return minimal;
}
