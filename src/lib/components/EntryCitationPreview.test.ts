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

it.each([
  ['中文研究', '王小明', '中文语言与文献研究'],
  ['日本語', '山田太郎', '日本語の文献と研究'],
  ['한국어', '김민수', '한국어 문헌 연구'],
  ['العربية', 'ليلى منصور', 'اللغة العربية والمراجع العلمية'],
  ['עברית', 'דנה כהן', 'מחקר ביבליוגרפי בעברית'],
  ['हिन्दी', 'आशा शर्मा', 'हिन्दी भाषा और साहित्य का अध्ययन'],
  ['Ελληνικά', 'Ελένη Παπαδοπούλου', 'Ελληνική βιβλιογραφία'],
  ['Кириллица', 'Анна Иванова', 'Русская литература'],
  ['mixed', '𠮷田はな', '中文・日本語 / العربية / Cafe\u0301 / 𠮷'],
])('retains %s text in citation and bibliography DOM', (key, author, title) => {
  component = mount(EntryCitationPreview, {
    target: document.body,
    props: {
      loading: false,
      preview: {
        parts: [{ text: 'Reference: ' }, { citation: 0 }],
        citations: [`<span style="font-style: italic;">${author}</span>`],
        bibliography: {
          items: [{ key, text: title, html: title, firstFieldHtml: null }],
          hangingIndent: false,
          secondFieldAlign: false,
          lineSpacing: 1,
          entrySpacing: 0,
        },
      },
    },
  });
  flushSync();
  expect(
    document.querySelector('[aria-label="Citation examples"]')?.textContent,
  ).toContain(author);
  const item = document.querySelector('[data-entry-key]')!;
  expect(item.getAttribute('data-entry-key')).toBe(key);
  expect(item.querySelector('div')?.textContent).toBe(title);
  expect(document.body.textContent).not.toContain('\uFFFD');
});
