import type { AppFontSettings } from '$lib/types/app-settings';

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
  'ui-rounded'
]);

/** CSS generic / system stacks — always safe on every OS. */
export const SYSTEM_FONT_OPTIONS = {
  sans: ['system-ui', 'ui-sans-serif', 'sans-serif'],
  serif: ['ui-serif', 'serif'],
  mono: ['ui-monospace', 'monospace']
} as const;

/** Webfonts bundled with the app (see layout.css imports). */
export const BUNDLED_FONT_OPTIONS = {
  sans: ['IBM Plex Sans', 'Source Sans 3'],
  serif: ['IBM Plex Serif', 'Source Serif 4'],
  mono: ['IBM Plex Mono', 'Source Code Pro']
} as const;

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
  const escaped = trimmed.replace(/'/g, "\\'");
  return `'${escaped}', ${fallback}`;
}

function normalizeFamilyName(name: string): string {
  return name.replace(/^['"]+|['"]+$/g, '').trim();
}

function uniqueSorted(names: Iterable<string>): string[] {
  return [...new Set([...names].map(normalizeFamilyName).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
}

function loadedFamilies(documentRef: Document): Set<string> {
  const families = new Set<string>();
  for (const face of documentRef.fonts) {
    families.add(normalizeFamilyName(face.family));
  }
  return families;
}

function bundledForCategory(
  category: FontCategory,
  loaded: Set<string>
): string[] {
  return BUNDLED_FONT_OPTIONS[category].filter((font) => loaded.has(font));
}

export interface ListAvailableFontsOptions {
  /** Keep the user's currently saved choices in the lists. */
  current?: Partial<AppFontSettings>;
  documentRef?: Document;
}

/**
 * Font pickers list only:
 * 1. Portable CSS system stacks
 * 2. App-bundled webfonts that are actually loaded
 * 3. The user's current saved choice (if any)
 */
export async function listAvailableFonts(
  options: ListAvailableFontsOptions = {}
): Promise<Record<FontCategory, string[]>> {
  const documentRef = options.documentRef ?? document;
  if (typeof documentRef === 'undefined') {
    return {
      sans: [...SYSTEM_FONT_OPTIONS.sans],
      serif: [...SYSTEM_FONT_OPTIONS.serif],
      mono: [...SYSTEM_FONT_OPTIONS.mono]
    };
  }

  await documentRef.fonts.ready;
  const loaded = loadedFamilies(documentRef);

  const merge = (category: FontCategory) => {
    const names = new Set<string>([
      ...SYSTEM_FONT_OPTIONS[category],
      ...bundledForCategory(category, loaded)
    ]);
    const current = options.current?.[category];
    if (current?.trim()) names.add(normalizeFamilyName(current));
    return uniqueSorted(names);
  };

  return {
    sans: merge('sans'),
    serif: merge('serif'),
    mono: merge('mono')
  };
}
