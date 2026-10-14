import { setMode, setTheme } from 'mode-watcher';

export const THEME_MODES = ['system', 'light', 'dark', 'sepia'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export function nextThemeMode(current: ThemeMode): ThemeMode {
  const index = THEME_MODES.indexOf(current);
  return THEME_MODES[(index + 1) % THEME_MODES.length];
}

export function themeModeLabel(mode: ThemeMode): string {
  if (mode === 'system') return 'System theme';
  if (mode === 'sepia') return 'Sepia theme';
  return mode === 'light' ? 'Light theme' : 'Dark theme';
}

export function getThemeMode(
  mode: Exclude<ThemeMode, 'sepia'>,
  theme?: string,
): ThemeMode {
  return theme === 'sepia' ? 'sepia' : mode;
}

/** Sepia is deliberately light-only, not an OS-dependent dark variant.
 * Use mode-watcher's existing persistence and pre-paint initialization. */
export function applyThemeMode(mode: ThemeMode): void {
  setTheme(mode === 'sepia' ? 'sepia' : '');
  setMode(mode === 'sepia' ? 'light' : mode);
}
