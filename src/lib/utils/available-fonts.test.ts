import { describe, expect, it } from 'vitest';
import {
  BUNDLED_FONT_OPTIONS,
  SYSTEM_FONT_OPTIONS,
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

  it('lists bundled app fonts explicitly', () => {
    expect(BUNDLED_FONT_OPTIONS.sans).toContain('IBM Plex Sans');
    expect(BUNDLED_FONT_OPTIONS.serif).toContain('IBM Plex Serif');
    expect(BUNDLED_FONT_OPTIONS.mono).toContain('IBM Plex Mono');
  });

  it('always includes portable system stacks', () => {
    expect(SYSTEM_FONT_OPTIONS.sans).toContain('system-ui');
    expect(SYSTEM_FONT_OPTIONS.serif).toContain('serif');
    expect(SYSTEM_FONT_OPTIONS.mono).toContain('monospace');
  });
});
