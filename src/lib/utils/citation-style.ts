import type { AppSettings } from '$lib/types/app-settings';

export const CUSTOM_CSL_STYLE = 'custom' as const;

export type CitationDefaultKind = 'bundled' | 'custom-csl';

export interface ResolvedCitationStyle {
  /** Value passed to Typst `#bibliography(..., style: ...)` */
  typstStyle: string;
  /** Human-readable label for the UI */
  label: string;
  useCustomCsl: boolean;
}

export function hasCustomCsl(settings: AppSettings): boolean {
  return Boolean(settings.citation.customCsl?.trim());
}

/** Whether settings use the uploaded CSL as the default preview style. */
export function usesCustomCslDefault(settings: AppSettings): boolean {
  return (
    settings.citation.defaultStyle === CUSTOM_CSL_STYLE &&
    hasCustomCsl(settings)
  );
}

export function bundledStyleFromSettings(settings: AppSettings): string {
  const style = settings.citation.defaultStyle.trim();
  if (!style || style === CUSTOM_CSL_STYLE) return 'ieee';
  return style;
}

export function describeSettingsDefaultCitation(settings: AppSettings): string {
  if (usesCustomCslDefault(settings)) {
    return settings.citation.customCslName ?? 'Custom CSL';
  }
  return bundledStyleFromSettings(settings);
}

/** Resolve the citation style saved in app settings. */
export function resolveSettingsDefaultCitationStyle(
  settings: AppSettings,
): ResolvedCitationStyle {
  if (usesCustomCslDefault(settings)) {
    return {
      typstStyle: CUSTOM_CSL_STYLE,
      label: settings.citation.customCslName ?? 'Custom CSL',
      useCustomCsl: true,
    };
  }

  const style = bundledStyleFromSettings(settings);
  return {
    typstStyle: style,
    label: style,
    useCustomCsl: false,
  };
}

export function resolveCitationStyle(
  styleInput: string,
  settings: AppSettings,
): ResolvedCitationStyle {
  const trimmed = styleInput.trim();

  if (trimmed === CUSTOM_CSL_STYLE && hasCustomCsl(settings)) {
    return {
      typstStyle: CUSTOM_CSL_STYLE,
      label: settings.citation.customCslName ?? 'Custom CSL',
      useCustomCsl: true,
    };
  }

  const style = trimmed || bundledStyleFromSettings(settings);
  return {
    typstStyle: style,
    label: style,
    useCustomCsl: false,
  };
}

export function resolvePreviewCitationStyle(
  settings: AppSettings,
  options: {
    useSettingsDefault: boolean;
    overrideKind?: 'bundled' | 'custom-csl';
    bundledStyle?: string;
  },
): ResolvedCitationStyle {
  if (options.useSettingsDefault) {
    return resolveSettingsDefaultCitationStyle(settings);
  }

  if (options.overrideKind === 'custom-csl') {
    return resolveCitationStyle(CUSTOM_CSL_STYLE, settings);
  }

  return resolveCitationStyle(options.bundledStyle ?? 'ieee', settings);
}
