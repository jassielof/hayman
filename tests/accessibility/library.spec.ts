import { test, expect, audit } from './fixtures';

test('home separates projects, linked files and managed files in that order', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const native = (
      window as unknown as {
        __TAURI_INTERNALS__: {
          invoke: (command: string, args?: unknown) => Promise<unknown>;
        };
      }
    ).__TAURI_INTERNALS__;
    const invoke = native.invoke;
    native.invoke = async (command, args) => {
      const result = await invoke(command, args);
      if (command !== 'list_bibliographies') return result;
      const files = result as {
        metadata: { id: string; title: string; storageKind: string };
      }[];
      const linked = structuredClone(files[0]);
      linked.metadata.id = 'linked';
      linked.metadata.title = 'Repository bibliography';
      linked.metadata.storageKind = 'linked';
      return [...files, linked];
    };
  });
  await page.goto('/');
  const linked = page.getByRole('region', {
    name: 'Locally linked bibliographies',
  });
  const managed = page.getByRole('region', {
    name: 'Hayman-managed bibliographies',
  });
  await expect(linked).toContainText('Repository bibliography');
  await expect(managed).toContainText('Accessibility research');
  await expect(
    linked.getByRole('button', {
      name: 'Unlink bibliography Repository bibliography',
    }),
  ).toBeVisible();
  expect(await page.locator('main h2').allTextContents()).toEqual([
    'Projects',
    'Locally linked bibliographies',
    'Hayman-managed bibliographies',
  ]);
  await audit(page);
});
