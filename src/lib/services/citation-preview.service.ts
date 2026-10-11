import type { Hayagriva } from '@hayman/hayagriva-schema';
import { toYaml } from '#lib/services/hayagriva.service.js';
import {
  tauriBackend,
  type PreviewCitation,
} from '#lib/services/tauri-backend.js';

export const DEFAULT_ENTRY_PREVIEW_TEMPLATE = `According to {{prose}}, this is a useful reference {{normal}}.
{{author}} published this work in {{year}}.
With a supplement: {{normal|pp. 1–5}}.
Full citation: {{full}}`;

export const ENTRY_PREVIEW_TEMPLATE_HELP =
  'Use {{normal}}, {{prose}}, {{author}}, {{year}}, or {{full}}. Add a literal supplement with {{normal|pp. 1–5}}. Other text is displayed as written; HTML and code are never executed.';

export type PreviewPart = { text: string } | { citation: number };

/** A deliberately small, non-executable template language. Citation formatting
 * belongs to Hayagriva/CSL; surrounding prose belongs to the user. */
export function parsePreviewTemplate(template: string) {
  if (template.length > 20_000)
    throw new Error('Preview templates must be at most 20,000 characters.');
  const parts: PreviewPart[] = [];
  const citations: PreviewCitation[] = [];
  let offset = 0;
  for (const match of template.matchAll(/\{\{([^{}]*)\}\}/g)) {
    parts.push({ text: template.slice(offset, match.index) });
    const separator = match[1].indexOf('|');
    const form = (
      separator < 0 ? match[1] : match[1].slice(0, separator)
    ).trim();
    if (!['normal', 'prose', 'author', 'year', 'full'].includes(form)) {
      throw new Error(
        `Unknown citation form “${form}”. Use normal, prose, author, year, or full.`,
      );
    }
    parts.push({ citation: citations.length });
    citations.push({
      form: form as PreviewCitation['form'],
      supplement:
        separator < 0 ? undefined : match[1].slice(separator + 1).trim(),
    });
    offset = match.index + match[0].length;
  }
  parts.push({ text: template.slice(offset) });
  if (parts.some((part) => 'text' in part && /\{\{|\}\}/.test(part.text))) {
    throw new Error('Unclosed or nested citation placeholder. Use {{normal}}.');
  }
  if (citations.length > 100)
    throw new Error('A preview can contain at most 100 citations.');
  return { parts, citations };
}

export async function renderEntryPreview(
  data: Hayagriva,
  entryKey: string,
  styleName: string,
  customCsl: string | undefined,
  template: string,
) {
  const { parts, citations } = parsePreviewTemplate(template);
  const rendered = await tauriBackend.renderEntryPreview(
    toYaml(data),
    entryKey,
    styleName,
    customCsl,
    citations,
  );
  return { ...rendered, parts };
}

export type EntryPreview = Awaited<ReturnType<typeof renderEntryPreview>>;
