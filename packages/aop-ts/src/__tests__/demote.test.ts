/**
 * Projection quarantine semantics. The spec says impl provenance MUST NOT
 * appear at the AOP top level — so quarantine is the DEFAULT, not an opt-in,
 * and it must not clobber caller metadata or demote spec fields.
 */
import { describe, it, expect } from 'vitest';

import { toAopEvent, validateAopEvent, type AopSource } from '../index.js';

function sourceWithProvenance(): AopSource {
  return {
    id: '01J0000000000000000000000A',
    agent_id: 'kit',
    task_id: 't',
    timestamp: '2026-06-15T21:00:00.000Z',
    intent: { action: 'write', step_trace_id: 's', skipped: false, constraint_injected: false },
    // impl provenance — must be quarantined by default:
    chain_self_hash: 'bb',
    signature: 'cc',
  } as AopSource;
}

describe('toAopEvent — quarantine is the default', () => {
  it('demotes ALL non-spec keys with no demoteKeys supplied', () => {
    const aop = toAopEvent(sourceWithProvenance()) as unknown as Record<string, unknown>;
    expect(aop.chain_self_hash).toBeUndefined();
    expect(aop.signature).toBeUndefined();
    const impl = (aop.metadata as Record<string, unknown>).impl as Record<string, unknown>;
    expect(impl.chain_self_hash).toBe('bb');
    expect(impl.signature).toBe('cc');
    expect(validateAopEvent(aop).valid).toBe(true);
  });

  it('never demotes a spec field even if listed in demoteKeys', () => {
    const aop = toAopEvent(sourceWithProvenance(), {
      demoteKeys: ['intent', 'signature'],
    });
    // intent is a spec field — stays at top level despite being listed
    expect(aop.intent).toBeDefined();
    const impl = (aop.metadata as Record<string, unknown>).impl as Record<string, unknown>;
    expect(impl.signature).toBe('cc');
    expect('intent' in impl).toBe(false);
  });

  it('merges into existing metadata namespace instead of clobbering', () => {
    const src = {
      ...sourceWithProvenance(),
      metadata: { impl: { keepMe: 'IMPORTANT' } },
    } as AopSource;
    const aop = toAopEvent(src);
    const impl = (aop.metadata as Record<string, unknown>).impl as Record<string, unknown>;
    expect(impl.keepMe).toBe('IMPORTANT'); // not clobbered
    expect(impl.chain_self_hash).toBe('bb'); // and provenance merged in
  });

  it('allowExtraKeys surfaces non-quarantined keys at the top level', () => {
    const src = { ...sourceWithProvenance(), customField: 'x' } as AopSource;
    const aop = toAopEvent(src, {
      demoteKeys: ['chain_self_hash', 'signature'],
      allowExtraKeys: true,
    }) as unknown as Record<string, unknown>;
    expect(aop.customField).toBe('x'); // not quarantined, allowed through
    expect(aop.chain_self_hash).toBeUndefined(); // explicitly quarantined
  });

  it('handles a null metadata source without throwing', () => {
    const src = { ...sourceWithProvenance(), metadata: null } as unknown as AopSource;
    expect(() => toAopEvent(src)).not.toThrow();
  });
});
