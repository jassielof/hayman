import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import validCompleteYaml from '../fixtures/valid-complete.yml?raw';
import {
  ENTRY_TYPE_NAMES,
  assertHayagrivaStructure,
  bibliographyEntrySchema,
  hayagrivaBibliographySchema,
  serialNumberSchema,
  topLevelEntrySchema,
} from './index.js';

describe('Hayagriva schema contract', () => {
  it('accepts the shared complete fixture', () => {
    const value = YAML.parse(validCompleteYaml, { schema: 'core' });
    expect(hayagrivaBibliographySchema.safeParse(value).success).toBe(true);
    expect(() => assertHayagrivaStructure(value)).not.toThrow();
  });

  it.each(ENTRY_TYPE_NAMES)('accepts the canonical %s entry type', (type) => {
    expect(topLevelEntrySchema.safeParse({ type }).success).toBe(true);
    const capitalized = `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    expect(topLevelEntrySchema.safeParse({ type: capitalized }).success).toBe(
      true,
    );
  });

  it('accepts nested parents without requiring their type', () => {
    expect(
      topLevelEntrySchema.safeParse({
        type: 'chapter',
        parent: { title: 'Collected works', parent: [{ title: 'Series' }] },
      }).success,
    ).toBe(true);
  });

  it('accepts custom non-empty serial number schemes', () => {
    expect(serialNumberSchema.safeParse({ report: 'TR-42' }).success).toBe(
      true,
    );
    expect(serialNumberSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown fields instead of silently discarding data', () => {
    const result = bibliographyEntrySchema.safeParse({
      type: 'book',
      unsupported: 'value',
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ['invalid type', { type: 'BOOK' }],
    ['empty citation key', { '': { type: 'book' } }],
    ['empty person list', { item: { type: 'book', author: [] } }],
    ['zero page total', { item: { type: 'book', 'page-total': 0 } }],
    ['invalid language', { item: { type: 'book', language: 'english' } }],
    ['invalid timestamp', { item: { type: 'video', runtime: '1:99' } }],
  ])('rejects %s', (_label, value) => {
    const schema =
      'type' in value ? topLevelEntrySchema : hayagrivaBibliographySchema;
    expect(schema.safeParse(value).success).toBe(false);
  });

  it('rejects circular aliases before recursive validation', () => {
    const entry: Record<string, unknown> = { type: 'book' };
    entry.parent = entry;
    expect(() => assertHayagrivaStructure(entry)).toThrow(/circular/i);
  });
});
