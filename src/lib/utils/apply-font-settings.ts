import type { AppFontSettings } from '$lib/types/app-settings';

export function applyFontSettings(fonts: AppFontSettings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--font-sans', `'${fonts.sans}', sans-serif`);
  root.style.setProperty('--font-serif', `'${fonts.serif}', serif`);
  root.style.setProperty('--font-mono', `'${fonts.mono}', monospace`);
}
