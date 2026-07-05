/**
 * v0.2 payload_contract coverage. Proves the new optional block validates when
 * well-formed, rejects a field_contract missing the required `unit`, and — the
 * frozen-v0.1 guarantee — that a v0.1 event still validates against v0.1
 * unchanged (no payload_contract, aop_version "0.1").
 */
import { describe, it, expect } from 'vitest';

import {
  validateAopEvent,
  validateAopEventV02,
  schemaPathV02,
  AOP_VERSION,
  AOP_VERSION_V02,
  type PayloadContract,
} from '../index.js';

const v02Base = {
  aop_version: AOP_VERSION_V02,
  id: '01J0000000000000000000000A',
  agent_id: 'kit',
  task_id: 't',
  timestamp: '2026-07-05T21:00:00.000Z',
};

const validContract: PayloadContract = {
  contract_id: 'sha256:abc',
  fields: [
    { name: 'total', wire: 'int', concept: 'order.total.posttax', unit: 'cents_posttax' },
    { name: 'created', wire: 'int', concept: 'order.created', unit: 'epoch_ms' },
  ],
  stateful: false,
  edge_regions: ['promo_threshold_50'],
};

describe('AOP v0.2 — payload_contract', () => {
  it('resolves a real v0.2 schema file on disk', () => {
    expect(schemaPathV02()).toMatch(/v0\.2\/agent-observation-event\.schema\.json$/);
  });

  it('accepts a v0.2 event with a valid payload_contract', () => {
    const r = validateAopEventV02({ ...v02Base, payload_contract: validContract });
    expect(r.valid).toBe(true);
  });

  it('accepts a v0.2 event with no payload_contract (block is optional)', () => {
    expect(validateAopEventV02(v02Base).valid).toBe(true);
  });

  it('rejects a field_contract missing the required unit', () => {
    const badContract = {
      contract_id: 'sha256:abc',
      fields: [{ name: 'total', wire: 'int', concept: 'order.total.posttax' }],
    };
    const r = validateAopEventV02({ ...v02Base, payload_contract: badContract });
    expect(r.valid).toBe(false);
    expect(r.errors).toBeTruthy();
  });

  it('rejects an unknown wire type in a field_contract', () => {
    const badWire = {
      contract_id: 'sha256:abc',
      fields: [{ name: 't', wire: 'decimal', concept: 'c', unit: 'none' }],
    };
    expect(validateAopEventV02({ ...v02Base, payload_contract: badWire }).valid).toBe(false);
  });

  it('rejects aop_version "0.1" against the v0.2 schema (const is "0.2")', () => {
    expect(validateAopEventV02({ ...v02Base, aop_version: '0.1' }).valid).toBe(false);
  });
});

describe('AOP v0.1 — frozen: unchanged by v0.2', () => {
  it('a v0.1 event (no payload_contract) still validates against v0.1', () => {
    const v01 = {
      aop_version: AOP_VERSION,
      id: '01J0000000000000000000000A',
      agent_id: 'kit',
      task_id: 't',
      timestamp: '2026-07-05T21:00:00.000Z',
    };
    expect(validateAopEvent(v01).valid).toBe(true);
  });

  it('a v0.2 event is rejected by the v0.1 validator (aop_version const "0.1")', () => {
    const r = validateAopEvent({ ...v02Base, payload_contract: validContract });
    expect(r.valid).toBe(false);
  });
});
