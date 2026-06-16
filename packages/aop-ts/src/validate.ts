/**
 * AOP v0.1 schema validator.
 *
 * Compiles the vendored JSON Schema with ajv so producers can assert that an
 * event is conformant before emitting it. The schema is the normative source;
 * this validator is a convenience binding over it.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Ajv2020 } from 'ajv/dist/2020.js';
import * as addFormatsNs from 'ajv-formats';
import type { ValidateFunction } from 'ajv';

const addFormats = (addFormatsNs as unknown as { default: typeof import('ajv-formats').default })
  .default;

const SCHEMA_REL = 'spec/v0.1/agent-observation-event.schema.json';

/**
 * Resolve the vendored normative schema without relying on `import.meta`
 * (which does not survive the CJS build). Walk up from cwd until we find the
 * repo/package root that contains `spec/v0.1/...`. Callers running from
 * anywhere inside the AOP repo (or a consumer that vendors `spec/`) resolve
 * correctly; pass an explicit path to `getValidator`/`validateAopEvent` via
 * `SCHEMA_PATH` override if your layout differs.
 */
function resolveSchemaPath(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, SCHEMA_REL);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(process.cwd(), SCHEMA_REL);
}

/** Path to the vendored normative schema. */
export const SCHEMA_PATH = resolveSchemaPath();

let cached: ValidateFunction | null = null;

/** Compile (once) and return the AOP v0.1 validate function. */
export function getValidator(): ValidateFunction {
  if (cached) return cached;
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  cached = ajv.compile(schema);
  return cached;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidateFunction['errors'];
}

/** Validate a candidate AOP event against the v0.1 schema. */
export function validateAopEvent(candidate: unknown): ValidationResult {
  const validate = getValidator();
  const valid = validate(candidate) as boolean;
  return { valid, errors: valid ? null : validate.errors };
}
