import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import fixture from '../../../packages/hayagriva-schema/fixtures/valid-unicode.yml?raw';
import { hayagrivaService, toYaml } from './hayagriva.service.js';
import { formatAuthor } from '#lib/formatters/author.js';
import { formatFormattableString } from '#lib/formatters/formattable-string.js';

describe('Unicode reference integrity', () => {
  it('round-trips CJK, RTL, Indic, Greek, Cyrillic and mixed-script references', () => {
    const original = YAML.parse(fixture, { schema: 'core' });
    const imported = hayagrivaService.import(fixture);
    expect(imported).toEqual(original);
    expect(hayagrivaService.import(toYaml(imported))).toEqual(original);
    for (const [key, entry] of Object.entries(imported)) {
      expect(formatFormattableString(entry.title)).toBe(
        original[key].title.value,
      );
      expect(formatAuthor(entry.author)).toBe(original[key].author.name);
    }
    expect(toYaml(imported)).toContain('Cafe\u0301');
    expect(toYaml(imported)).toContain('𠮷');
  });
});
