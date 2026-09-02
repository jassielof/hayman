import { loadFonts } from '@myriaddreamin/typst.ts';
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';

/**
 * Typst WASM cannot inherit CSS or system fonts from the browser: it needs the
 * font bytes in its own font database. The maintained `text` bundle covers the
 * normal document families, while `cjk` contributes a single Noto CJK face for
 * missing glyphs. Typst only selects it when the requested family cannot render
 * a character, so it remains a fallback rather than overriding the user's font.
 *
 * Do not add every localized Noto variant here. Those multi-megabyte fonts are
 * downloaded before the compiler's first build and previously made every user
 * pay for Japanese, Traditional Chinese, and Korean fonts simultaneously.
 */
export function getTypstFontProviders() {
  return [
    TypstSnippet.fetchPackageRegistry(),
    {
      key: 'access-model',
      forRoles: ['compiler'] as const,
      provides: [loadFonts([], { assets: ['text', 'cjk'] })],
    },
  ];
}
