import { beforeEach, expect, it, vi } from 'vitest';
import { tauriBackend } from './tauri-backend.js';

vi.mock('#lib/services/tauri-backend.js', () => ({
  tauriBackend: { listBundledCitationStyles: vi.fn() },
}));

const styles = [
  { id: 'ieee', title: 'IEEE', names: ['ieee'] },
  {
    id: 'american-psychological-association',
    title: 'APA Style 7th edition',
    names: ['american-psychological-association', 'apa'],
  },
  {
    id: 'modern-language-association',
    title: 'Modern Language Association 9th edition',
    names: ['modern-language-association', 'mla'],
  },
];
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

it('uses the native list and shares successful discovery across pickers', async () => {
  vi.mocked(tauriBackend.listBundledCitationStyles).mockResolvedValue(styles);
  const { listBundledCitationStyles } =
    await import('./bundled-citation-styles.service.js');
  const [first, second] = await Promise.all([
    listBundledCitationStyles(),
    listBundledCitationStyles(),
  ]);
  expect(first).toEqual(styles);
  expect(second).toBe(first);
  expect(tauriBackend.listBundledCitationStyles).toHaveBeenCalledOnce();
});

it('allows retry after a failed native discovery', async () => {
  vi.mocked(tauriBackend.listBundledCitationStyles)
    .mockRejectedValueOnce(new Error('IPC failed'))
    .mockResolvedValueOnce(styles);
  const { listBundledCitationStyles } =
    await import('./bundled-citation-styles.service.js');
  await expect(listBundledCitationStyles()).rejects.toThrow('IPC failed');
  await expect(listBundledCitationStyles()).resolves.toEqual(styles);
  expect(tauriBackend.listBundledCitationStyles).toHaveBeenCalledTimes(2);
});

it('searches full names, aliases and multiple terms case-insensitively', async () => {
  const { filterBundledCitationStyles, findBundledCitationStyle } =
    await import('./bundled-citation-styles.service.js');
  expect(filterBundledCitationStyles(styles, ' APA ')).toEqual([styles[1]]);
  expect(filterBundledCitationStyles(styles, 'language 9th')).toEqual([
    styles[2],
  ]);
  expect(filterBundledCitationStyles(styles, 'mla')).toEqual([styles[2]]);
  expect(filterBundledCitationStyles(styles, 'not-a-style')).toEqual([]);
  expect(filterBundledCitationStyles(styles, '')).toEqual(styles);
  expect(findBundledCitationStyle(styles, 'apa')).toEqual(styles[1]);
  expect(findBundledCitationStyle(styles, 'not-a-style')).toBeUndefined();
});
