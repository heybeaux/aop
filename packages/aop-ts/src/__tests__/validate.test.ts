/**
 * Negative-path coverage for the validator. The conformance suite proves
 * valid-by-construction output passes; this suite proves the validator
 * actually REJECTS malformed events — otherwise "conformant" is meaningless.
 */
import { describe, it, expect } from 'vitest';

import { validateAopEvent, schemaPath, AOP_VERSION } from '../index.js';

const validBase = {
  aop_version: AOP_VERSION,
  id: '01J0000000000000000000000A',
  agent_id: 'kit',
  task_id: 't',
  timestamp: '2026-06-15T21:00:00.000Z',
};

describe('validateAopEvent — rejects malformed events', () => {
  it('resolves a real schema file on disk', () => {
    expect(schemaPath()).toMatch(/agent-observation-event\.schema\.json$/);
  });

  it('accepts a minimal valid event', () => {
    expect(validateAopEvent(validBase).valid).toBe(true);
  });

  it('rejects a missing required identity field', () => {
    const { agent_id: _omit, ...noAgent } = validBase;
    const r = validateAopEvent(noAgent);
    expect(r.valid).toBe(false);
    expect(r.errors).toBeTruthy();
  });

  it('rejects a wrong aop_version const', () => {
    expect(validateAopEvent({ ...validBase, aop_version: '9.9' }).valid).toBe(false);
  });

  it('rejects an out-of-range memory confidence', () => {
    const r = validateAopEvent({ ...validBase, memory: { refs: [], confidence: 2 } });
    expect(r.valid).toBe(false);
  });

  it('rejects a malformed timestamp', () => {
    expect(validateAopEvent({ ...validBase, timestamp: 'not-a-date' }).valid).toBe(false);
  });

  it('rejects a non-object candidate', () => {
    expect(validateAopEvent(null).valid).toBe(false);
    expect(validateAopEvent('nope').valid).toBe(false);
  });
});
