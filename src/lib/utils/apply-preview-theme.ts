import type { AppCitationSettings } from '#lib/types/app-settings.js';

/** Presentation only: never changes CSL, exported YAML or citation contents. */
export function applyPreviewTheme(theme: AppCitationSettings['previewTheme']) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.previewTheme =
    theme === 'white' || theme === 'sepia' ? theme : 'app';
}
