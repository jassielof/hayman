import { describe, expect, it } from 'vitest';
import { nextThemeMode, themeModeLabel } from './theme-mode';

describe('theme modes', () => {
  it('cycles through system, light, and dark', () => {
    expect(nextThemeMode('system')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('system');
  });

  it('labels the system preference explicitly', () => {
    expect(themeModeLabel('system')).toBe('System theme');
  });
});
