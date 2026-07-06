import { loadFonts } from '@myriaddreamin/typst.ts';
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';

const TYST_DEV_ASSETS =
  'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/';

/**
 * Additional fonts not included in the default `cjk` asset bundle.
 * Keep this list small — each OTF can be 10MB+ and blocks the first preview.
 */
const EXTRA_TYST_FONT_URLS = [
  `${TYST_DEV_ASSETS}NotoSerifCJKjp-Regular.otf`,
  `${TYST_DEV_ASSETS}NotoSerifCJKtc-Regular.otf`,
  `${TYST_DEV_ASSETS}NotoSerifCJKkr-Regular.otf`,
  `${TYST_DEV_ASSETS}IBMPlexSans-Regular.ttf`,
  `${TYST_DEV_ASSETS}IBMPlexSerif-Regular.ttf`
] as const;

export function getTypstFontProviders() {
  return [
    TypstSnippet.fetchPackageRegistry(),
    {
      key: 'access-model',
      forRoles: ['compiler'] as const,
      provides: [
        loadFonts([...EXTRA_TYST_FONT_URLS], { assets: ['text', 'cjk'] })
      ]
    }
  ];
}
