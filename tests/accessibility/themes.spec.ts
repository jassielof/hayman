import { test, expect, audit } from './fixtures';

test('sepia persists, stays light and returns cleanly to system mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings');
  const select = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expect(select).toHaveValue('system');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await select.selectOption('sepia');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(
    page.getByRole('button', {
      name: 'Sepia theme. Change theme mode',
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(select).toHaveValue('sepia');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(select).toHaveValue('sepia');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await audit(page);
  // The toolbar cycles from Sepia back to the original System default.
  await page
    .getByRole('button', {
      name: 'Sepia theme. Change theme mode',
      exact: true,
    })
    .click();
  await expect(select).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', '');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
