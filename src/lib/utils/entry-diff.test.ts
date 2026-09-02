import { describe, expect, it } from 'vitest';
import { diffEntry, formatEntryChanges } from './entry-diff';

describe('entry diff', () => {
  it('describes nested additions, removals, edits, and an ID rename', () => {
    const changes = diffEntry(
      'old-id',
      { title: 'Old', author: [{ name: 'Lovelace' }], note: 'remove me' },
      'new-id',
      { title: 'New', author: [{ name: 'Lovelace', given: 'Ada' }] },
    );

    expect(changes).toContainEqual({
      path: 'ID',
      before: 'old-id',
      after: 'new-id',
    });
    expect(formatEntryChanges(changes)).toContain(
      'author[1].given: added “Ada”',
    );
    expect(formatEntryChanges(changes)).toContain('note: removed “remove me”');
    expect(formatEntryChanges(changes)).toContain('title: “Old” → “New”');
  });

  it('returns no changes for equivalent values', () => {
    expect(diffEntry('id', { type: 'book' }, 'id', { type: 'book' })).toEqual(
      [],
    );
  });
});
