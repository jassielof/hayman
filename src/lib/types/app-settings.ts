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

export const FONT_PRESETS = {
  sans: [
    'IBM Plex Sans',
    'Inter',
    'system-ui',
    'Segoe UI',
    'Helvetica Neue',
    'Arial'
  ],
  serif: ['IBM Plex Serif', 'Georgia', 'Times New Roman', 'serif'],
  mono: ['IBM Plex Mono', 'Consolas', 'Menlo', 'monospace']
} as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: SETTINGS_ROW_ID,
  fonts: {
    sans: 'IBM Plex Sans',
    serif: 'IBM Plex Serif',
    mono: 'IBM Plex Mono'
  },
  citation: {
    defaultStyle: 'ieee'
  }
};
