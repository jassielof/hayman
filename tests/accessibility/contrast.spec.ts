import { test, expect, THEMES, prepareTheme } from './fixtures';

for (const theme of THEMES) {
  test(`semantic palette meets AA contrast in ${theme}`, async ({ page }) => {
    await prepareTheme(page, theme);
    await page.goto('/settings');
    await expect(
      page.getByRole('button', { name: 'Save settings' }),
    ).toBeEnabled();
    const results = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const color = (name: string) =>
        root.getPropertyValue(`--color-${name}`).trim();
      const pixel = (...layers: string[]) => {
        ctx.clearRect(0, 0, 1, 1);
        for (const layer of layers) {
          ctx.fillStyle = layer;
          ctx.fillRect(0, 0, 1, 1);
        }
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      // WCAG relative luminance in sRGB; do not round ratios before comparison.
      const luminance = (rgb: number[]) =>
        rgb
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a: number[], b: number[]) => {
        const x = luminance(a),
          y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      const checks: { name: string; ratio: number; minimum: number }[] = [];
      const check = (
        foreground: string,
        background: string,
        surface = 'background',
        opacity = 100,
        minimum = 4.5,
      ) => {
        const base = color(surface);
        const fill = `color-mix(in srgb, ${color(background)} ${opacity}%, transparent)`;
        checks.push({
          name: `${foreground} on ${background}/${opacity} over ${surface}`,
          minimum,
          ratio: ratio(pixel(base, fill, color(foreground)), pixel(base, fill)),
        });
      };
      // Small/normal text is held to 4.5:1 regardless of its weight. Only actual
      // >=24px or >=18.667px bold text qualifies for the 3:1 large-text exception.
      for (const surface of [
        'background',
        'card',
        'muted',
        'secondary',
        'accent',
      ]) {
        check('foreground', surface);
        check('muted-foreground', surface);
        check('primary', surface);
        check('destructive', surface);
      }
      for (const variant of [
        'primary',
        'destructive',
        'secondary',
        'accent',
        'warning',
      ]) {
        check(`${variant}-foreground`, variant);
      }
      for (const surface of ['background', 'card']) {
        for (const variant of ['primary', 'destructive']) {
          check(`${variant}-foreground`, variant, surface, 90);
        }
        check('destructive', 'destructive', surface, 10);
        check('warning-text', 'warning', surface, 10);
        check('warning-text', 'warning', surface, 15);
        check('input', surface, 'background', 100, 3);
        check('ring', surface, 'background', 100, 3);
      }
      const code = document.createElement('pre');
      code.className = 'code-block';
      const span = document.createElement('span');
      code.append(span);
      document.body.append(code);
      for (const token of [
        'keyword',
        'title',
        'attr',
        'string',
        'built_in',
        'comment',
        'name',
        'section',
        'bullet',
        'emphasis',
        'strong',
        'addition',
        'deletion',
      ]) {
        span.className = `hljs hljs-${token}`;
        span.textContent = 'Syntax';
        const style = getComputedStyle(span);
        const background = pixel(color('muted'), style.backgroundColor);
        checks.push({
          name: `YAML syntax ${token}`,
          minimum: 4.5,
          ratio: ratio(
            pixel(color('muted'), style.backgroundColor, style.color),
            background,
          ),
        });
      }
      code.remove();
      return {
        checks,
        blackWhite: ratio([0, 0, 0], [255, 255, 255]),
        grayWhite: ratio([119, 119, 119], [255, 255, 255]),
      };
    });
    expect(results.blackWhite).toBe(21);
    expect(results.grayWhite).toBeLessThan(4.5);
    expect(
      results.checks.filter((check) => check.ratio < check.minimum),
    ).toEqual([]);
  });
}
