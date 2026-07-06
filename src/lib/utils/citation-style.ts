import type { AppSettings } from '$lib/types/app-settings';

export const CUSTOM_CSL_STYLE = 'custom' as const;

export interface ResolvedCitationStyle {
  /** Value passed to Typst `#bibliography(..., style: ...)` */
  typstStyle: string;
  /** Human-readable label for the UI */
  label: string;
  useCustomCsl: boolean;
}

export function resolveCitationStyle(
  styleInput: string,
  settings: AppSettings
): ResolvedCitationStyle {
  const trimmed = styleInput.trim();

  if (
    trimmed === CUSTOM_CSL_STYLE &&
    settings.citation.customCsl &&
    settings.citation.customCsl.trim().length > 0
  ) {
    return {
      typstStyle: 'custom',
      label: settings.citation.customCslName ?? 'Custom CSL',
      useCustomCsl: true
    };
  }

  const style = trimmed || settings.citation.defaultStyle || 'ieee';
  return {
    typstStyle: style,
    label: style,
    useCustomCsl: false
  };
}
