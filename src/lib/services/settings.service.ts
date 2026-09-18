import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_ROW_ID,
  type AppSettings,
} from '$lib/types/app-settings';
import { applyFontSettings } from '$lib/utils/apply-font-settings';
import { tauriBackend } from '$lib/services/tauri-backend';
import { ALL_ENTRY_FIELDS } from '$lib/validators/entry-field-visibility';

export class SettingsService {
  static async get(): Promise<AppSettings> {
    const stored = await tauriBackend.getSettings();
    if (!stored) return structuredClone(DEFAULT_APP_SETTINGS);
    const legacyEditor = stored.editor as
      | (Partial<AppSettings['editor']> & {
          fieldMode?: 'recommended' | 'all';
        })
      | undefined;
    const migratedEditor = {
      ...DEFAULT_APP_SETTINGS.editor,
      ...legacyEditor,
      visibleFields:
        legacyEditor?.visibleFields ??
        (legacyEditor?.fieldMode === 'all'
          ? [...ALL_ENTRY_FIELDS]
          : [...DEFAULT_APP_SETTINGS.editor.visibleFields]),
      fieldsByType:
        legacyEditor?.fieldMode === 'all'
          ? {}
          : {
              ...DEFAULT_APP_SETTINGS.editor.fieldsByType,
              ...legacyEditor?.fieldsByType,
            },
    };
    delete (migratedEditor as { fieldMode?: string }).fieldMode;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...stored,
      fonts: { ...DEFAULT_APP_SETTINGS.fonts, ...stored.fonts },
      citation: { ...DEFAULT_APP_SETTINGS.citation, ...stored.citation },
      editor: migratedEditor,
      library: { ...DEFAULT_APP_SETTINGS.library, ...stored.library },
    };
  }

  static async update(changes: Partial<Omit<AppSettings, 'id'>>) {
    const current = await this.get();
    const next: AppSettings = {
      ...current,
      ...changes,
      id: SETTINGS_ROW_ID,
      fonts: { ...current.fonts, ...changes.fonts },
      citation: { ...current.citation, ...changes.citation },
      editor: { ...current.editor, ...changes.editor },
      library: { ...current.library, ...changes.library },
    };
    await tauriBackend.setSettings(next);
    applyFontSettings(next.fonts);
    return next;
  }

  static async applyToDocument() {
    const settings = await this.get();
    applyFontSettings(settings.fonts);
  }

  static async clearCustomCsl() {
    const current = await this.get();
    const nextDefaultStyle =
      current.citation.defaultStyle === 'custom'
        ? 'ieee'
        : current.citation.defaultStyle;
    const next: AppSettings = {
      ...current,
      id: SETTINGS_ROW_ID,
      citation: {
        defaultStyle: nextDefaultStyle,
        entryPreviewBody: current.citation.entryPreviewBody,
      },
      editor: current.editor,
      library: current.library,
    };
    await tauriBackend.setSettings(next);
    applyFontSettings(next.fonts);
    return next;
  }
}
