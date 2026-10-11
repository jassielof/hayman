import type { AppFontSettings } from '#lib/types/app-settings.js';
import { toFontStack } from '#lib/utils/available-fonts.js';

export function applyFontSettings(fonts: AppFontSettings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--font-sans', toFontStack(fonts.sans, 'sans-serif'));
  root.style.setProperty('--font-serif', toFontStack(fonts.serif, 'serif'));
  root.style.setProperty(
    '--font-serif-sc',
    toFontStack(
      fonts.serif === 'alegreya' ? 'alegreya-sc' : fonts.serif,
      'serif',
    ),
  );
  root.style.setProperty('--font-mono', toFontStack(fonts.mono, 'monospace'));
  root.style.setProperty('--font-math', toFontStack(fonts.math, 'math'));
}
