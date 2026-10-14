import { test, expect, audit } from './fixtures';

test('outlines load lazily and switching files refreshes route state', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const native = (
      window as unknown as {
        __TAURI_INTERNALS__: {
          invoke: (command: string, args?: { id?: string }) => Promise<unknown>;
        };
      }
    ).__TAURI_INTERNALS__;
    const original = native.invoke;
    const loads: string[] = [];
    Object.assign(window, { outlineLoads: loads });
    native.invoke = async (command, args) => {
      const result = await original(command, args);
      if (command === 'list_bibliography_metadata') {
        const metadata = result as { id: string; title: string }[];
        return [
          ...metadata,
          { ...metadata[0], id: 'second', title: 'Second bibliography' },
        ];
      }
      if (command === 'get_bibliography') {
        loads.push(args?.id ?? '');
        if (args?.id === 'second') {
          const bibliography = result as {
            metadata: { id: string; title: string };
            data: unknown;
          };
          return {
            ...bibliography,
            metadata: {
              ...bibliography.metadata,
              id: 'second',
              title: 'Second bibliography',
            },
            data: { other: { type: 'book', title: 'Second reference' } },
          };
        }
      }
      return result;
    };
  });
  await page.goto('/');
  const sidebar = page.getByRole('complementary', { name: 'Workspace' });
  await expect(
    sidebar.getByRole('link', { name: 'Second bibliography', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { outlineLoads: string[] }).outlineLoads,
    ),
  ).toEqual([]);
  await sidebar
    .getByRole('link', { name: 'Accessibility research', exact: true })
    .click();
  await expect(page.locator('main')).toContainText('Accessible research');
  await sidebar
    .getByRole('link', { name: 'Second bibliography', exact: true })
    .click();
  await expect(page.locator('header')).toContainText('Second bibliography');
  await expect(page.locator('main')).toContainText('Second reference');
  await expect(page.locator('main')).not.toContainText('Accessible research');
});

test('header shows bibliography and full entry context without a second visible title', async ({
  page,
}) => {
  await page.goto('/bibliography/demo/entry/paper');
  const header = page.locator('header');
  await expect(
    header.getByRole('navigation', { name: 'Breadcrumb' }),
  ).toContainText('Accessibility research');
  await expect(header).toContainText('Accessible research');
  await expect(page).toHaveTitle('Accessible research · Hayman');
  await expect(page.locator('main h1')).toHaveClass('sr-only');
});

test('sidebar expands references, navigates and remembers a collapsed desktop sidebar', async ({
  page,
}) => {
  await page.goto('/');
  const sidebar = page.getByRole('complementary', { name: 'Workspace' });
  await expect(sidebar).toBeVisible();
  await sidebar
    .getByRole('button', { name: 'Show references in Accessibility research' })
    .click();
  await sidebar.getByRole('link', { name: /Accessible research/ }).click();
  await expect(page).toHaveURL(/\/entry\/paper$/);
  await expect(
    sidebar.getByRole('link', { name: /Accessible research/ }),
  ).toHaveAttribute('aria-current', 'page');
  await page
    .getByRole('button', { name: 'Close library sidebar', exact: true })
    .click();
  await expect(sidebar).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Open library sidebar', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
});

test('mobile sidebar traps focus, restores focus and reflows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/settings');
  const trigger = page.getByRole('button', {
    name: 'Open library sidebar',
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Library navigation' });
  await expect(dialog).toBeVisible();
  await audit(page);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    await expect
      .poll(
        () =>
          dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        {
          message: `Focus must remain inside the mobile drawer after Tab ${i + 1}`,
        },
      )
      .toBe(true);
  }
  await dialog.getByRole('button', { name: 'Close library sidebar' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('link', { name: 'Accessibility research', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close library sidebar' }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
