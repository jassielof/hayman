import { describe, expect, it, vi } from 'vitest';
import {
  BUNDLED_FONT_OPTIONS,
  SYSTEM_FONT_OPTIONS,
  formatFontFamilyLabel,
  isCssGenericFamily,
  toFontStack,
  listAvailableFonts,
} from '#lib/utils/available-fonts.js';

describe('available-fonts', () => {
  it('recognizes CSS generic families', () => {
    expect(isCssGenericFamily('system-ui')).toBe(true);
    expect(isCssGenericFamily('monospace')).toBe(true);
    expect(isCssGenericFamily('IBM Plex Sans')).toBe(false);
  });

  it('builds stacks without quoting generics', () => {
    expect(toFontStack('system-ui', 'sans-serif')).toBe(
      'system-ui, sans-serif',
    );
    expect(toFontStack('IBM Plex Sans', 'sans-serif')).toBe(
      "'IBM Plex Sans', sans-serif",
    );
    expect(toFontStack('monospace', 'monospace')).toBe('monospace');
  });

  it.each([
    ['Microsoft YaHei', 'sans-serif'],
    ['游ゴシック', 'sans-serif'],
    ['맑은 고딕', 'sans-serif'],
    ['Noto Naskh Arabic', 'serif'],
    ['Noto Sans Devanagari', 'sans-serif'],
    ['Missing Font', 'monospace'],
  ])(
    'keeps a generic fallback after the local family %s',
    (family, fallback) => {
      expect(toFontStack(family, fallback)).toBe(`'${family}', ${fallback}`);
    },
  );

  it('lists bundled app fonts explicitly', () => {
    expect(BUNDLED_FONT_OPTIONS.sans).toContain('inter-variable');

    expect(BUNDLED_FONT_OPTIONS.serif).toContain('alegreya');
    expect(BUNDLED_FONT_OPTIONS.serif).toContain('alegreya-sc');
    expect(BUNDLED_FONT_OPTIONS.mono).toContain('google-sans-code');
    expect(BUNDLED_FONT_OPTIONS.serif).toContain('stix-two');
    expect(BUNDLED_FONT_OPTIONS.math).toContain('stix-two-math');
  });

  it('shows readable labels for bundled family identifiers', () => {
    expect(formatFontFamilyLabel('inter-variable')).toBe('Inter');
    expect(formatFontFamilyLabel('google-sans-code')).toBe('Google Sans Code');
  });

  it('always includes portable system stacks', () => {
    expect(SYSTEM_FONT_OPTIONS.sans).toContain('system-ui');
    expect(SYSTEM_FONT_OPTIONS.serif).toContain('serif');
    expect(SYSTEM_FONT_OPTIONS.mono).toContain('monospace');
  });
});
it('merges Unicode installed fonts, bundled options and saved unavailable choices', async () => {
  const discover = vi
    .fn()
    .mockResolvedValue([' 游ゴシック ', 'Georgia', 'georgia', '']);
  const fonts = await listAvailableFonts({
    discover,
    current: { serif: 'Unavailable Font' },
  });
  expect(discover).toHaveBeenCalledOnce();
  for (const category of Object.values(fonts)) {
    expect(category).toContain('游ゴシック');
    expect(
      category.filter((family) => family.toLowerCase() === 'georgia'),
    ).toEqual(['Georgia']);
    expect(category).not.toContain('');
  }
  expect(fonts.serif).toContain('Unavailable Font');
  expect(fonts.serif).toContain('stix-two');
  expect(fonts.math).toContain('stix-two-math');
});

it('keeps offline choices usable and reports discovery failures', async () => {
  const error = new Error('Unavailable');
  const onDiscoveryError = vi.fn();
  const fonts = await listAvailableFonts({
    discover: () => Promise.reject(error),
    onDiscoveryError,
  });
  expect(onDiscoveryError).toHaveBeenCalledWith(error);
  expect(fonts.sans).toContain('inter-variable');
  expect(fonts.serif).toContain('serif');
  expect(fonts.mono).toContain('google-sans-code');
});
