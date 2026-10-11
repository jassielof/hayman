import { afterEach, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import EntryCitationPreview from './EntryCitationPreview.svelte';
import { tauriBackend } from '#lib/services/tauri-backend.js';

vi.mock('#lib/services/tauri-backend.js', () => ({
  tauriBackend: { openExternalUrl: vi.fn().mockResolvedValue(undefined) },
}));
let component: ReturnType<typeof mount>;
afterEach(async () => {
  if (component) await unmount(component);
  document.body.replaceChildren();
  vi.clearAllMocks();
});

it('renders styled native citations, literal custom prose, and the selected bibliography', () => {
  component = mount(EntryCitationPreview, {
    target: document.body,
    props: {
      loading: false,
      preview: {
        parts: [
          { text: '<script>literal</script> By ' },
          { citation: 0 },
          { text: '\nEnd.' },
        ],
        citations: ['<span style="font-style: italic;">Doe</span>'],
        bibliography: {
          items: [
            {
              key: 'book',
              text: 'A book',
              html: '<span style="font-weight: bold;">A book</span>',
              firstFieldHtml: null,
            },
          ],
          hangingIndent: true,
          secondFieldAlign: false,
          lineSpacing: 1,
          entrySpacing: 0,
        },
      },
    },
  });
  flushSync();
  expect(document.querySelector('script')).toBeNull();
  const examples = document.querySelector('[aria-label="Citation examples"]')!;
  expect(examples.textContent).toContain('<script>literal</script> By');
  expect(examples.querySelector('[style]')?.getAttribute('style')).toContain(
    'italic',
  );
  expect(
    document.querySelector('[data-entry-key="book"]')?.textContent,
  ).toContain('A book');
});

it('shows native renderer errors without stale preview content', () => {
  component = mount(EntryCitationPreview, {
    target: document.body,
    props: { loading: false, error: 'Unknown style' },
  });
  flushSync();
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    'Unknown style',
  );
  expect(
    document.querySelector('[aria-label="Entry bibliography"]'),
  ).toBeNull();
});

it('opens citation source links externally', async () => {
  component = mount(EntryCitationPreview, {
    target: document.body,
    props: {
      loading: false,
      preview: {
        parts: [{ citation: 0 }],
        citations: ['<a href="https://example.com/">Source</a>'],
        bibliography: {
          items: [],
          hangingIndent: false,
          secondFieldAlign: false,
          lineSpacing: 1,
          entrySpacing: 0,
        },
      },
    },
  });
  flushSync();
  document.querySelector<HTMLAnchorElement>('a')!.click();
  expect(tauriBackend.openExternalUrl).toHaveBeenCalledWith(
    'https://example.com/',
  );
  await Promise.resolve();
});
