import { expect, it } from 'vitest';
import { pageContext } from './page-context';

it('uses bibliography titles and full entry titles rather than generic labels', () => {
  const context = pageContext(
    '/bibliography/demo/entry/a',
    { bibliographyId: 'demo', entryId: 'a' },
    {
      entry: { title: { value: 'Long title', short: 'Short' } },
      bibliographyMetadata: { id: 'demo', title: 'My research' },
    },
    [],
    [],
  );
  expect(context.title).toBe('Long title');
  expect(context.items[1]).toEqual({
    label: 'My research',
    href: '/bibliography/demo',
  });
});
it('falls back to IDs, supports editing and encodes citation keys in links', () => {
  const context = pageContext(
    '/bibliography/demo/entry/a/edit',
    { bibliographyId: 'demo', entryId: 'a/b#c' },
    {},
    [],
    [],
  );
  expect(context.items[1].label).toBe('demo');
  expect(context.items[2].href).toBe('/bibliography/demo/entry/a%2Fb%23c');
  expect(context.title).toBe('Edit a/b#c');
});
it('recognizes static pages, new-entry workflows and errors', () => {
  expect(pageContext('/tools', {}, {}, [], []).title).toBe('Quick tools');
  expect(pageContext('/bibliography/new', {}, {}, [], []).title).toBe(
    'New bibliography',
  );
  expect(
    pageContext(
      '/bibliography/demo/entry',
      { bibliographyId: 'demo' },
      {},
      [],
      [],
    ).title,
  ).toBe('New entry');
  expect(pageContext('/unknown', {}, {}, [], [], 404).title).toBe('Not found');
});
