import { afterEach, expect, it } from 'vitest';
import { applyFontSettings } from './apply-font-settings.js';

afterEach(() => document.documentElement.removeAttribute('style'));

it('keeps system fallbacks for every font category, including local Unicode family names', () => {
  applyFontSettings({
    sans: '游ゴシック',
    serif: 'Noto Naskh Arabic',
    mono: 'Missing Font',
    math: 'STIX Two Math',
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
  applyFontSettings({
    sans: 'system-ui',
    serif: 'serif',
    mono: 'monospace',
    math: 'math',
  });
  const style = document.documentElement.style;
  expect(style.getPropertyValue('--font-sans')).toBe('system-ui, sans-serif');
  expect(style.getPropertyValue('--font-serif')).toBe('serif');
  expect(style.getPropertyValue('--font-mono')).toBe('monospace');
});
it('follows the selected serif for small caps, using the separate Alegreya face', () => {
  for (const [serif, smallCaps] of [
    ['alegreya', 'alegreya-sc'],
    ['stix-two', 'stix-two'],
    ['Georgia', 'Georgia'],
  ]) {
    applyFontSettings({
      sans: 'inter-variable',
      serif,
      mono: 'google-sans-code',
      math: 'stix-two-math',
    });
    expect(
      document.documentElement.style.getPropertyValue('--font-serif-sc'),
    ).toBe(`'${smallCaps}', serif`);
    expect(document.documentElement.style.getPropertyValue('--font-math')).toBe(
      "'stix-two-math', math",
    );
  }
});
