import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import FormattedBibliography from './FormattedBibliography.svelte';
import {
  tauriBackend,
  type RenderedBibliography,
} from '#lib/services/tauri-backend.js';

vi.mock('#lib/services/tauri-backend.js', () => ({
  tauriBackend: { openExternalUrl: vi.fn().mockResolvedValue(undefined) },
}));

let component: ReturnType<typeof mount> | undefined;
afterEach(async () => {
  if (component) await unmount(component);
  component = undefined;
  document.body.replaceChildren();
  vi.clearAllMocks();
});

function render(overrides: Partial<RenderedBibliography> = {}) {
  const bibliography: RenderedBibliography = {
    items: [
      {
        key: 'book',
        text: '[1] A book',
        html: '<span style="font-style: italic;">A book</span>',
        language: '',
        firstFieldHtml: '[1]',
      },
    ],
    hangingIndent: false,
    secondFieldAlign: true,
    lineSpacing: 2,
    entrySpacing: 1,
    ...overrides,
  };
  component = mount(FormattedBibliography, {
    target: document.body,
    props: { bibliography },
  });
  flushSync();
}

describe('formatted bibliography', () => {
  it('retains inline styling, separate numeric labels and CSL spacing', () => {
    render();
    const list = document.querySelector('ol')!;
    const item = document.querySelector('li')!;
    expect(item.textContent?.trim()).toBe('[1] A book');
    expect(item.classList.contains('grid')).toBe(true);
    expect(item.querySelector('div span')!.getAttribute('style')).toContain(
      'font-style: italic',
    );
    expect(list.style.lineHeight).toBe('2.7');
    expect(list.style.gap).toBe('1lh');
  });

  it('uses hanging indentation only for styles without aligned labels', () => {
    render({
      hangingIndent: true,
      secondFieldAlign: false,
      items: [
        {
          key: 'book',
          text: 'A book',
          html: 'A book',
          language: '',
          firstFieldHtml: null,
        },
      ],
    });
    const item = document.querySelector('li')!;
    expect(item.classList.contains('ps-6')).toBe(true);
    expect(item.classList.contains('-indent-6')).toBe(true);
    expect(item.classList.contains('grid')).toBe(false);
  });

  it('keeps escaped data as text and opens links outside the webview', async () => {
    render({
      items: [
        {
          key: 'url',
          text: '',
          language: '',
          firstFieldHtml: null,
          html: '&lt;script&gt;not markup&lt;/script&gt; <a href="https://example.com/?a=1&amp;b=2"><span>Source</span></a>',
        },
      ],
    });
    expect(document.querySelector('script')).toBeNull();
    document.querySelector<HTMLSpanElement>('a span')!.click();
    expect(tauriBackend.openExternalUrl).toHaveBeenCalledWith(
      'https://example.com/?a=1&b=2',
    );
    await Promise.resolve();
  });

  it('reports failures to open a source link', async () => {
    vi.mocked(tauriBackend.openExternalUrl).mockRejectedValueOnce(
      new Error('Browser unavailable'),
    );
    render({
      items: [
        {
          key: 'url',
          text: '',
          language: '',
          firstFieldHtml: null,
          html: '<a href="https://example.com/">Source</a>',
        },
      ],
    });
    document.querySelector<HTMLAnchorElement>('a')!.click();
    await Promise.resolve();
    flushSync();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Browser unavailable',
    );
  });
});
