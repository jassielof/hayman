import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsService } from '$lib/services/settings.service';
import { db } from '$lib/db';
import { DEFAULT_APP_SETTINGS, SETTINGS_ROW_ID } from '$lib/types/app-settings';

describe('SettingsService', () => {
  beforeEach(async () => {
    await db.settings.clear();
  });

  it('returns defaults when no row exists', async () => {
    const settings = await SettingsService.get();
    expect(settings).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('persists and merges updates', async () => {
    await SettingsService.update({
      fonts: { sans: 'Inter', serif: 'Georgia', mono: 'Consolas' },
      citation: { defaultStyle: 'apa' },
    });

    const stored = await db.settings.get(SETTINGS_ROW_ID);
    expect(stored?.fonts.sans).toBe('Inter');
    expect(stored?.citation.defaultStyle).toBe('apa');
    expect(stored?.id).toBe(SETTINGS_ROW_ID);
  });

  it('clears custom CSL', async () => {
    await SettingsService.update({
      citation: {
        defaultStyle: 'custom',
        customCslName: 'ieee.csl',
        customCsl: '<style></style>',
      },
    });

    await SettingsService.clearCustomCsl();
    const settings = await SettingsService.get();
    expect(settings.citation.customCslName).toBeUndefined();
    expect(settings.citation.customCsl).toBeUndefined();
    expect(settings.citation.defaultStyle).toBe('ieee');
  });
});
