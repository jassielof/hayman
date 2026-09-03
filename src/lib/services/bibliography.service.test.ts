import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bibliography } from '$lib/types/bibliography';

const { records } = vi.hoisted(() => ({
  records: new Map<string, Bibliography>(),
}));

function clone<T>(value: T): T {
  return structuredClone(value);
}

vi.mock('$lib/services/tauri-backend', () => ({
  tauriBackend: {
    list: vi.fn(async () => [...records.values()].map(clone)),
    get: vi.fn(async (id: string) => {
      const value = records.get(id);
      if (!value) throw new Error(`Bibliography '${id}' was not found.`);
      return clone(value);
    }),
    createManaged: vi.fn(async (bibliography: Bibliography) => {
      records.set(bibliography.metadata.id, clone(bibliography));
      return clone(bibliography);
    }),
    save: vi.fn(async (bibliography: Bibliography) => {
      records.set(bibliography.metadata.id, clone(bibliography));
      return clone(bibliography);
    }),
    delete: vi.fn(async (id: string) => records.delete(id)),
  },
}));

import { BibliographyService } from '$lib/services/bibliography.service';

const sampleBibliography = (): Bibliography => ({
  metadata: {
    id: 'test-bib',
    title: 'Test Bibliography',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  data: { entry1: { type: 'misc', title: 'First' } },
});

describe('BibliographyService', () => {
  beforeEach(() => records.clear());

  it('adds and retrieves a bibliography through the native repository', async () => {
    await BibliographyService.add(sampleBibliography());
    expect(
      (await BibliographyService.getOrNull('test-bib'))?.metadata.title,
    ).toBe('Test Bibliography');
  });

  it('saves an entry through the native repository', async () => {
    await BibliographyService.add(sampleBibliography());
    await BibliographyService.saveEntry('test-bib', 'entry2', {
      type: 'article',
      title: 'Second',
    });
    expect((await BibliographyService.get('test-bib')).data.entry2?.title).toBe(
      'Second',
    );
  });
});
