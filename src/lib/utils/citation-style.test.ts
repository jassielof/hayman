import { describe, expect, it } from 'vitest';
import {
  CUSTOM_CSL_STYLE,
  resolveCitationStyle
} from '$lib/utils/citation-style';
import { DEFAULT_APP_SETTINGS } from '$lib/types/app-settings';

describe('resolveCitationStyle', () => {
  it('uses built-in style name', () => {
    const resolved = resolveCitationStyle('ieee', DEFAULT_APP_SETTINGS);
    expect(resolved.typstStyle).toBe('ieee');
    expect(resolved.useCustomCsl).toBe(false);
  });

  it('falls back to default when input is empty', () => {
    const resolved = resolveCitationStyle('  ', DEFAULT_APP_SETTINGS);
    expect(resolved.typstStyle).toBe('ieee');
  });

  it('maps custom style when CSL text exists', () => {
    const settings = {
      ...DEFAULT_APP_SETTINGS,
      citation: {
        ...DEFAULT_APP_SETTINGS.citation,
        defaultStyle: CUSTOM_CSL_STYLE,
        customCslName: 'my-style.csl',
        customCsl: '<style></style>'
      }
    };

    const resolved = resolveCitationStyle(CUSTOM_CSL_STYLE, settings);
    expect(resolved.typstStyle).toBe('custom');
    expect(resolved.label).toBe('my-style.csl');
    expect(resolved.useCustomCsl).toBe(true);
  });

  it('uses built-in when custom selected but no CSL uploaded', () => {
    const resolved = resolveCitationStyle(
      CUSTOM_CSL_STYLE,
      DEFAULT_APP_SETTINGS
    );
    expect(resolved.typstStyle).toBe(CUSTOM_CSL_STYLE);
    expect(resolved.useCustomCsl).toBe(false);
  });
});
