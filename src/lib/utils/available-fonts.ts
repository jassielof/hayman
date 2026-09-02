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
  'ui-rounded',
]);

/** CSS generic / system stacks — always safe on every OS. */
export const SYSTEM_FONT_OPTIONS = {
  sans: ['system-ui', 'ui-sans-serif', 'sans-serif'],
  serif: ['ui-serif', 'serif'],
  mono: ['ui-monospace', 'monospace'],
} as const;

/** Webfonts provided by the app's IBM packages and Adobe Fonts kit. */
export const BUNDLED_FONT_OPTIONS = {
  sans: [
    'inter-variable',
    'philosopher',
    'rosario',
    'alegreya-sans',
    'alegreya-sans-sc',
    'IBM Plex Sans',
  ],
  serif: [
    'adobe-garamond-pro',
    'merriweather',
    'alegreya',
    'alegreya-sc',
    'IBM Plex Serif',
  ],
  mono: ['courier-std', 'source-code-variable', 'IBM Plex Mono'],
} as const;

const FONT_FAMILY_LABELS: Record<string, string> = {
  'adobe-garamond-pro': 'Adobe Garamond Pro',
  merriweather: 'Merriweather',
  philosopher: 'Philosopher',
  rosario: 'Rosario',
  alegreya: 'Alegreya',
  'alegreya-sc': 'Alegreya SC',
  'alegreya-sans': 'Alegreya Sans',
  'alegreya-sans-sc': 'Alegreya Sans SC',
  'inter-variable': 'Inter Variable',
  'courier-std': 'Courier',
  'source-code-variable': 'Source Code Variable',
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

function normalizeFamilyName(name: string): string {
  return name.replace(/^['"]+|['"]+$/g, '').trim();
}

function uniqueSorted(names: Iterable<string>): string[] {
  return [...new Set([...names].map(normalizeFamilyName).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
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
  loaded: Set<string>,
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
  options: ListAvailableFontsOptions = {},
): Promise<Record<FontCategory, string[]>> {
  const documentRef = options.documentRef ?? document;
  if (typeof documentRef === 'undefined') {
    return {
      sans: [...SYSTEM_FONT_OPTIONS.sans],
      serif: [...SYSTEM_FONT_OPTIONS.serif],
      mono: [...SYSTEM_FONT_OPTIONS.mono],
    };
  }

  await documentRef.fonts.ready;
  const loaded = loadedFamilies(documentRef);

  const merge = (category: FontCategory) => {
    const names = new Set<string>([
      ...SYSTEM_FONT_OPTIONS[category],
      ...bundledForCategory(category, loaded),
    ]);
    const current = options.current?.[category];
    if (current?.trim()) names.add(normalizeFamilyName(current));
    return uniqueSorted(names);
  };

  return {
    sans: merge('sans'),
    serif: merge('serif'),
    mono: merge('mono'),
  };
}
