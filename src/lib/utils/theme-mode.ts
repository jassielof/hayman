export const THEME_MODES = ['system', 'light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export function nextThemeMode(current: ThemeMode): ThemeMode {
  const index = THEME_MODES.indexOf(current);
  return THEME_MODES[(index + 1) % THEME_MODES.length];
}

export function themeModeLabel(mode: ThemeMode): string {
  if (mode === 'system') return 'System theme';
  return mode === 'light' ? 'Light theme' : 'Dark theme';
}
