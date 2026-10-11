export const SETTINGS_ROW_ID = 'app' as const;

export interface AppFontSettings {
  sans: string;
  serif: string;
  mono: string;
  math: string;
}

export interface AppCitationSettings {
  defaultStyle: string;
  customCslName?: string;
  customCsl?: string;
  entryPreviewTemplate?: string;
}

export interface AppSettings {
  id: typeof SETTINGS_ROW_ID;
  fonts: AppFontSettings;
  citation: AppCitationSettings;
  editor: {
    defaultMode: 'guided' | 'yaml';
    visibleFields: EntryFieldKey[];
    fieldsByType: Partial<Record<EntryTypeName, EntryFieldKey[]>>;
  };
  library: {
    density: 'comfortable' | 'compact';
  };
}

/** Local fonts with system glyph fallbacks; no network access is required. */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: SETTINGS_ROW_ID,
  fonts: {
    sans: 'inter-variable',
    serif: 'alegreya',
    mono: 'google-sans-code',
    math: 'stix-two-math',
  },
  citation: {
    defaultStyle: 'ieee',
  },
  editor: {
    defaultMode: 'guided',
    visibleFields: [...DEFAULT_ENTRY_FIELDS],
    fieldsByType: structuredClone(DEFAULT_FIELDS_BY_TYPE),
  },
  library: {
    density: 'comfortable',
  },
};
import type { EntryTypeName } from '@hayman/hayagriva-schema';
import type { EntryFieldKey } from '#lib/validators/entry-field-visibility.js';
import {
  DEFAULT_ENTRY_FIELDS,
  DEFAULT_FIELDS_BY_TYPE,
} from '#lib/validators/entry-field-visibility.js';
