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

/** Adobe Fonts defaults with portable fallbacks applied by `applyFontSettings`. */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: SETTINGS_ROW_ID,
  fonts: {
    sans: 'inter-variable',
    serif: 'adobe-garamond-pro',
    mono: 'courier-std',
  },
  citation: {
    defaultStyle: 'ieee',
  },
};
