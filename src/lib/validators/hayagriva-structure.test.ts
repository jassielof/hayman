import { describe, expect, it } from 'vitest';
import {
  assertAcyclic,
  assertParentDepthWithin,
} from '@hayman/hayagriva-schema';
import { parseAndValidateEntry } from '$lib/validators/parse-and-validate';
import { hayagrivaService } from '$lib/services/hayagriva.service';
import { generateEntryId } from '$lib/utils/entry-id';

describe('structure validators', () => {
  it('rejects cyclic parent references', () => {
    const parent: Record<string, unknown> = { type: 'book' };
    const child: Record<string, unknown> = { type: 'chapter', parent };
    parent.parent = child;

    expect(() => assertAcyclic({ child })).toThrow();
  });

  it('rejects parent depth beyond limit', () => {
    const entry: Record<string, unknown> = { type: 'misc' };
    let current = entry;
    for (let i = 0; i < 40; i++) {
      current.parent = { type: 'misc' };
      current = current.parent as Record<string, unknown>;
    }

    expect(() => assertParentDepthWithin({ deep: entry })).toThrow();
  });
});

describe('parseAndValidateEntry', () => {
  it('accepts a minimal misc entry', () => {
    const result = parseAndValidateEntry({ type: 'misc', title: 'Hello' });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid entry type', () => {
    const result = parseAndValidateEntry({ type: 'not-a-type' } as never);
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('accepts the documented long, short, and verbatim formattable string', () => {
    const result = parseAndValidateEntry({
      type: 'article',
      title: {
        value: 'UN World Food Programme',
        short: 'WFP',
        verbatim: true,
      },
    });

    expect(result.valid).toBe(true);
  });

  it('rejects removed formattable string keys instead of silently losing them', () => {
    const result = parseAndValidateEntry({
      type: 'article',
      title: {
        value: 'A title',
        'sentence-case': 'A title',
      },
    } as never);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: expect.stringContaining('title') }),
      ]),
    );
  });

  it('accepts custom serial-number schemes supported by Hayagriva', () => {
    const result = parseAndValidateEntry({
      type: 'report',
      'serial-number': {
        doi: '10.1000/182',
        report: 'TR-2026-04',
      },
    });

    expect(result.valid).toBe(true);
  });
});

describe('HayagrivaService.import', () => {
  it('parses a simple YAML bibliography', () => {
    const yaml = `demo:
  type: article
  title: Demo Paper
  author: [Jane Doe]`;

    const data = hayagrivaService.import(yaml);
    expect(data.demo.type).toBe('article');
  });
});

describe('generateEntryId', () => {
  it('builds type author year title id', () => {
    const id = generateEntryId({
      type: 'article',
      title: 'Patterns',
      author: 'Gamma',
      date: '1995',
    });

    expect(id).toMatch(/^Article/);
    expect(id).toContain('1995');
    expect(id).toContain('Patterns');
  });
});
