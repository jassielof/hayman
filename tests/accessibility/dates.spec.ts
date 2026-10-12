import { test, expect } from './fixtures';

for (const [locale, label] of [
  ['en-US', 'July 17, 2019'],
  ['es-ES', '17 de julio de 2019'],
  ['ja-JP', '2019年7月17日'],
] as const) {
  test.describe(locale, () => {
    test.use({ locale, timezoneId: 'America/Los_Angeles' });
    test('reference cards localize dates without a timezone shift', async ({
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
          if (command === 'get_bibliography') {
            (result as { data: { paper: { date: string } } }).data.paper.date =
              '2019-07-17';
          }
          return result;
        };
      });
      await page.goto('/bibliography/demo');
      await expect(page.getByTitle('2019-07-17', { exact: true })).toHaveText(
        label,
      );
      await expect(
        page.getByTitle('2019-07-17', { exact: true }),
      ).toHaveAttribute('lang', locale);
    });
  });
}
