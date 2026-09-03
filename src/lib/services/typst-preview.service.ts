import type { AppFontSettings } from '$lib/types/app-settings';
import type { Hayagriva } from '@hayman/hayagriva-schema';
import { toYaml } from '$lib/services/hayagriva.service';
import {
  BIBLIOGRAPHY_FULL_TEMPLATE,
  DEFAULT_ENTRY_CITATION_BODY,
  buildEntryCitationTemplate,
} from '$lib/typst/templates';
import { tauriBackend } from '$lib/services/tauri-backend';

const RENDER_TIMEOUT_MS = 120_000;
const MAX_SESSION_CACHE_ENTRIES = 12;

let renderChain: Promise<unknown> = Promise.resolve();
const renderCache = new Map<string, Promise<string>>();

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
    const svg = await withTimeout(
      tauriBackend.renderTypst(mainContent, inputs),
      RENDER_TIMEOUT_MS,
      'Typst preview timed out.',
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
  typstStyle: string,
  styleLabel: string,
  fonts: AppFontSettings,
  customCsl?: string,
): Promise<string> {
  return renderSvg(
    BIBLIOGRAPHY_FULL_TEMPLATE,
    buildInputs(data, typstStyle, styleLabel, fonts, customCsl),
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
  previewBody = DEFAULT_ENTRY_CITATION_BODY,
): Promise<string> {
  return renderSvg(
    buildEntryCitationTemplate(previewBody),
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
