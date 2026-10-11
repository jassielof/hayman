import type { AppFontSettings } from '#lib/types/app-settings.js';
import { tauriBackend } from '#lib/services/tauri-backend.js';

const CSS_GENERICS = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
]);

export const SYSTEM_FONT_OPTIONS = {
  sans: ['system-ui', 'ui-sans-serif', 'sans-serif'],
  serif: ['ui-serif', 'serif'],
  mono: ['ui-monospace', 'monospace'],
  math: ['math'],
} as const;

/** Always shipped locally, independent of which faces have loaded so far. */
export const BUNDLED_FONT_OPTIONS = {
  sans: ['inter-variable'],
  serif: ['alegreya', 'alegreya-sc', 'stix-two'],
  mono: ['google-sans-code'],
  math: ['stix-two-math'],
} as const;

const FONT_FAMILY_LABELS: Record<string, string> = {
  'inter-variable': 'Inter',
  alegreya: 'Alegreya',
  'alegreya-sc': 'Alegreya Small Caps',
  'stix-two': 'STIX Two Text',
  'stix-two-math': 'STIX Two Math',
  'google-sans-code': 'Google Sans Code',
};

export function formatFontFamilyLabel(family: string): string {
  return FONT_FAMILY_LABELS[family] ?? family;
}

export type FontCategory = keyof AppFontSettings;

export function isCssGenericFamily(name: string): boolean {
  return CSS_GENERICS.has(name.trim().toLowerCase());
}

export function toFontStack(family: string, fallback: string): string {
  const trimmed = family.trim();
  if (!trimmed) return fallback;
  if (isCssGenericFamily(trimmed)) {
    return trimmed === fallback ? trimmed : `${trimmed}, ${fallback}`;
  }
  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}', ${fallback}`;
}

export interface ListAvailableFontsOptions {
  current?: Partial<AppFontSettings>;
  /** Inject discovery for tests and non-native hosts. No font files leave the OS. */
  discover?: () => Promise<string[]>;
  onDiscoveryError?: (error: unknown) => void;
}

export async function listAvailableFonts(
  options: ListAvailableFontsOptions = {},
): Promise<Record<FontCategory, string[]>> {
  let installed: string[] = [];
  try {
    installed = await (options.discover ?? tauriBackend.listSystemFonts)();
  } catch (error) {
    options.onDiscoveryError?.(error);
  }
  // Do not classify installed families by script or appearance.
  const merge = (category: FontCategory) => {
    const names = [
      ...BUNDLED_FONT_OPTIONS[category],
      ...SYSTEM_FONT_OPTIONS[category],
      ...installed,
      options.current?.[category] ?? '',
    ];
    const unique = new Map<string, string>();
    for (const name of names) {
      const family = name.trim();
      if (family && !unique.has(family.toLowerCase()))
        unique.set(family.toLowerCase(), family);
    }
    return [...unique.values()].sort((a, b) => a.localeCompare(b));
  };
  return {
    sans: merge('sans'),
    serif: merge('serif'),
    mono: merge('mono'),
    math: merge('math'),
  };
}
