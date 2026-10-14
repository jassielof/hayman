import { test, expect, audit, prepareTheme } from './fixtures';

for (const theme of ['light', 'sepia'] as const) {
  for (const route of ['/settings', '/bibliography/demo/entry/paper/edit']) {
    test(`text resizing and spacing ${theme} ${route}`, async ({ page }) => {
      await prepareTheme(page, theme);
      await page.goto(route);
      await expect(page.locator('form')).toBeVisible();
      await page.addStyleTag({
        content: `
      html { font-size: 200% !important; }
      * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
      p { margin-bottom: 2em !important; }
    `,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(
        page
          .locator('form button[type="submit"], form button:not([type])')
          .last(),
      ).toBeVisible();
      await audit(page);
    });
    test(`reflows at 320 CSS pixels ${theme} ${route}`, async ({ page }) => {
      await prepareTheme(page, theme);
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(route);
      await expect(page.locator('form')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await audit(page);
    });
  }
}
