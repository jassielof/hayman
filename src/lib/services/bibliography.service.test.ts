import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BibliographyService } from '$lib/services/bibliography.service';
import { db } from '$lib/db';
import type { Bibliography } from '$lib/types/bibliography';

const sampleBibliography = (): Bibliography => ({
  metadata: {
    id: 'test-bib',
    title: 'Test Bibliography',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  data: {
    entry1: { type: 'misc', title: 'First' },
  },
});

describe('BibliographyService', () => {
  beforeEach(async () => {
    await db.bibliographies.clear();
  });

  it('adds and retrieves a bibliography', async () => {
    await BibliographyService.add(sampleBibliography());
    const found = await BibliographyService.getOrNull('test-bib');
    expect(found?.metadata.title).toBe('Test Bibliography');
  });

  it('saves an entry in a transaction', async () => {
    await BibliographyService.add(sampleBibliography());
    await BibliographyService.saveEntry('test-bib', 'entry2', {
      type: 'article',
      title: 'Second',
    });

    const bib = await BibliographyService.get('test-bib');
    expect(bib.data.entry2?.title).toBe('Second');
  });
});
