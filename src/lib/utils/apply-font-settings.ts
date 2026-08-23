import type { AppFontSettings } from '$lib/types/app-settings';
import { toFontStack } from '$lib/utils/available-fonts';

export function applyFontSettings(fonts: AppFontSettings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--font-sans', toFontStack(fonts.sans, 'sans-serif'));
  root.style.setProperty('--font-serif', toFontStack(fonts.serif, 'serif'));
  root.style.setProperty('--font-mono', toFontStack(fonts.mono, 'monospace'));
}
