import { db } from '$lib/db';
import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_ROW_ID,
  type AppSettings
} from '$lib/types/app-settings';
import { applyFontSettings } from '$lib/utils/apply-font-settings';

export class SettingsService {
  static async get(): Promise<AppSettings> {
    const stored = await db.settings.get(SETTINGS_ROW_ID);
    return stored ?? { ...DEFAULT_APP_SETTINGS };
  }

  static async update(changes: Partial<Omit<AppSettings, 'id'>>) {
    const current = await this.get();
    const next: AppSettings = {
      ...current,
      ...changes,
      id: SETTINGS_ROW_ID,
      fonts: { ...current.fonts, ...changes.fonts },
      citation: { ...current.citation, ...changes.citation }
    };
    await db.settings.put(next);
    applyFontSettings(next.fonts);
    return next;
  }

  static async applyToDocument() {
    const settings = await this.get();
    applyFontSettings(settings.fonts);
  }

  static async clearCustomCsl() {
    const current = await this.get();
    const next: AppSettings = {
      ...current,
      id: SETTINGS_ROW_ID,
      citation: { defaultStyle: current.citation.defaultStyle }
    };
    await db.settings.put(next);
    applyFontSettings(next.fonts);
    return next;
  }
}
