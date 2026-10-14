import { test, expect } from './fixtures';

test('canceling sidebar navigation retains the drawer and unsaved entry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/bibliography/demo/entry');
  await page
    .getByRole('textbox', { name: 'ID', exact: true })
    .fill('unsaved-reference');
  await page
    .getByRole('button', { name: 'Open library sidebar', exact: true })
    .click();
  const drawer = page.getByRole('dialog', { name: 'Library navigation' });
  page.once('dialog', (dialog) => dialog.dismiss());
  await drawer
    .getByRole('link', { name: 'Bibliographies', exact: true })
    .click();
  await expect(page).toHaveURL(/\/bibliography\/demo\/entry$/);
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('textbox', { name: 'ID', exact: true }),
  ).toHaveValue('unsaved-reference');
  await page
    .getByRole('button', { name: 'Open library sidebar', exact: true })
    .click();
  page.once('dialog', (dialog) => dialog.accept());
  await drawer
    .getByRole('link', { name: 'Bibliographies', exact: true })
    .click();
  await expect(page).toHaveURL('/');
  await expect(drawer).toHaveCount(0);
});
