import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '#lib/types/app-settings.js';

const state = vi.hoisted(() => ({ value: null as AppSettings | null }));

vi.mock('#lib/services/tauri-backend.js', () => ({
  tauriBackend: {
    getSettings: vi.fn(async () => structuredClone(state.value)),
    setSettings: vi.fn(async (value: AppSettings) => {
      state.value = structuredClone(value);
    }),
  },
}));

import { SettingsService } from '#lib/services/settings.service.js';
import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_ROW_ID,
} from '#lib/types/app-settings.js';

describe('SettingsService', () => {
  beforeEach(() => {
    state.value = null;
  });

  it('returns defaults when no row exists', async () => {
    expect(await SettingsService.get()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('persists and merges updates', async () => {
    await SettingsService.update({
      fonts: {
        sans: 'Inter',
        serif: 'Georgia',
        mono: 'Consolas',
        math: 'stix-two-math',
      },
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
        previewTheme: 'sepia',
        customCslName: 'ieee.csl',
        customCsl: '<style></style>',
        entryPreviewTemplate: '{{normal}}',
      },
    });
    await SettingsService.clearCustomCsl();
    const settings = await SettingsService.get();
    expect(settings.citation.customCslName).toBeUndefined();
    expect(settings.citation.customCsl).toBeUndefined();
    expect(settings.citation.defaultStyle).toBe('ieee');
    expect(settings.citation.entryPreviewTemplate).toBe('{{normal}}');
    expect(settings.citation.previewTheme).toBe('sepia');
  });

  it('defaults legacy preview appearance to the app and persists independent paper themes', async () => {
    state.value = {
      ...structuredClone(DEFAULT_APP_SETTINGS),
      citation: { defaultStyle: 'ieee' },
    };
    expect((await SettingsService.get()).citation.previewTheme).toBe('app');
    for (const previewTheme of ['white', 'sepia', 'app'] as const) {
      await SettingsService.update({
        citation: { defaultStyle: 'ieee', previewTheme },
      });
      expect((await SettingsService.get()).citation.previewTheme).toBe(
        previewTheme,
      );
      expect(document.documentElement.dataset.previewTheme).toBe(previewTheme);
    }
    await SettingsService.applyToDocument();
    expect(document.documentElement.dataset.previewTheme).toBe('app');
  });

  it('drops legacy executable templates without treating them as plain text', async () => {
    state.value = {
      ...structuredClone(DEFAULT_APP_SETTINGS),
      citation: { defaultStyle: 'apa', entryPreviewBody: '#cite(key)' },
    } as unknown as AppSettings;
    const settings = await SettingsService.get();
    expect(settings.citation).not.toHaveProperty('entryPreviewBody');
    expect(settings.citation.entryPreviewTemplate).toBeUndefined();
    expect(settings.citation.defaultStyle).toBe('apa');
    await SettingsService.update({ library: { density: 'compact' } });
    expect(state.value?.citation).not.toHaveProperty('entryPreviewBody');
  });
});
it('migrates removed defaults and missing math without losing local choices', async () => {
  state.value = {
    ...structuredClone(DEFAULT_APP_SETTINGS),
    fonts: {
      sans: '游ゴシック',
      serif: 'adobe-garamond-pro',
      mono: 'courier-std',
    },
  } as AppSettings;
  expect((await SettingsService.get()).fonts).toEqual({
    ...DEFAULT_APP_SETTINGS.fonts,
    sans: '游ゴシック',
  });
  await SettingsService.update({ library: { density: 'compact' } });
  expect(state.value?.fonts.math).toBe('stix-two-math');
  expect(state.value?.fonts.serif).toBe('alegreya');
});
