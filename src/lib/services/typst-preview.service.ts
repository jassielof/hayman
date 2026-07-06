import type { Hayagriva } from '$lib/types/hayagriva';
import { toYaml } from '$lib/services/hayagriva.service';

const BIBLIOGRAPHY_YAML_PATH = '/data/bibliography.yaml';
const CUSTOM_CSL_PATH = '/styles/custom.csl';
const ENTRY_TEMPLATE_PATH = '/templates/entry-citation.typ';
const BIBLIOGRAPHY_TEMPLATE_PATH = '/templates/bibliography-full.typ';

const TYPST_COMPILER_WASM =
  'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0/pkg/typst_ts_web_compiler_bg.wasm';
const TYPST_RENDERER_WASM =
  'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@0.7.0/pkg/typst_ts_renderer_bg.wasm';

const FONT_CDN =
  'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts';

/** Font family bundled with Typst text assets — avoids loading the full font pack. */
export const TYPST_PREVIEW_FONT = 'New Computer Modern';

const MINIMAL_TYST_FONTS = [
  `${FONT_CDN}/NewCM10-Regular.otf`,
  `${FONT_CDN}/NewCM10-Bold.otf`,
  `${FONT_CDN}/NewCM10-Italic.otf`,
  `${FONT_CDN}/NewCM10-BoldItalic.otf`
];

const RENDER_TIMEOUT_MS = 120_000;

const encoder = new TextEncoder();

let snippetInstance:
  import('@myriaddreamin/typst.ts/contrib/snippet').TypstSnippet | null = null;
let initPromise: Promise<void> | null = null;
let templatesLoaded = false;

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

async function getSnippet() {
  if (snippetInstance) {
    return snippetInstance;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const { TypstSnippet } =
        await import('@myriaddreamin/typst.ts/contrib/snippet');
      const wasmUrls = await resolveWasmUrls();

      const instance = new TypstSnippet();
      instance.use(TypstSnippet.disableDefaultFontAssets());
      instance.use(TypstSnippet.preloadFonts(MINIMAL_TYST_FONTS));
      instance.use(TypstSnippet.fetchPackageRegistry());

      instance.setCompilerInitOptions({
        getModule: () => wasmUrls.compiler
      });
      instance.setRendererInitOptions({
        getModule: () => wasmUrls.renderer
      });

      snippetInstance = instance;
    })();
  }

  await initPromise;
  return snippetInstance!;
}

async function loadTemplates(snippet: Awaited<ReturnType<typeof getSnippet>>) {
  if (templatesLoaded) return;

  const [entryTemplate, bibliographyTemplate] = await Promise.all([
    import('$lib/typst/templates/entry-citation.typ?raw'),
    import('$lib/typst/templates/bibliography-full.typ?raw')
  ]);

  await snippet.addSource(ENTRY_TEMPLATE_PATH, entryTemplate.default);
  await snippet.addSource(
    BIBLIOGRAPHY_TEMPLATE_PATH,
    bibliographyTemplate.default
  );
  templatesLoaded = true;
}

async function mapBibliographyAndStyle(
  snippet: Awaited<ReturnType<typeof getSnippet>>,
  data: Hayagriva,
  typstStyle: string,
  styleLabel: string,
  customCslBytes?: Uint8Array
) {
  const yaml = toYaml(data);
  await snippet.resetShadow();
  await snippet.mapShadow(BIBLIOGRAPHY_YAML_PATH, encoder.encode(yaml));
  if (customCslBytes) {
    await snippet.mapShadow(CUSTOM_CSL_PATH, customCslBytes);
  }

  return {
    inputs: {
      style: typstStyle,
      'style-label': styleLabel,
      'sans-font': TYPST_PREVIEW_FONT
    }
  };
}

async function renderSvg(
  mainFilePath: string,
  inputs: Record<string, string>
): Promise<string> {
  return withTimeout(
    (async () => {
      const snippet = await getSnippet();
      await loadTemplates(snippet);
      return snippet.svg({ mainFilePath, inputs });
    })(),
    RENDER_TIMEOUT_MS,
    'Typst preview timed out. The first compile downloads ~8MB of WebAssembly and fonts — try again on a stable connection.'
  );
}

export async function reinitTypstPreview() {
  snippetInstance = null;
  initPromise = null;
  templatesLoaded = false;
}

export async function renderBibliographySvg(
  data: Hayagriva,
  typstStyle: string,
  styleLabel: string,
  _sansFont: string,
  customCslBytes?: Uint8Array
): Promise<string> {
  const snippet = await getSnippet();
  const base = await mapBibliographyAndStyle(
    snippet,
    data,
    typstStyle,
    styleLabel,
    customCslBytes
  );

  return renderSvg(BIBLIOGRAPHY_TEMPLATE_PATH, base.inputs);
}

export async function renderEntryCitationSvg(
  data: Hayagriva,
  entryId: string,
  typstStyle: string,
  styleLabel: string,
  _sansFont: string,
  customCslBytes?: Uint8Array
): Promise<string> {
  const snippet = await getSnippet();
  const base = await mapBibliographyAndStyle(
    snippet,
    data,
    typstStyle,
    styleLabel,
    customCslBytes
  );

  return renderSvg(ENTRY_TEMPLATE_PATH, {
    ...base.inputs,
    'entry-key': entryId
  });
}
