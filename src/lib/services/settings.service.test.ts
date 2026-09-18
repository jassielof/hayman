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

  it('migrates older settings by filling new editor and library defaults', async () => {
    state.value = {
      id: SETTINGS_ROW_ID,
      fonts: DEFAULT_APP_SETTINGS.fonts,
      citation: { defaultStyle: 'apa' },
    } as AppSettings;

    const settings = await SettingsService.get();

    expect(settings.editor).toEqual(DEFAULT_APP_SETTINGS.editor);
    expect(settings.library).toEqual(DEFAULT_APP_SETTINGS.library);
    expect(settings.citation.defaultStyle).toBe('apa');
  });

  it('migrates the legacy all-fields preference', async () => {
    state.value = {
      ...structuredClone(DEFAULT_APP_SETTINGS),
      editor: { defaultMode: 'guided', fieldMode: 'all' },
    } as unknown as AppSettings;

    const settings = await SettingsService.get();

    expect(settings.editor.visibleFields.length).toBeGreaterThan(20);
    expect(settings.editor.fieldsByType).toEqual({});
    expect(settings.editor).not.toHaveProperty('fieldMode');
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
