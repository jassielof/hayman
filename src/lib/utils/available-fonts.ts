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
  'emoji',
  'math',
  'fangsong'
]);

/** Generic / UI stacks that should always be offered. */
export const ALWAYS_AVAILABLE_FONTS = {
  sans: ['system-ui', 'ui-sans-serif', 'sans-serif'],
  serif: ['ui-serif', 'serif'],
  mono: ['ui-monospace', 'monospace']
} as const;

/**
 * Common installed faces to probe. Only fonts that resolve on this device
 * are offered — Arial/Consolas/etc. will not appear on OSes that lack them.
 */
export const FONT_PROBE_CANDIDATES = {
  sans: [
    'Segoe UI',
    'Helvetica Neue',
    'Helvetica',
    'Arial',
    'Ubuntu',
    'Cantarell',
    'Noto Sans',
    'Roboto',
    'Inter',
    'SF Pro Text',
    'Hiragino Sans'
  ],
  serif: [
    'Georgia',
    'Times New Roman',
    'Times',
    'Palatino',
    'Palatino Linotype',
    'Noto Serif',
    'Iowan Old Style',
    'Hiragino Mincho ProN',
    'Libertinus Serif'
  ],
  mono: [
    'Consolas',
    'Menlo',
    'Monaco',
    'Courier New',
    'Courier',
    'Ubuntu Mono',
    'Noto Sans Mono',
    'SF Mono',
    'Cascadia Code',
    'Cascadia Mono',
    'DejaVu Sans Mono'
  ]
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

/** Classify a family name into sans / serif / mono when possible. */
export function classifyFontFamily(family: string): FontCategory | null {
  const name = normalizeFamilyName(family);
  if (!name) return null;

  const lower = name.toLowerCase();

  if (
    lower.includes('mono') ||
    lower.includes('console') ||
    lower.includes('code') ||
    lower.includes('courier') ||
    lower.includes('menlo') ||
    lower.includes('monaco') ||
    lower.includes('consolas') ||
    lower.includes('cascadia')
  ) {
    return 'mono';
  }

  if (
    lower.includes('serif') ||
    lower.includes('times') ||
    lower.includes('georgia') ||
    lower.includes('palatino') ||
    lower.includes('mincho') ||
    lower.includes('libertinus') ||
    lower.includes('roman')
  ) {
    // Avoid matching "sans-serif" / "IBM Plex Sans" as serif
    if (lower.includes('sans')) return 'sans';
    return 'serif';
  }

  if (
    lower.includes('sans') ||
    lower === 'system-ui' ||
    lower.startsWith('ui-sans') ||
    lower.includes('helvetica') ||
    lower.includes('arial') ||
    lower.includes('segoe') ||
    lower.includes('roboto') ||
    lower.includes('inter') ||
    lower.includes('ubuntu') ||
    lower.includes('cantarell') ||
    lower.includes('hiragino sans')
  ) {
    return 'sans';
  }

  return null;
}

function measureWidth(ctx: CanvasRenderingContext2D, font: string): number {
  ctx.font = font;
  return ctx.measureText('mmmmmmmmmmlli@.Ww').width;
}

/**
 * Detect whether a named face is installed / loaded by comparing canvas text
 * metrics against a baseline fallback. Imperfect but works without permissions.
 */
export function isFontAvailable(
  family: string,
  documentRef: Document = document
): boolean {
  if (typeof documentRef === 'undefined') return false;
  if (isCssGenericFamily(family)) return true;

  const canvas = documentRef.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const size = '72px';
  const baselines = [`${size} monospace`, `${size} serif`, `${size} sans-serif`];
  const candidate = `${size} '${normalizeFamilyName(family).replace(/'/g, "\\'")}', monospace`;

  const widths = baselines.map((font) => measureWidth(ctx, font));
  const candidateWidth = measureWidth(ctx, candidate);

  // Available if it differs from at least one baseline stack
  return baselines.some((_, i) => Math.abs(candidateWidth - widths[i]!) > 0.5);
}

function familiesFromDocumentFonts(fontSet: FontFaceSet): string[] {
  const families = new Set<string>();
  for (const face of fontSet) {
    families.add(normalizeFamilyName(face.family));
  }
  return [...families];
}

function mergeCategory(
  always: readonly string[],
  probed: string[],
  loaded: string[],
  current?: string
): string[] {
  const names = new Set<string>([...always, ...probed, ...loaded]);
  if (current?.trim()) names.add(normalizeFamilyName(current));
  return uniqueSorted(names);
}

export interface ListAvailableFontsOptions {
  /** Keep the user's currently saved choices in the lists even if undetected. */
  current?: Partial<AppFontSettings>;
  documentRef?: Document;
}

/**
 * Build font pickers from:
 * 1. Always-safe CSS generics (system-ui, serif, …)
 * 2. Fonts loaded by the app (`@font-face` / `document.fonts`)
 * 3. Common OS faces that probe as available on this device
 */
export async function listAvailableFonts(
  options: ListAvailableFontsOptions = {}
): Promise<Record<FontCategory, string[]>> {
  const documentRef = options.documentRef ?? document;
  if (typeof documentRef === 'undefined') {
    return {
      sans: [...ALWAYS_AVAILABLE_FONTS.sans],
      serif: [...ALWAYS_AVAILABLE_FONTS.serif],
      mono: [...ALWAYS_AVAILABLE_FONTS.mono]
    };
  }

  await documentRef.fonts.ready;

  const loadedByCategory: Record<FontCategory, string[]> = {
    sans: [],
    serif: [],
    mono: []
  };

  for (const family of familiesFromDocumentFonts(documentRef.fonts)) {
    const category = classifyFontFamily(family);
    if (category) {
      loadedByCategory[category].push(family);
    } else {
      // Unknown faces are useful for UI text — offer under sans
      loadedByCategory.sans.push(family);
    }
  }

  const probed: Record<FontCategory, string[]> = {
    sans: FONT_PROBE_CANDIDATES.sans.filter((f) =>
      isFontAvailable(f, documentRef)
    ),
    serif: FONT_PROBE_CANDIDATES.serif.filter((f) =>
      isFontAvailable(f, documentRef)
    ),
    mono: FONT_PROBE_CANDIDATES.mono.filter((f) =>
      isFontAvailable(f, documentRef)
    )
  };

  return {
    sans: mergeCategory(
      ALWAYS_AVAILABLE_FONTS.sans,
      probed.sans,
      loadedByCategory.sans,
      options.current?.sans
    ),
    serif: mergeCategory(
      ALWAYS_AVAILABLE_FONTS.serif,
      probed.serif,
      loadedByCategory.serif,
      options.current?.serif
    ),
    mono: mergeCategory(
      ALWAYS_AVAILABLE_FONTS.mono,
      probed.mono,
      loadedByCategory.mono,
      options.current?.mono
    )
  };
}
