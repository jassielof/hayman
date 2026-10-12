import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import Harness from './__tests__/CitationStylePickerHarness.svelte';
import { listBundledCitationStyles } from '#lib/services/bundled-citation-styles.service.js';
import type * as CatalogService from '#lib/services/bundled-citation-styles.service.js';

vi.mock(
  '#lib/services/bundled-citation-styles.service.js',
  async (original) => ({
    ...(await original<typeof CatalogService>()),
    listBundledCitationStyles: vi.fn(),
  }),
);

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
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
  vi.mocked(listBundledCitationStyles).mockReset().mockResolvedValue(styles);
});
afterEach(async () => {
  if (component) await unmount(component);
  component = undefined;
  document.body.replaceChildren();
});
async function render(initial = 'ieee') {
  component = mount(Harness, { target: document.body, props: { initial } });
  flushSync();
  await tick();
  flushSync();
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLInputElement>('[role="combobox"]')!.disabled,
    ).toBe(false),
  );
}
function input() {
  return document.querySelector<HTMLInputElement>('[role="combobox"]')!;
}
function chosen() {
  return document.querySelector('[data-testid="selected-style"]')!.textContent;
}
async function search(query: string) {
  input().focus();
  input().value = query;
  input().dispatchEvent(
    new InputEvent('input', { bubbles: true, data: query }),
  );
  flushSync();
  await tick();
  flushSync();
}
async function key(key: string) {
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
  flushSync();
  await tick();
  flushSync();
}

it('recognizes existing aliases without rewriting the saved choice', async () => {
  await render('apa');
  expect(input().value).toBe('APA Style 7th edition');
  expect(chosen()).toBe('apa');
  expect(document.querySelector('[data-testid="valid"]')!.textContent).toBe(
    'true',
  );
});

it('filters by alias and commits a keyboard selection, not arbitrary search text', async () => {
  await render();
  await search('MLA');
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
  expect(chosen()).toBe('ieee');
  await key('ArrowDown');
  await key('Enter');
  expect(chosen()).toBe('modern-language-association');
  expect(input().value).toBe(styles[2].title);
});

it.each(['Escape', 'Tab'])(
  'shows no results for typos and %s restores the selected style',
  async (cancelKey) => {
    await render();
    await search('does-not-exist');
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      'No matching',
    );
    expect(chosen()).toBe('ieee');
    await key(cancelKey);
    expect(chosen()).toBe('ieee');
    expect(input().value).toBe('IEEE');
  },
);

it('supports mouse selection by full style name', async () => {
  await render();
  await search('psychological');
  document
    .querySelector<HTMLElement>('[role="option"]')!
    .dispatchEvent(
      new MouseEvent('pointerup', { bubbles: true, cancelable: true }),
    );
  flushSync();
  await tick();
  flushSync();
  expect(chosen()).toBe('american-psychological-association');
});

it.each(['mouse', 'touch', 'keyboard'])(
  'anchors the portaled list to the viewport when opened with %s',
  async (method) => {
    // A long catalog reproduces the initial selected-option scroll in browsers.
    // JSDOM has no layout: assert the fixed-position boundary that prevents that
    // scroll from moving the document, rather than pretending to test scrollY.
    vi.mocked(listBundledCitationStyles).mockResolvedValue([
      ...Array.from({ length: 50 }, (_, index) => ({
        id: `style-${index}`,
        title: `Style ${index}`,
        names: [`style-${index}`],
      })),
      ...styles,
    ]);
    await render();
    const trigger = document.querySelector<HTMLButtonElement>(
      '[aria-label="Show bundled citation styles"]',
    )!;
    if (method === 'keyboard') {
      trigger.focus();
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      );
    } else {
      trigger.dispatchEvent(
        new PointerEvent(method === 'touch' ? 'pointerup' : 'pointerdown', {
          pointerType: method,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
    flushSync();
    await tick();
    flushSync();
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(input());
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(
      list.closest<HTMLElement>('[data-bits-floating-content-wrapper]')!.style
        .position,
    ).toBe('fixed');
    expect(list.contains(document.querySelector('[data-selected]'))).toBe(true);
    await key('Escape');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(chosen()).toBe('ieee');
  },
);

it('flags an invalid legacy selection instead of silently changing it', async () => {
  await render('apaaa');
  expect(chosen()).toBe('apaaa');
  expect(document.querySelector('[data-testid="valid"]')!.textContent).toBe(
    'false',
  );
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    'not a bundled',
  );
  await search('ieee');
  document
    .querySelector<HTMLElement>('[role="option"]')!
    .dispatchEvent(
      new MouseEvent('pointerup', { bubbles: true, cancelable: true }),
    );
  flushSync();
  await tick();
  flushSync();
  expect(chosen()).toBe('ieee');
});

it('offers retry on discovery errors without enabling free-text selection', async () => {
  vi.mocked(listBundledCitationStyles).mockRejectedValueOnce(
    new Error('Offline IPC'),
  );
  component = mount(Harness, { target: document.body });
  flushSync();
  await tick();
  flushSync();
  expect(input().disabled).toBe(true);
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    'Could not load',
  );
  [...document.querySelectorAll('button')]
    .find((button) => button.textContent?.includes('Retry'))!
    .click();
  flushSync();
  await tick();
  flushSync();
  expect(input().disabled).toBe(false);
  expect(chosen()).toBe('ieee');
});
