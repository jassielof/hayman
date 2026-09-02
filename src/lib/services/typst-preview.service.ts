import type { AppFontSettings } from '$lib/types/app-settings';
import { browser } from '$app/environment';
import type { Hayagriva } from '@hayman/hayagriva-schema';
import { toYaml } from '$lib/services/hayagriva.service';
import { getTypstFontProviders } from '$lib/typst/fonts';
import {
  BIBLIOGRAPHY_FULL_TEMPLATE,
  ENTRY_CITATION_TEMPLATE,
} from '$lib/typst/templates';

type TypstSnippetState = {
  providers?: unknown[];
  use: (...providers: unknown[]) => void;
  setCompilerInitOptions: (options: Record<string, unknown>) => void;
  setRendererInitOptions: (options: Record<string, unknown>) => void;
  svg: (options: Record<string, unknown>) => Promise<string>;
};

const RENDER_TIMEOUT_MS = 120_000;
const MAX_SESSION_CACHE_ENTRIES = 12;

let initPromise: Promise<void> | null = null;
let renderChain: Promise<unknown> = Promise.resolve();
let wasmUrlsPromise: ReturnType<typeof loadWasmUrls> | null = null;
const renderCache = new Map<string, Promise<string>>();

async function loadWasmUrls() {
  if (!browser)
    throw new Error('Typst previews are only available in the browser.');
  const [compiler, renderer] = await Promise.all([
    import('@myriaddreamin/typst-ts-web-compiler/wasm?url'),
    import('@myriaddreamin/typst-ts-renderer/wasm?url'),
  ]);
  return {
    compiler: compiler.default,
    renderer: renderer.default,
  };
}

function resolveWasmUrls() {
  return (wasmUrlsPromise ??= loadWasmUrls());
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
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
      },
    );
  });
}

async function ensureTypst() {
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const [{ $typst: typstImport }, wasmUrls] = await Promise.all([
      import('@myriaddreamin/typst.ts/contrib/snippet'),
      resolveWasmUrls(),
    ]);
    const $typst = typstImport as unknown as TypstSnippetState;

    // Providers can only be registered once per $typst lifetime.
    if (Array.isArray($typst.providers)) {
      $typst.use(...getTypstFontProviders());
    }

    $typst.setCompilerInitOptions({
      getModule: () => wasmUrls.compiler,
    });
    $typst.setRendererInitOptions({
      getModule: () => wasmUrls.renderer,
    });
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  await initPromise;
}

function buildInputs(
  data: Hayagriva,
  typstStyle: string,
  styleLabel: string,
  fonts: AppFontSettings,
  customCsl?: string,
  entryKey?: string,
  compact?: boolean,
): Record<string, string> {
  const inputs: Record<string, string> = {
    yaml: toYaml(data),
    style: typstStyle,
    'style-label': styleLabel,
    csl: customCsl ?? '',
    'font-sans': fonts.sans,
    'font-serif': fonts.serif,
  };

  if (entryKey) {
    inputs['entry-key'] = entryKey;
  }

  inputs.compact = compact ? 'true' : 'false';

  return inputs;
}

/** Strip fixed SVG dimensions so CSS can scale to the container width. */
export function makeSvgResponsive(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const cleaned = attrs
      .replace(/\s+width="[^"]*"/gi, '')
      .replace(/\s+height="[^"]*"/gi, '')
      .replace(/\s+style="[^"]*"/gi, '');

    return `<svg${cleaned} width="100%" style="display:block;max-width:100%;height:auto;">`;
  });
}

async function renderSvg(
  mainContent: string,
  inputs: Record<string, string>,
): Promise<string> {
  const cacheKey = `${mainContent}\0${JSON.stringify(inputs)}`;
  const cached = renderCache.get(cacheKey);
  if (cached) {
    // Refresh insertion order so frequently revisited previews stay cached.
    renderCache.delete(cacheKey);
    renderCache.set(cacheKey, cached);
    return cached;
  }

  const task = renderChain.then(async () => {
    await ensureTypst();
    const { $typst: typstImport } =
      await import('@myriaddreamin/typst.ts/contrib/snippet');
    const $typst = typstImport as unknown as TypstSnippetState;

    const svg = await withTimeout(
      $typst.svg({ mainContent, inputs }),
      RENDER_TIMEOUT_MS,
      'Typst preview timed out. The first compile downloads WebAssembly (~8MB) — try again on a stable connection.',
    );

    return makeSvgResponsive(svg);
  });

  renderChain = task.catch(() => {});
  const cachedTask = task.catch((error) => {
    renderCache.delete(cacheKey);
    throw error;
  });
  renderCache.set(cacheKey, cachedTask);
  if (renderCache.size > MAX_SESSION_CACHE_ENTRIES) {
    const oldestKey = renderCache.keys().next().value;
    if (oldestKey !== undefined) renderCache.delete(oldestKey);
  }
  return cachedTask;
}

export async function renderBibliographySvg(
  data: Hayagriva,
  fonts: AppFontSettings,
): Promise<string> {
  return renderSvg(
    BIBLIOGRAPHY_FULL_TEMPLATE,
    buildInputs(data, 'ieee', 'Automatically generated', fonts),
  );
}

export async function renderEntryCitationSvg(
  data: Hayagriva,
  entryId: string,
  typstStyle: string,
  styleLabel: string,
  fonts: AppFontSettings,
  customCsl?: string,
  compact = false,
): Promise<string> {
  return renderSvg(
    ENTRY_CITATION_TEMPLATE,
    buildInputs(
      data,
      typstStyle,
      styleLabel,
      fonts,
      customCsl,
      entryId,
      compact,
    ),
  );
}
