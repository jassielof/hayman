import { describe, expect, it } from 'vitest';
import {
  getSuggestedFields,
  isFieldVisible,
  isSectionRelevant,
} from '$lib/validators/entry-field-visibility';

describe('entry field visibility', () => {
  it('always exposes populated fields even outside the active profile', () => {
    const entry = { type: 'book' as const, url: 'https://example.com' };

    expect(isFieldVisible('url', entry.type, false, entry)).toBe(true);
    expect(isSectionRelevant('media', entry.type, false, entry)).toBe(true);
  });

  it('keeps empty fields hidden when they are not configured', () => {
    const entry = { type: 'book' as const };

    expect(isFieldVisible('runtime', entry.type, false, entry)).toBe(false);
  });

  it('uses a per-type profile before the global profile', () => {
    const fields = getSuggestedFields('article', ['note'], {
      article: ['url', 'serial-number'],
    });

    expect([...fields]).toEqual(['url', 'serial-number']);
  });

  it('falls back to the configured global profile', () => {
    const fields = getSuggestedFields('original', ['author', 'archive'], {});

    expect([...fields]).toEqual(['author', 'archive']);
  });
});
