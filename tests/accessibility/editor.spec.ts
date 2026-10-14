import { test, expect, audit } from './fixtures';

test('field search reveals and focuses a field using only the keyboard', async ({
  page,
}) => {
  await page.goto('/bibliography/demo/entry');
  const picker = page.getByRole('combobox', { name: 'Search and add a field' });
  await picker.fill('archive location');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await audit(page);
  await picker.press('ArrowDown');
  await picker.press('Enter');
  await expect(
    page.getByRole('textbox', { name: 'Archive Location', exact: true }),
  ).toBeFocused();
});

test('YAML populates hidden fields, title options and parents without loss', async ({
  page,
}) => {
  await page.goto('/bibliography/demo/entry');
  await page.getByRole('button', { name: 'YAML', exact: true }).click();
  const source = page.getByRole('textbox', { name: 'Hayagriva entry YAML' });
  await source.fill(
    'type: book\ntitle:\n  value: Main title\n  short: Short title\n  verbatim: false\narchive-location: Cabinet 3\nparent:\n  type: periodical\n  title: Parent journal\n',
  );
  await page.getByRole('button', { name: 'Guided form', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Title', exact: true }).first(),
  ).toHaveValue('Main title');
  await expect(
    page
      .getByRole('textbox', { name: 'Short form of Title', exact: true })
      .first(),
  ).toHaveValue('Short title');
  await expect(
    page.getByRole('textbox', { name: 'Archive Location', exact: true }),
  ).toHaveValue('Cabinet 3');
  await page.getByText('Title options', { exact: true }).first().click();
  await page.getByRole('button', { name: 'YAML', exact: true }).click();
  await expect(source).toHaveValue(/short: Short title/);
  await expect(source).toHaveValue(/verbatim: false/);
  await expect(source).toHaveValue(/title: Parent journal/);
});

test('validation navigation opens a collapsed structured-name section', async ({
  page,
}) => {
  await page.goto('/bibliography/demo/entry/paper/edit');
  const authors = page.getByRole('group', { name: 'Author', exact: true });
  await authors
    .getByRole('checkbox', { name: 'Separate family and given names' })
    .first()
    .check();
  const family = authors.getByRole('textbox', {
    name: 'Family Name',
    exact: true,
  });
  await family.fill('');
  await page
    .locator('summary')
    .filter({ has: page.getByRole('heading', { name: 'People', exact: true }) })
    .click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(family).toBeVisible();
  await expect(family).toBeFocused();
});
