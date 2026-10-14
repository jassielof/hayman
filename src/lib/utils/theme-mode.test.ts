import { describe, expect, it } from 'vitest';
import {
  getThemeMode,
  nextThemeMode,
  themeModeLabel,
  applyThemeMode,
} from './theme-mode';
import { theme, userPrefersMode } from 'mode-watcher';

describe('theme modes', () => {
  it('cycles through system, light, dark and sepia', () => {
    expect(nextThemeMode('system')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('sepia');
    expect(nextThemeMode('sepia')).toBe('system');
  });

  it('labels the system preference explicitly', () => {
    expect(themeModeLabel('system')).toBe('System theme');
  });

  it('keeps sepia light and clears it when returning to system', () => {
    applyThemeMode('sepia');
    expect(userPrefersMode.current).toBe('light');
    expect(getThemeMode(userPrefersMode.current, theme.current)).toBe('sepia');
    expect(themeModeLabel('sepia')).toBe('Sepia theme');
    applyThemeMode('system');
    expect(userPrefersMode.current).toBe('system');
    expect(getThemeMode(userPrefersMode.current, theme.current)).toBe('system');
  });
});
