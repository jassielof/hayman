import { afterEach, expect, it } from 'vitest';
import { applyFontSettings } from './apply-font-settings.js';

afterEach(() => document.documentElement.removeAttribute('style'));

it('keeps system fallbacks for every font category, including local Unicode family names', () => {
  applyFontSettings({
    sans: '游ゴシック',
    serif: 'Noto Naskh Arabic',
    mono: 'Missing Font',
  });
  const style = document.documentElement.style;
  expect(style.getPropertyValue('--font-sans')).toBe(
    "'游ゴシック', sans-serif",
  );
  expect(style.getPropertyValue('--font-serif')).toBe(
    "'Noto Naskh Arabic', serif",
  );
  expect(style.getPropertyValue('--font-mono')).toBe(
    "'Missing Font', monospace",
  );
});

it('allows system-only typography without any downloadable font', () => {
  applyFontSettings({ sans: 'system-ui', serif: 'serif', mono: 'monospace' });
  const style = document.documentElement.style;
  expect(style.getPropertyValue('--font-sans')).toBe('system-ui, sans-serif');
  expect(style.getPropertyValue('--font-serif')).toBe('serif');
  expect(style.getPropertyValue('--font-mono')).toBe('monospace');
});
