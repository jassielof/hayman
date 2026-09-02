export const SETTINGS_ROW_ID = 'app' as const;

export interface AppFontSettings {
  sans: string;
  serif: string;
  mono: string;
}

export interface AppCitationSettings {
  defaultStyle: string;
  customCslName?: string;
  customCsl?: string;
}

export interface AppSettings {
  id: typeof SETTINGS_ROW_ID;
  fonts: AppFontSettings;
  citation: AppCitationSettings;
}

/** Portable defaults — never assume a proprietary or app-bundled face is present. */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: SETTINGS_ROW_ID,
  fonts: {
    sans: 'system-ui',
    serif: 'serif',
    mono: 'monospace',
  },
  citation: {
    defaultStyle: 'ieee',
  },
};
