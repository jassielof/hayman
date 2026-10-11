import { afterEach, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import EntryPreviewTabs from './entry-preview-tabs.svelte';
import { DEFAULT_APP_SETTINGS } from '#lib/types/app-settings.js';
import { tauriBackend } from '#lib/services/tauri-backend.js';

vi.mock('#lib/services/settings.service.js', () => ({
  SettingsService: {
    get: vi.fn(async () => ({
      ...structuredClone(DEFAULT_APP_SETTINGS),
      citation: {
        defaultStyle: 'apa',
        entryPreviewTemplate: 'Written by {{author}}.',
      },
    })),
  },
}));
vi.mock('#lib/services/tauri-backend.js', () => ({
  tauriBackend: {
    renderEntryPreview: vi.fn(
      async (...args: Parameters<typeof tauriBackend.renderEntryPreview>) => ({
        citations: args[4].map(() => 'Doe'),
        bibliography: {
          items: [],
          hangingIndent: false,
          secondFieldAlign: false,
          lineSpacing: 1,
          entrySpacing: 0,
        },
      }),
    ),
    openExternalUrl: vi.fn(),
  },
}));

let component: ReturnType<typeof mount>;
afterEach(async () => {
  if (component) await unmount(component);
  document.body.replaceChildren();
  vi.clearAllMocks();
});

it('uses the saved template and allows a per-preview template override without changing settings', async () => {
  component = mount(EntryPreviewTabs, {
    target: document.body,
    props: {
      entryId: 'book',
      bibliographyData: { book: { type: 'Book', title: 'A book' } },
      entryYamlData: ['book:', '  type: Book'],
    },
  });
  flushSync();
  expect(tauriBackend.renderEntryPreview).not.toHaveBeenCalled();
  const trigger = [
    ...document.querySelectorAll<HTMLButtonElement>('button'),
  ].find((button) => button.textContent?.includes('Citation preview'))!;
  trigger.click();
  await vi.waitFor(() => {
    flushSync();
    expect(tauriBackend.renderEntryPreview).toHaveBeenCalledWith(
      expect.any(String),
      'book',
      'apa',
      undefined,
      [{ form: 'author', supplement: undefined }],
    );
    expect(
      document.querySelector('[aria-label="Citation examples"]')?.textContent,
    ).toContain('Written by');
  });
  document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  flushSync();
  const template = document.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label="Entry preview template"]',
  )!;
  template.value = 'In {{year}}, see {{normal|chapter 3}}.';
  template.dispatchEvent(new Event('input', { bubbles: true }));
  await vi.waitFor(
    () => {
      flushSync();
      expect(tauriBackend.renderEntryPreview).toHaveBeenLastCalledWith(
        expect.any(String),
        'book',
        'apa',
        undefined,
        [
          { form: 'year', supplement: undefined },
          { form: 'normal', supplement: 'chapter 3' },
        ],
      );
    },
    { timeout: 3000 },
  );
  document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  await vi.waitFor(() => {
    flushSync();
    expect(tauriBackend.renderEntryPreview).toHaveBeenLastCalledWith(
      expect.any(String),
      'book',
      'apa',
      undefined,
      [{ form: 'author', supplement: undefined }],
    );
  });
});
