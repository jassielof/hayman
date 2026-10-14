import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export const THEMES = ['light', 'dark', 'sepia'] as const;
export async function prepareTheme(page: Page, theme: (typeof THEMES)[number]) {
  // Test sepia against a dark OS preference: it must remain light-only.
  await page.emulateMedia({
    colorScheme: theme === 'light' ? 'light' : 'dark',
  });
  if (theme === 'sepia') {
    await page.addInitScript(() => {
      localStorage.setItem('mode-watcher-mode', 'light');
      localStorage.setItem('mode-watcher-theme', 'sepia');
    });
  }
}

// Exercise the shipped frontend without opening native dialogs or reading/writing
// the user's Tauri database. Keep IPC mocks here, never in production components.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const timestamp = '2026-01-01T00:00:00Z';
      const bibliography = {
        metadata: {
          id: 'demo',
          title: 'Accessibility research',
          description: 'Local test bibliography',
          createdAt: timestamp,
          updatedAt: timestamp,
          storageKind: 'managed',
          contentHash: 'test-hash',
          filePath: '/test/demo.yaml',
        },
        data: {
          paper: {
            type: 'book',
            title: 'Accessible research',
            author: ['Gruber, Hans', '田中, 花子'],
            date: '2024',
            publisher: 'Example Press',
            url: 'https://example.org',
          },
        },
      };
      const project = {
        id: 'demo',
        title: 'Research project',
        description: 'Test project',
        bibliographyIds: ['demo'],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const rendered = {
        items: [
          {
            key: 'paper',
            language: 'en',
            text: 'Accessible research',
            html: '<i>Accessible research</i>. Example Press.',
            firstFieldHtml: null,
          },
        ],
        hangingIndent: true,
        secondFieldAlign: false,
        lineSpacing: 1,
        entrySpacing: 1,
      };
      Object.assign(window, {
        __TAURI_INTERNALS__: {
          invoke: async (command: string, args?: { citations?: unknown[] }) => {
            switch (command) {
              case 'get_settings':
                return null;
              case 'list_bibliographies':
                return [bibliography];
              case 'get_bibliography':
                return bibliography;
              case 'list_projects':
                return [project];
              case 'list_system_fonts':
                return ['Arial', 'Times New Roman'];
              case 'list_bundled_citation_styles':
                return [
                  { id: 'ieee', title: 'IEEE', names: ['ieee'] },
                  {
                    id: 'american-psychological-association',
                    title: 'APA Style 7th edition',
                    names: ['american-psychological-association', 'apa'],
                  },
                ];
              case 'list_recovery_snapshots':
              case 'list_entry_trash':
              case 'list_attachments':
                return [];
              case 'storage_info':
                return {
                  appDataDirectory: '/test',
                  managedBibliographiesDirectory: '/test/bibliographies',
                  recoveryDirectory: '/test/recovery',
                  databasePath: '/test/catalog.sqlite',
                };
              case 'render_bibliography':
                return rendered;
              case 'render_entry_preview':
                return {
                  language: 'en',
                  citations: (args?.citations ?? []).map(
                    () => '(Gruber, 2024)',
                  ),
                  bibliography: rendered,
                };
              case 'parse_import_content':
                return { data: bibliography.data, sourceFormat: 'yaml' };
              default:
                throw new Error(`Unmocked accessibility-test IPC: ${command}`);
            }
          },
        },
      });
    });
    await use(page);
  },
});
export { expect };

export async function audit(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'best-practice',
    ])
    .analyze();
  await test.info().attach('axe-results', {
    body: JSON.stringify(
      {
        url: page.url(),
        violations: results.violations,
        incomplete: results.incomplete,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(
    results.violations.map(({ id, description, nodes }) => ({
      id,
      description,
      nodes: nodes.map(({ target, failureSummary }) => ({
        target,
        failureSummary,
      })),
    })),
  ).toEqual([]);
}
