import { describe, expect, it } from 'vitest';
import {
  CUSTOM_CSL_STYLE,
  describeSettingsDefaultCitation,
  resolveCitationStyle,
  resolvePreviewCitationStyle,
  resolveSettingsDefaultCitationStyle,
  usesCustomCslDefault,
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
        customCsl: '<style></style>',
      },
    };

    const resolved = resolveCitationStyle(CUSTOM_CSL_STYLE, settings);
    expect(resolved.typstStyle).toBe('custom');
    expect(resolved.label).toBe('my-style.csl');
    expect(resolved.useCustomCsl).toBe(true);
  });

  it('uses built-in when custom selected but no CSL uploaded', () => {
    const resolved = resolveCitationStyle(
      CUSTOM_CSL_STYLE,
      DEFAULT_APP_SETTINGS,
    );
    expect(resolved.typstStyle).toBe(CUSTOM_CSL_STYLE);
    expect(resolved.useCustomCsl).toBe(false);
  });
});

describe('settings default citation style', () => {
  it('uses uploaded CSL only when defaultStyle is custom', () => {
    const settings = {
      ...DEFAULT_APP_SETTINGS,
      citation: {
        defaultStyle: 'ieee',
        customCslName: 'apa.csl',
        customCsl: '<style></style>',
      },
    };

    expect(usesCustomCslDefault(settings)).toBe(false);
    expect(resolveSettingsDefaultCitationStyle(settings).typstStyle).toBe(
      'ieee',
    );
    expect(describeSettingsDefaultCitation(settings)).toBe('ieee');
  });

  it('uses custom CSL when configured as default', () => {
    const settings = {
      ...DEFAULT_APP_SETTINGS,
      citation: {
        defaultStyle: CUSTOM_CSL_STYLE,
        customCslName: 'apa.csl',
        customCsl: '<style></style>',
      },
    };

    expect(usesCustomCslDefault(settings)).toBe(true);
    expect(resolveSettingsDefaultCitationStyle(settings)).toEqual({
      typstStyle: 'custom',
      label: 'apa.csl',
      useCustomCsl: true,
    });
  });
});

describe('resolvePreviewCitationStyle', () => {
  const settings = {
    ...DEFAULT_APP_SETTINGS,
    citation: {
      defaultStyle: CUSTOM_CSL_STYLE,
      customCslName: 'apa.csl',
      customCsl: '<style></style>',
    },
  };

  it('uses settings default when requested', () => {
    const resolved = resolvePreviewCitationStyle(settings, {
      useSettingsDefault: true,
    });
    expect(resolved.useCustomCsl).toBe(true);
    expect(resolved.label).toBe('apa.csl');
  });

  it('allows bundled override', () => {
    const resolved = resolvePreviewCitationStyle(settings, {
      useSettingsDefault: false,
      overrideKind: 'bundled',
      bundledStyle: 'ieee',
    });
    expect(resolved.typstStyle).toBe('ieee');
    expect(resolved.useCustomCsl).toBe(false);
  });

  it('allows custom CSL override', () => {
    const resolved = resolvePreviewCitationStyle(settings, {
      useSettingsDefault: false,
      overrideKind: 'custom-csl',
    });
    expect(resolved.useCustomCsl).toBe(true);
  });
});
