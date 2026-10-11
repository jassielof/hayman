import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hayagriva } from '@hayman/hayagriva-schema';
import { tauriBackend } from './tauri-backend.js';
import {
  DEFAULT_ENTRY_PREVIEW_TEMPLATE,
  parsePreviewTemplate,
  renderEntryPreview,
} from './citation-preview.service.js';

vi.mock('#lib/services/tauri-backend.js', () => ({
  tauriBackend: { renderEntryPreview: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('native citation previews', () => {
  it('parses every default form and the literal supplement in order', () => {
    const { parts, citations } = parsePreviewTemplate(
      DEFAULT_ENTRY_PREVIEW_TEMPLATE,
    );
    expect(citations.map((citation) => citation.form)).toEqual([
      'prose',
      'normal',
      'author',
      'year',
      'normal',
      'full',
    ]);
    expect(citations[4].supplement).toBe('pp. 1–5');
    expect(parts.filter((part) => 'citation' in part)).toEqual(
      citations.map((_, citation) => ({ citation })),
    );
  });

  it('preserves custom prose, line breaks, repeated citations and literal markup', () => {
    const parsed = parsePreviewTemplate(
      '<script>not code</script>\n{{normal|chapter 3|section 2}}{{normal}}',
    );
    expect(parsed.parts[0]).toEqual({ text: '<script>not code</script>\n' });
    expect(parsed.citations).toEqual([
      { form: 'normal', supplement: 'chapter 3|section 2' },
      { form: 'normal', supplement: undefined },
    ]);
    expect(parsePreviewTemplate('').citations).toEqual([]);
    expect(parsePreviewTemplate('Only a bibliography').parts).toEqual([
      { text: 'Only a bibliography' },
    ]);
  });

  it.each(['{{unknown}}', '{{normal', '{{normal {{year}}}}', 'normal}}'])(
    'rejects malformed placeholders: %s',
    (source) => {
      expect(() => parsePreviewTemplate(source)).toThrow();
    },
  );

  it('bounds template and citation counts', () => {
    expect(() => parsePreviewTemplate('a'.repeat(20_001))).toThrow('20,000');
    expect(() => parsePreviewTemplate('{{normal}}'.repeat(101))).toThrow('100');
  });

  it('sends the complete library, selected key and custom CSL to the native renderer', async () => {
    const data: Hayagriva = {
      first: { type: 'Book', title: 'First' },
      second: { type: 'Book', title: 'Second' },
    };
    const native = {
      language: '',
      citations: ['<span>Author</span>'],
      bibliography: {
        items: [],
        hangingIndent: false,
        secondFieldAlign: false,
        lineSpacing: 1,
        entrySpacing: 0,
      },
    };
    vi.mocked(tauriBackend.renderEntryPreview).mockResolvedValueOnce(native);
    const preview = await renderEntryPreview(
      data,
      'second',
      'custom',
      '<style/>',
      'By {{author}}.',
    );
    expect(tauriBackend.renderEntryPreview).toHaveBeenCalledWith(
      expect.stringContaining('first:'),
      'second',
      'custom',
      '<style/>',
      [{ form: 'author', supplement: undefined }],
    );
    expect(preview.parts).toEqual([
      { text: 'By ' },
      { citation: 0 },
      { text: '.' },
    ]);
    expect(preview.citations).toEqual(native.citations);
    expect(preview.bibliography).toEqual(native.bibliography);
  });

  it('rejects bad templates before native rendering and surfaces native errors', async () => {
    await expect(
      renderEntryPreview({}, 'missing', 'apa', undefined, '{{bad}}'),
    ).rejects.toThrow('Unknown');
    expect(tauriBackend.renderEntryPreview).not.toHaveBeenCalled();
    vi.mocked(tauriBackend.renderEntryPreview).mockRejectedValueOnce(
      new Error('Missing entry'),
    );
    await expect(
      renderEntryPreview({}, 'missing', 'apa', undefined, '{{normal}}'),
    ).rejects.toThrow('Missing entry');
  });
});
