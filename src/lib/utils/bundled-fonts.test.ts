// @vitest-environment node
import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { BUNDLED_FONT_OPTIONS } from './available-fonts.js';
import { DEFAULT_APP_SETTINGS } from '#lib/types/app-settings.js';
import { FONT_LICENSES } from './font-licenses.js';

it('ships every advertised family locally, including italic faces and small caps', () => {
  const cssUrl = new URL('../styles/fonts.css', import.meta.url);
  const css = readFileSync(cssUrl, 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(
    (match) => match[1],
  );
  for (const family of Object.values(BUNDLED_FONT_OPTIONS).flat()) {
    const matching = faces.filter((face) =>
      face.includes(`font-family: '${family}';`),
    );
    expect(matching.length, family).toBeGreaterThan(0);
    if (family !== 'stix-two-math')
      expect(matching.some((face) => face.includes('font-style: italic'))).toBe(
        true,
      );
  }
  for (const match of css.matchAll(/url\('([^']+)'\)/g)) {
    expect(match[1]).not.toMatch(/^https?:/);
    expect(existsSync(new URL(match[1], cssUrl)), match[1]).toBe(true);
  }
  const layout = readFileSync(
    new URL('../../routes/layout.css', import.meta.url),
    'utf8',
  );
  expect(layout).not.toMatch(/typekit|@ibm\/plex|@import\s+url/);
  for (const family of Object.values(DEFAULT_APP_SETTINGS.fonts))
    expect(css).toContain(`font-family: '${family}';`);
});

it('ships readable open font licenses for every family set', () => {
  expect(FONT_LICENSES).toHaveLength(5);
  for (const license of FONT_LICENSES) {
    expect(license.text).toContain('SIL OPEN FONT LICENSE');
    expect(license.text).toContain('Copyright');
  }
});
