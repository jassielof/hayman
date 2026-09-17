import { describe, expect, it } from 'vitest';
import { findDuplicateGroups } from './duplicate-detection';

describe('duplicate detection', () => {
  it('groups normalized DOI matches', () => {
    expect(
      findDuplicateGroups({
        one: { type: 'article', 'serial-number': { doi: '10.1000/182' } },
        two: {
          type: 'article',
          'serial-number': { doi: 'https://doi.org/10.1000/182' },
        },
      }),
    ).toEqual([['one', 'two']]);
  });

  it('uses title, author, and year without matching title alone', () => {
    expect(
      findDuplicateGroups({
        one: {
          type: 'book',
          title: 'The Example',
          author: 'Smith, Ana',
          date: 2024,
        },
        two: {
          type: 'book',
          title: 'The Example!',
          author: 'Smith, Ana',
          date: '2024',
        },
        three: {
          type: 'book',
          title: 'The Example',
          author: 'Jones, Bob',
          date: 2024,
        },
      }),
    ).toEqual([['one', 'two']]);
  });
});
