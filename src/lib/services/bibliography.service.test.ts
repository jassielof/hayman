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
    deleteEntryMetadata: vi.fn(async () => [1]),
    discardEntryTrash: vi.fn(async () => undefined),
    renameEntryMetadata: vi.fn(async () => undefined),
    insertEntries: vi.fn(
      async (bibliographyId: string, entries: Bibliography['data']) => {
        const bibliography = records.get(bibliographyId)!;
        bibliography.data = { ...bibliography.data, ...clone(entries) };
        records.set(bibliographyId, bibliography);
        return clone(bibliography);
      },
    ),
  },
}));

import { BibliographyService } from '$lib/services/bibliography.service';
import { tauriBackend } from '$lib/services/tauri-backend';
import {
  subscribeToMutations,
  type MutationNotification,
} from '$lib/services/mutation-notifications';

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
  beforeEach(() => {
    records.clear();
    vi.clearAllMocks();
  });

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

  it('imports several entries through one native operation', async () => {
    await BibliographyService.add(sampleBibliography());

    await BibliographyService.importEntries('test-bib', {
      second: { type: 'article', title: 'Second' },
      third: { type: 'book', title: 'Third' },
    });

    expect(tauriBackend.insertEntries).toHaveBeenCalledTimes(1);
    expect(
      Object.keys((await BibliographyService.get('test-bib')).data),
    ).toEqual(['entry1', 'second', 'third']);
  });

  it('deletes a batch with one atomic repository save', async () => {
    const bibliography = sampleBibliography();
    bibliography.data.entry2 = { type: 'article', title: 'Second' };
    bibliography.data.entry3 = { type: 'book', title: 'Third' };
    await BibliographyService.add(bibliography);

    await BibliographyService.deleteEntries('test-bib', ['entry1', 'entry2']);

    expect(tauriBackend.save).toHaveBeenCalledTimes(1);
    expect(
      Object.keys((await BibliographyService.get('test-bib')).data),
    ).toEqual(['entry3']);
  });

  it('rolls back a trash restore when removing its trash record fails', async () => {
    await BibliographyService.add(sampleBibliography());
    vi.mocked(tauriBackend.discardEntryTrash).mockRejectedValueOnce(
      new Error('catalog write failed'),
    );

    await expect(
      BibliographyService.restoreTrashedEntry({
        id: 42,
        bibliographyId: 'test-bib',
        entryId: 'entry2',
        data: { type: 'article', title: 'Second' },
      }),
    ).rejects.toThrow('catalog write failed');

    expect(
      (await BibliographyService.get('test-bib')).data.entry2,
    ).toBeUndefined();
    expect(tauriBackend.save).toHaveBeenCalledTimes(2);
  });

  it('moves attachment metadata back when undoing an entry rename', async () => {
    await BibliographyService.add(sampleBibliography());
    let notification: MutationNotification | undefined;
    const unsubscribe = subscribeToMutations((value) => (notification = value));

    await BibliographyService.updateEntry(
      'test-bib',
      'renamed',
      { type: 'misc', title: 'First' },
      'entry1',
    );
    await notification?.undo?.();
    unsubscribe();

    expect(tauriBackend.renameEntryMetadata).toHaveBeenNthCalledWith(
      1,
      'test-bib',
      'entry1',
      'renamed',
    );
    expect(tauriBackend.renameEntryMetadata).toHaveBeenNthCalledWith(
      2,
      'test-bib',
      'renamed',
      'entry1',
    );
    expect(
      (await BibliographyService.get('test-bib')).data.entry1,
    ).toBeDefined();
  });
});
