import type { Hayagriva } from '$lib/types/hayagriva';
import { toYaml } from '$lib/services/hayagriva.service';

const TYPST_COMPILER_WASM =
  'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0/pkg/typst_ts_web_compiler_bg.wasm';
const TYPST_RENDERER_WASM =
  'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@0.7.0/pkg/typst_ts_renderer_bg.wasm';

const FONT_CDN =
  'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts';

export const TYPST_PREVIEW_FONT = 'New Computer Modern';

const MINIMAL_TYST_FONTS = [
  `${FONT_CDN}/NewCM10-Regular.otf`,
  `${FONT_CDN}/NewCM10-Bold.otf`,
  `${FONT_CDN}/NewCM10-Italic.otf`,
  `${FONT_CDN}/NewCM10-BoldItalic.otf`
];

const RENDER_TIMEOUT_MS = 120_000;

const BIB_STYLE_LET = `#let bib-style = if sys.inputs.at("csl") != "" {
  bytes(sys.inputs.at("csl"))
} else {
  sys.inputs.at("style")
}`;

// TODO: There's no need to download fonts, this is just for preview, font is irrelevant, the Typst compiler has its default fonts, this could be relevant if we want to preview custom font or use a font that doesn't support given characters, such as CJK, but not an issue right now.
// TODO: This should be read from a templates directory.
// TODO: Font shouldn't be set at all, defaults will be fine, as it's compiled to SVG either way, it'll scale decently.
// TODO: For both cases, adjust the page height to auto, otherwise there's too much blank space. Also there's no need for the 1.2 em vertical space, let it be default.

// TODO: For entry main, let's use the `#lorem()` function instead of manual lorem text, also let's try to use all citation forms.
const ENTRY_MAIN = `#set page(margin: 1.5cm)
#set text(font: "${TYPST_PREVIEW_FONT}", size: 11pt)

#text(size: 12pt, fill: gray)[Style: #sys.inputs.at("style-label")]
#v(0.5em)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
habitant morbi tristique senectus et netus #cite(
  label(sys.inputs.at("entry-key")),
  form: "prose",
).

#v(1.2em)
${BIB_STYLE_LET}
#bibliography(bytes(sys.inputs.at("yaml")), style: bib-style)`;

// TODO: No need to add a bibliography preview title, the same bibliography function offers a custom title.
const BIBLIOGRAPHY_MAIN = `#set page(margin: 1.5cm)
#set text(font: "${TYPST_PREVIEW_FONT}", size: 11pt)
#set par(justify: true)

#text(size: 14pt, weight: "bold")[
  Bibliography preview — #sys.inputs.at("style-label")
]
#v(0.8em)

${BIB_STYLE_LET}
#bibliography(
  bytes(sys.inputs.at("yaml")),
  style: bib-style,
  full: true,
)`;

let initPromise: Promise<void> | null = null;

async function resolveWasmUrls() {
  if (import.meta.env.DEV) {
    const [compiler, renderer] = await Promise.all([
      import('@myriaddreamin/typst-ts-web-compiler/wasm?url'),
      import('@myriaddreamin/typst-ts-renderer/wasm?url')
    ]);
    return {
      compiler: compiler.default,
      renderer: renderer.default
    };
  }

  return {
    compiler: TYPST_COMPILER_WASM,
    renderer: TYPST_RENDERER_WASM
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function ensureTypst() {
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const [{ $typst }, { TypstSnippet }, wasmUrls] = await Promise.all([
      import('@myriaddreamin/typst.ts'),
      import('@myriaddreamin/typst.ts/contrib/snippet'),
      resolveWasmUrls()
    ]);

    $typst.use(TypstSnippet.disableDefaultFontAssets());
    $typst.use(TypstSnippet.preloadFonts(MINIMAL_TYST_FONTS));
    $typst.use(TypstSnippet.fetchPackageRegistry());

    $typst.setCompilerInitOptions({
      getModule: () => wasmUrls.compiler
    });
    $typst.setRendererInitOptions({
      getModule: () => wasmUrls.renderer
    });
  })();

  await initPromise;
}

function buildInputs(
  data: Hayagriva,
  typstStyle: string,
  styleLabel: string,
  customCslBytes?: Uint8Array,
  entryKey?: string
): Record<string, string> {
  const inputs: Record<string, string> = {
    yaml: toYaml(data),
    style: typstStyle,
    'style-label': styleLabel,
    csl: customCslBytes?.byteLength
      ? new TextDecoder().decode(customCslBytes)
      : ''
  };

  if (entryKey) {
    inputs['entry-key'] = entryKey;
  }

  return inputs;
}

async function renderSvg(
  mainContent: string,
  inputs: Record<string, string>
): Promise<string> {
  await ensureTypst();
  const { $typst } = await import('@myriaddreamin/typst.ts');

  return withTimeout(
    $typst.svg({ mainContent, inputs }),
    RENDER_TIMEOUT_MS,
    'Typst preview timed out. The first compile downloads ~8MB of WebAssembly and fonts — try again on a stable connection.'
  );
}

/** Clears cached init so WASM/font options are reapplied on next render. */
export async function reinitTypstPreview() {
  initPromise = null;
}

export async function renderBibliographySvg(
  data: Hayagriva,
  typstStyle: string,
  styleLabel: string,
  _sansFont: string,
  customCslBytes?: Uint8Array
): Promise<string> {
  return renderSvg(
    BIBLIOGRAPHY_MAIN,
    buildInputs(data, typstStyle, styleLabel, customCslBytes)
  );
}

export async function renderEntryCitationSvg(
  data: Hayagriva,
  entryId: string,
  typstStyle: string,
  styleLabel: string,
  _sansFont: string,
  customCslBytes?: Uint8Array
): Promise<string> {
  return renderSvg(
    ENTRY_MAIN,
    buildInputs(data, typstStyle, styleLabel, customCslBytes, entryId)
  );
}
