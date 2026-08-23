import { describe, expect, it } from 'vitest';
import {
  ALWAYS_AVAILABLE_FONTS,
  classifyFontFamily,
  isCssGenericFamily,
  toFontStack
} from '$lib/utils/available-fonts';

describe('available-fonts', () => {
  it('recognizes CSS generic families', () => {
    expect(isCssGenericFamily('system-ui')).toBe(true);
    expect(isCssGenericFamily('monospace')).toBe(true);
    expect(isCssGenericFamily('IBM Plex Sans')).toBe(false);
  });

  it('builds stacks without quoting generics', () => {
    expect(toFontStack('system-ui', 'sans-serif')).toBe(
      'system-ui, sans-serif'
    );
    expect(toFontStack('IBM Plex Sans', 'sans-serif')).toBe(
      "'IBM Plex Sans', sans-serif"
    );
    expect(toFontStack('monospace', 'monospace')).toBe('monospace');
  });

  it('classifies common family names', () => {
    expect(classifyFontFamily('IBM Plex Sans')).toBe('sans');
    expect(classifyFontFamily('IBM Plex Serif')).toBe('serif');
    expect(classifyFontFamily('IBM Plex Mono')).toBe('mono');
    expect(classifyFontFamily('Cascadia Code')).toBe('mono');
    expect(classifyFontFamily('Times New Roman')).toBe('serif');
  });

  it('always includes portable generics', () => {
    expect(ALWAYS_AVAILABLE_FONTS.sans).toContain('system-ui');
    expect(ALWAYS_AVAILABLE_FONTS.serif).toContain('serif');
    expect(ALWAYS_AVAILABLE_FONTS.mono).toContain('monospace');
  });
});
