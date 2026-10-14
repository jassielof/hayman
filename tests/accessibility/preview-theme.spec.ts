import { test, expect, audit, THEMES, prepareTheme } from './fixtures';

for (const appTheme of THEMES) {
  for (const previewTheme of ['app', 'white', 'sepia'] as const) {
    test(`${appTheme} app with ${previewTheme} preview paper`, async ({
      page,
    }) => {
      // This workflow saves, reloads and audits two distinct rendered views.
      test.setTimeout(60_000);
      await prepareTheme(page, appTheme);
      await page.addInitScript(() => {
        const native = (
          window as unknown as {
            __TAURI_INTERNALS__: {
              invoke: (
                command: string,
                args?: { settings?: unknown },
              ) => Promise<unknown>;
            };
          }
        ).__TAURI_INTERNALS__;
        const invoke = native.invoke;
        native.invoke = async (command, args) => {
          if (command === 'get_settings')
            return JSON.parse(
              sessionStorage.getItem('test-settings') ?? 'null',
            );
          if (command === 'set_settings') {
            sessionStorage.setItem(
              'test-settings',
              JSON.stringify(args?.settings),
            );
            return;
          }
          return invoke(command, args);
        };
      });
      await page.goto('/settings');
      const option = page.getByRole('combobox', {
        name: 'Citation and bibliography preview',
        exact: true,
      });
      await expect(
        page.getByRole('button', { name: 'Save settings' }),
      ).toBeEnabled({ timeout: 15_000 });
      await expect(option).toHaveValue('app');
      await option.selectOption(previewTheme);
      await page.getByRole('button', { name: 'Save settings' }).click();
      await expect(
        page.getByText('Settings saved.', { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(option).toHaveValue(previewTheme);
      await page.goto('/bibliography/demo/entry/paper');
      await page.getByRole('tab', { name: 'Citation preview' }).click();
      await expect(
        page.getByRole('region', { name: 'Citation examples' }),
      ).toContainText('Gruber');
      const surface = page.locator('.citation-surface');
      await expect(page.locator('html')).toHaveAttribute(
        'data-preview-theme',
        previewTheme,
      );
      const colors = await surface.evaluate((element) => {
        const style = getComputedStyle(element);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        function rgb(color: string) {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        }
        function lum(color: string) {
          return rgb(color)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            )
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        }
        function ratio(a: string, b: string) {
          const x = lum(a),
            y = lum(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        }
        const background = style.backgroundColor;
        return {
          background: rgb(background),
          text: ratio(style.color, background),
          ink: ratio(
            getComputedStyle(element.querySelector('ol')!).color,
            background,
          ),
          muted: ratio(
            style.getPropertyValue('--color-muted-foreground'),
            background,
          ),
          link: ratio(style.getPropertyValue('--color-primary'), background),
          focus: ratio(style.getPropertyValue('--color-ring'), background),
          border: ratio(style.borderTopColor, background),
          borderWidth: style.borderTopWidth,
        };
      });
      for (const name of ['text', 'ink', 'muted', 'link'] as const)
        expect(colors[name], name).toBeGreaterThanOrEqual(4.5);
      expect(colors.focus).toBeGreaterThanOrEqual(3);
      expect(colors.border).toBeGreaterThanOrEqual(3);
      expect(colors.borderWidth).toBe('2px');
      if (previewTheme === 'white')
        expect(colors.background).toEqual([255, 255, 255]);
      if (previewTheme === 'sepia')
        expect(colors.background).toEqual([251, 244, 228]);
      await expect(page.locator('html')).toHaveClass(
        appTheme === 'dark' ? /dark/ : /^(?!.*\bdark\b)/,
      );
      await audit(page);
      await page.goto('/bibliography/demo');
      await page.getByRole('tab', { name: 'Rendered bibliography' }).click();
      await expect(
        page.locator('.citation-surface [data-entry-key="paper"]'),
      ).toBeVisible();
      await expect(page.locator('.citation-surface')).toHaveCSS(
        'border-top-width',
        '2px',
      );
      await audit(page);
    });
  }
}
