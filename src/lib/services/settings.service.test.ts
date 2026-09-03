import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '$lib/types/app-settings';

const state = vi.hoisted(() => ({ value: null as AppSettings | null }));

vi.mock('$lib/services/tauri-backend', () => ({
  tauriBackend: {
    getSettings: vi.fn(async () => structuredClone(state.value)),
    setSettings: vi.fn(async (value: AppSettings) => {
      state.value = structuredClone(value);
    }),
  },
}));

import { SettingsService } from '$lib/services/settings.service';
import { DEFAULT_APP_SETTINGS, SETTINGS_ROW_ID } from '$lib/types/app-settings';

describe('SettingsService', () => {
  beforeEach(() => {
    state.value = null;
  });

  it('returns defaults when no row exists', async () => {
    expect(await SettingsService.get()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('persists and merges updates', async () => {
    await SettingsService.update({
      fonts: { sans: 'Inter', serif: 'Georgia', mono: 'Consolas' },
      citation: { defaultStyle: 'apa' },
    });
    expect(state.value?.fonts.sans).toBe('Inter');
    expect(state.value?.citation.defaultStyle).toBe('apa');
    expect(state.value?.id).toBe(SETTINGS_ROW_ID);
  });

  it('clears custom CSL', async () => {
    await SettingsService.update({
      citation: {
        defaultStyle: 'custom',
        customCslName: 'ieee.csl',
        customCsl: '<style></style>',
        entryPreviewBody: '#cite(key)',
      },
    });
    await SettingsService.clearCustomCsl();
    const settings = await SettingsService.get();
    expect(settings.citation.customCslName).toBeUndefined();
    expect(settings.citation.customCsl).toBeUndefined();
    expect(settings.citation.defaultStyle).toBe('ieee');
    expect(settings.citation.entryPreviewBody).toBe('#cite(key)');
  });
});
