/**
 * AOP v0.1 conformance — proven without any reference-implementation import.
 *
 * This is the litmus test from the rationale: a producer emits a conformant
 * AOP event using only @heybeaux/aop. No Sonder, no bus, no chain. If these
 * pass, the spec/impl split is real.
 */
import { describe, it, expect } from 'vitest';

import {
  toAopEvent,
  projectGovernanceObservation,
  validateAopEvent,
  AOP_VERSION,
  type AopSource,
} from '../index.js';

const baseCognitive = {
  capabilities: { mounted: [], resolution: {}, budget_used: 0, budget_limit: 10 },
  memory: { refs: [], confidence: 0.5 },
  reasoning: { model: 'x', neurotypes: [], consensus: true, dissent: [], osi: 0, rounds: 1 },
  prediction: { outcome: 'ok', confidence: 0.9, alpha: 9, beta: 1, model_id: 'm' },
  intent: { action: 'write', step_trace_id: 's1', skipped: false, constraint_injected: false },
};

/** A source carrying the richest Lattice/Aegis governance shape, plus
 *  reference-impl provenance fields that must be demoted. */
function governanceSource(): AopSource {
  return {
    id: '01J0000000000000000000000A',
    agent_id: 'kit',
    task_id: 'task-42',
    parent_id: '01J0000000000000000000000P',
    timestamp: '2026-06-15T21:00:00.000Z',
    ...baseCognitive,
    governance: {
      contract_id: 'contract-7',
      validated: true,
      l1_pass: true,
      l2_pass: true,
      l3_pass: false,
      violations: ['l3:budget-exceeded'],
      circuit_state: 'half-open',
      tier: 'L0+L1',
      evidence: [
        { rule_id: 'r1', rule_kind: 'path-allow', path: '/src', outcome: 'pass' },
        { rule_id: 'r2', rule_kind: 'secret-mask', outcome: 'mask', matched: 'API_KEY' },
      ],
      approval_gate: {
        state: 'pending',
        gate_id: 'gate-9',
        reason: 'writes outside contract scope',
        default_action: 'deny',
        expires_at: '2026-06-15T21:05:00.000Z',
      },
    },
    payload: { cmd: 'rm -rf build' },
    // reference-impl provenance — must NOT leak to the AOP top level:
    version: '2',
    chain_prev_hash: 'aa',
    chain_self_hash: 'bb',
    signature: 'cc',
  };
}

const SONDER_KEYS = ['version', 'chain_prev_hash', 'chain_self_hash', 'signature'] as const;

describe('toAopEvent — conformance', () => {
  it('projects a governance source that validates against the v0.1 schema', () => {
    const aop = toAopEvent(governanceSource(), { demoteKeys: SONDER_KEYS, demoteNamespace: 'sonder' });
    const { valid, errors } = validateAopEvent(aop);
    if (!valid) throw new Error(JSON.stringify(errors, null, 2));
    expect(valid).toBe(true);
    expect(aop.aop_version).toBe(AOP_VERSION);
  });

  it('demotes reference-impl fields out of the AOP top level', () => {
    const aop = toAopEvent(governanceSource(), {
      demoteKeys: SONDER_KEYS,
      demoteNamespace: 'sonder',
    }) as unknown as Record<string, unknown>;
    for (const k of SONDER_KEYS) expect(aop[k]).toBeUndefined();
    const sonder = (aop.metadata as Record<string, unknown>).sonder as Record<string, unknown>;
    expect(sonder.version).toBe('2');
    expect(sonder.chain_self_hash).toBe('bb');
    expect(sonder.signature).toBe('cc');
  });

  it('preserves the full governance block verbatim', () => {
    const src = governanceSource();
    const aop = toAopEvent(src, { demoteKeys: SONDER_KEYS });
    expect(aop.governance).toEqual(src.governance);
  });

  it('attaches trace_context when supplied (execution-span link)', () => {
    const aop = toAopEvent(governanceSource(), {
      demoteKeys: SONDER_KEYS,
      trace_context: { trace_id: 't-1', span_id: 's-1' },
    });
    expect(validateAopEvent(aop).valid).toBe(true);
    expect(aop.trace_context).toEqual({ trace_id: 't-1', span_id: 's-1' });
  });

  it('projects a minimal non-Sonder source (identity + intent only)', () => {
    const src: AopSource = {
      id: '01J0000000000000000000000B',
      agent_id: 'langgraph-shop',
      task_id: 't',
      timestamp: '2026-06-15T21:00:00.000Z',
      intent: { action: 'plan', step_trace_id: 's', skipped: false, constraint_injected: false },
    };
    const aop = toAopEvent(src);
    expect(validateAopEvent(aop).valid).toBe(true);
    expect(aop.metadata).toBeUndefined();
  });

  it('is pure — does not mutate the source', () => {
    const src = governanceSource();
    const snapshot = JSON.parse(JSON.stringify(src));
    toAopEvent(src, { demoteKeys: SONDER_KEYS });
    expect(src).toEqual(snapshot);
  });
});

describe('projectGovernanceObservation — governance tier', () => {
  it('produces a schema-valid identity+governance-only observation', () => {
    const obs = projectGovernanceObservation(governanceSource());
    expect(validateAopEvent(obs).valid).toBe(true);
    const rec = obs as unknown as Record<string, unknown>;
    expect(rec.capabilities).toBeUndefined();
    expect(rec.memory).toBeUndefined();
    expect(obs.governance?.contract_id).toBe('contract-7');
    expect(obs.governance?.approval_gate?.gate_id).toBe('gate-9');
  });

  it('carries the L1 evidence rows required by the governance tier', () => {
    const obs = projectGovernanceObservation(governanceSource());
    expect(obs.governance?.tier).toBe('L0+L1');
    expect(obs.governance?.evidence).toHaveLength(2);
    expect(obs.governance?.evidence?.[1]).toMatchObject({ outcome: 'mask', matched: 'API_KEY' });
  });
});
