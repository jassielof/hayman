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
  entryPreviewBody?: string;
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
import type { EntryFieldKey } from '$lib/validators/entry-field-visibility';
import {
  DEFAULT_ENTRY_FIELDS,
  DEFAULT_FIELDS_BY_TYPE,
} from '$lib/validators/entry-field-visibility';
