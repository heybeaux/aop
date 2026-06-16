/**
 * AOP v0.1 schema validator.
 *
 * Compiles the vendored JSON Schema with ajv so producers can assert that an
 * event is conformant before emitting it. The schema is the normative source;
 * this validator is a convenience binding over it.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Ajv2020 } from 'ajv/dist/2020.js';
import * as addFormatsNs from 'ajv-formats';
import type { ValidateFunction } from 'ajv';

const addFormats = (addFormatsNs as unknown as { default: typeof import('ajv-formats').default })
  .default;

const SCHEMA_REL = 'spec/v0.1/agent-observation-event.schema.json';

/**
 * Directory of this module. tsup is built with `--shims`, so `import.meta.url`
 * is present in both the ESM output (native) and the CJS output (shimmed from
 * `__filename`). We resolve from it so the schema is found relative to the
 * installed package, not the caller's cwd.
 */
function moduleDir(): string | null {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    /* no import.meta in this context — fall through to cwd walk */
  }
  return null;
}

/**
 * Resolve the normative schema. First check the copy shipped inside `dist/`
 * (so `npm install @heybeaux/aop` works from anywhere), then fall back to
 * walking up from cwd for in-repo development against the source spec.
 */
function resolveSchemaPath(): string {
  const here = moduleDir();
  if (here) {
    const packaged = resolve(here, SCHEMA_REL);
    if (existsSync(packaged)) return packaged;
  }
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

let cached: ValidateFunction | null = null;
let cachedSchemaPath: string | null = null;

/** Resolved path to the normative schema this validator compiles. */
export function schemaPath(): string {
  cachedSchemaPath ??= resolveSchemaPath();
  return cachedSchemaPath;
}

/**
 * Compile (once) and return the AOP v0.1 validate function. Pass an explicit
 * `schemaFile` to override resolution (e.g. a consumer that vendors the spec
 * elsewhere); doing so bypasses and resets the cache.
 */
export function getValidator(schemaFile?: string): ValidateFunction {
  if (schemaFile) {
    cachedSchemaPath = schemaFile;
    cached = null;
  }
  if (cached) return cached;
  const schema = JSON.parse(readFileSync(schemaPath(), 'utf8'));
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
