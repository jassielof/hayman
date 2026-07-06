import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';

const TYST_DEV_ASSETS =
  'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/';

/** Extra script and UI-matching fonts beyond the default text/cjk/emoji bundles. */
export const EXTRA_TYST_FONT_URLS = [
  `${TYST_DEV_ASSETS}NotoSerifCJKjp-Regular.otf`,
  `${TYST_DEV_ASSETS}NotoSerifCJKtc-Regular.otf`,
  `${TYST_DEV_ASSETS}NotoSerifCJKkr-Regular.otf`,
  `${TYST_DEV_ASSETS}NotoSerifCJKsc-Bold.otf`,
  `${TYST_DEV_ASSETS}NotoSerifCJKtc-Bold.otf`,
  `${TYST_DEV_ASSETS}NotoSansArabic-Regular.ttf`,
  `${TYST_DEV_ASSETS}NotoSansThai-Regular.ttf`,
  `${TYST_DEV_ASSETS}NotoSerifHebrew-Regular.ttf`,
  `${TYST_DEV_ASSETS}IBMPlexSans-Regular.ttf`,
  `${TYST_DEV_ASSETS}IBMPlexSans-Bold.ttf`,
  `${TYST_DEV_ASSETS}IBMPlexSerif-Regular.ttf`,
  `${TYST_DEV_ASSETS}IBMPlexSansDevanagari-Regular.ttf`
] as const;

export function getTypstFontProviders() {
  return [
    TypstSnippet.fetchPackageRegistry(),
    TypstSnippet.preloadFontAssets({ assets: ['text', 'cjk', 'emoji'] }),
    TypstSnippet.preloadFonts([...EXTRA_TYST_FONT_URLS])
  ];
}
