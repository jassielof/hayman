import { test, expect, audit, THEMES, prepareTheme } from './fixtures';

const routes = [
  '/',
  '/settings',
  '/library',
  '/bibliography/new',
  '/project/new',
  '/project/demo',
  '/bibliography/demo',
  '/bibliography/demo/edit',
  '/bibliography/demo/entry',
  '/bibliography/demo/entry/paper',
  '/bibliography/demo/entry/paper/edit',
];

for (const theme of THEMES) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await prepareTheme(page, theme);
    });
    for (const route of routes) {
      test(`WCAG AA ${route}`, async ({ page }) => {
        await page.goto(route);
        await expect(
          page.locator('h1, form > fieldset > legend').first(),
        ).toBeVisible();
        if (theme === 'dark')
          await expect(page.locator('html')).toHaveClass(/dark/);
        else await expect(page.locator('html')).not.toHaveClass(/dark/);
        if (theme === 'sepia')
          await expect(page.locator('html')).toHaveAttribute(
            'data-theme',
            'sepia',
          );
        await expect(
          page.getByText('Unmocked accessibility-test IPC:', { exact: false }),
        ).toHaveCount(0);
        await audit(page);
      });
    }
    test('searchable styles preserve page position and keyboard selection', async ({
      page,
    }) => {
      await page.goto('/settings');
      const trigger = page.getByRole('button', {
        name: 'Show bundled citation styles',
      });
      await expect(trigger).toBeEnabled();
      await trigger.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.scrollY);
      await trigger.click();
      await expect(page.getByRole('listbox')).toBeVisible();
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
      await audit(page);
      const input = page.getByRole('combobox', {
        name: 'Bundled citation style',
      });
      await expect(input).toBeFocused();
      await input.fill('apa');
      await input.press('ArrowDown');
      await input.press('Enter');
      await expect(input).toHaveValue('APA Style 7th edition');
      await expect(page.getByRole('listbox')).toHaveCount(0);
    });
    test('entry editor retains accessible names with multiple people and detailed fields', async ({
      page,
    }) => {
      await page.goto('/bibliography/demo/entry/paper/edit');
      await expect(
        page.getByRole('textbox', { name: 'Full Name', exact: true }).first(),
      ).toBeVisible();
      const authors = page.getByRole('group', { name: 'Author', exact: true });
      await authors
        .getByRole('checkbox', { name: 'Detailed', exact: true })
        .first()
        .check();
      await expect(
        authors.getByRole('textbox', { name: 'Family Name', exact: true }),
      ).toBeVisible();
      await audit(page);
    });
    test('invalid YAML is announced and associated with its editor', async ({
      page,
    }) => {
      await page.goto('/bibliography/demo/entry/paper/edit');
      await page.getByRole('button', { name: 'YAML', exact: true }).click();
      const source = page.getByRole('textbox', {
        name: 'Hayagriva entry YAML',
      });
      await source.fill('title: [');
      await expect(source).toHaveAttribute('aria-invalid', 'true');
      const alert = page.getByRole('alert');
      await expect(alert).toBeVisible();
      await expect(source).toHaveAttribute(
        'aria-describedby',
        (await alert.getAttribute('id'))!,
      );
      await audit(page);
    });

    test('export dialog traps focus, closes with Escape and restores the trigger', async ({
      page,
    }) => {
      await page.goto('/');
      const trigger = page.getByRole('button', {
        name: 'Export backup of bibliographies',
      });
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await audit(page);
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        expect(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        ).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test('import dialog traps focus, announces duplicate rows and returns focus', async ({
      page,
    }) => {
      await page.goto('/bibliography/demo/entry');
      const trigger = page.getByRole('button', {
        name: 'Import several references',
      });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Import references' });
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole('textbox', { name: 'Paste bibliography data' })
        .fill('paper:\n  type: book\n  title: Accessible research');
      await dialog
        .getByRole('button', { name: 'Add source', exact: true })
        .click();
      await expect(dialog.getByRole('status')).toContainText('Added 1 entry');
      await audit(page);
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
        expect(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        ).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test('preview tabs support keyboard navigation and accessible citation output', async ({
      page,
    }) => {
      await page.goto('/bibliography/demo/entry/paper');
      const code = page.getByRole('tab', { name: 'Code preview' });
      await code.focus();
      await code.press('ArrowRight');
      await expect(
        page.getByRole('tab', { name: 'Citation preview' }),
      ).toBeFocused();
      await expect(
        page.getByRole('tabpanel', { name: 'Citation preview' }),
      ).toBeVisible();
      await expect(
        page.getByText('(Gruber, 2024)', { exact: true }).first(),
      ).toBeVisible();
      await audit(page);
    });

    test('keyboard skip link and focus indicator are visible', async ({
      page,
      browserName,
    }) => {
      await page.goto('/settings');
      await expect(
        page.getByRole('button', { name: 'Save settings' }),
      ).toBeEnabled();
      const skip = page.getByRole('link', { name: 'Skip to main content' });
      // WebKit's Tab navigation through links depends on host preferences.
      // Check first-Tab discovery in Chromium and activation/focus in both.
      if (browserName === 'webkit') await skip.focus();
      else await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      const focusStyle = await skip.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outline: style.outlineStyle,
          width: parseFloat(style.outlineWidth),
        };
      });
      expect(focusStyle.outline).toBe('solid');
      expect(focusStyle.width).toBeGreaterThanOrEqual(2);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
    });

    test('empty catalog remains accessible', async ({ page }) => {
      await page.addInitScript(() => {
        const native = (
          window as unknown as {
            __TAURI_INTERNALS__: {
              invoke: (command: string) => Promise<unknown>;
            };
          }
        ).__TAURI_INTERNALS__;
        const original = native.invoke;
        native.invoke = async (command) =>
          command === 'list_bibliographies' ? [] : original(command);
      });
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: 'No bibliographies found' }),
      ).toBeVisible();
      await audit(page);
    });
  });
}
