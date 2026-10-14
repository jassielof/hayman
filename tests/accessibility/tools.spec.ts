import { test, expect, audit } from './fixtures';

test('offline conversion stages a reviewed import without saving automatically', async ({
  page,
}) => {
  await page.goto('/tools');
  const convert = page.getByRole('button', { name: 'Convert', exact: true });
  await expect(convert).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Bibliography source', exact: true })
    .fill('@book{paper, title={Accessible research}, year={2024}}');
  await convert.click();
  const result = page.getByRole('textbox', {
    name: 'Converted Hayagriva YAML',
  });
  await expect(result).toHaveValue(/Accessible research/);
  await page
    .getByRole('combobox', { name: 'Import into bibliography' })
    .selectOption('demo');
  await page.getByRole('button', { name: 'Review import' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import references' });
  await expect(
    dialog.getByRole('textbox', { name: 'Paste bibliography data' }),
  ).toHaveValue(/Accessible research/);
  await dialog.getByRole('button', { name: 'Add source', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Added 1 entry');
  await audit(page);
});

test('identifier lookup requires fresh explicit consent and only stages metadata', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      __TAURI_INTERNALS__: {
        invoke: (command: string, args?: unknown) => Promise<unknown>;
      };
      lookups: unknown[];
    };
    state.lookups = [];
    const invoke = state.__TAURI_INTERNALS__.invoke;
    state.__TAURI_INTERNALS__.invoke = (command, args) => {
      if (command === 'lookup_identifier') state.lookups.push(args);
      return invoke(command, args);
    };
  });
  await page.goto('/tools');
  const lookup = page.getByRole('button', { name: 'Look up', exact: true });
  await page
    .getByRole('textbox', { name: 'Identifier', exact: true })
    .fill('10.1000/example');
  await expect(lookup).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { lookups: unknown[] }).lookups,
    ),
  ).toEqual([]);
  await page
    .getByRole('checkbox', { name: 'Allow this lookup to contact Crossref' })
    .check();
  await lookup.click();
  await expect(
    page.getByRole('textbox', { name: 'Converted Hayagriva YAML' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { lookups: unknown[] }).lookups,
    ),
  ).toEqual([
    { kind: 'doi', identifier: '10.1000/example', allowNetwork: true },
  ]);
  await expect(lookup).toBeDisabled();
  await page
    .getByRole('checkbox', { name: 'Allow this lookup to contact Crossref' })
    .check();
  await page
    .getByRole('textbox', { name: 'Identifier', exact: true })
    .fill('10.1000/another');
  await expect(lookup).toBeDisabled();
  await audit(page);
  await expect(
    page.getByRole('textbox', { name: 'Converted Hayagriva YAML' }),
  ).toHaveCount(0);
});
