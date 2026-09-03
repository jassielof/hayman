import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hayagriva } from '@hayman/hayagriva-schema';
import { DEFAULT_APP_SETTINGS } from '$lib/types/app-settings';

const { renderTypstMock } = vi.hoisted(() => ({
  renderTypstMock: vi
    .fn()
    .mockResolvedValue(
      '<svg width="400" height="200" viewBox="0 0 400 200"></svg>',
    ),
}));

vi.mock('$lib/services/tauri-backend', () => ({
  tauriBackend: {
    renderTypst: renderTypstMock,
  },
}));

import {
  makeSvgResponsive,
  renderBibliographySvg,
  renderEntryCitationSvg,
} from '$lib/services/typst-preview.service';

const sampleData: Hayagriva = {
  entry1: { type: 'article', title: 'Sample' },
};

const sampleFonts = DEFAULT_APP_SETTINGS.fonts;

describe('typst-preview.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes SVG scale to container width', () => {
    const responsive = makeSvgResponsive(
      '<svg width="400" height="200" viewBox="0 0 400 200"></svg>',
    );

    expect(responsive).toContain('width="100%"');
    expect(responsive).not.toContain('width="400"');
    expect(responsive).not.toContain('height="200"');
  });

  it('renders bibliography SVG through the native Typst command', async () => {
    const svg = await renderBibliographySvg(
      sampleData,
      'apa',
      'APA',
      sampleFonts,
    );

    expect(svg).toContain('<svg');
    expect(svg).toContain('width="100%"');
    expect(renderTypstMock).toHaveBeenCalledWith(
      expect.stringContaining('#bibliography('),
      expect.objectContaining({
        style: 'apa',
        yaml: expect.stringContaining('entry1'),
        csl: '',
        'font-sans': sampleFonts.sans,
        'font-serif': sampleFonts.serif,
      }),
    );
    expect(renderTypstMock.mock.calls[0][0]).toContain('style: bib-style');
  });

  it('passes entry key for citation preview', async () => {
    await renderEntryCitationSvg(
      sampleData,
      'entry1',
      'apa',
      'apa',
      sampleFonts,
    );

    expect(renderTypstMock).toHaveBeenCalledWith(
      expect.stringContaining('#cite('),
      expect.objectContaining({
        'entry-key': 'entry1',
        style: 'apa',
      }),
    );
  });

  it('passes compact flag for mobile citation preview', async () => {
    await renderEntryCitationSvg(
      sampleData,
      'entry1',
      'apa',
      'apa',
      sampleFonts,
      undefined,
      true,
    );

    expect(renderTypstMock).toHaveBeenCalledWith(
      expect.stringContaining('compact'),
      expect.objectContaining({
        compact: 'true',
      }),
    );
  });

  it('passes compact false on desktop citation preview', async () => {
    await renderEntryCitationSvg(
      sampleData,
      'desktop-entry',
      'apa',
      'apa',
      sampleFonts,
      undefined,
      false,
    );

    expect(renderTypstMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        compact: 'false',
      }),
    );
  });

  it('passes custom CSL through inputs', async () => {
    await renderEntryCitationSvg(
      sampleData,
      'entry1',
      'custom',
      'Custom',
      sampleFonts,
      '<style></style>',
    );

    expect(renderTypstMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        csl: '<style></style>',
      }),
    );
  });

  it('injects an entry preview body override into the Typst source', async () => {
    await renderEntryCitationSvg(
      sampleData,
      'custom-body-entry',
      'apa',
      'apa',
      sampleFonts,
      undefined,
      false,
      '#cite(key, form: "author")',
    );

    expect(renderTypstMock).toHaveBeenCalledWith(
      expect.stringContaining('#cite(key, form: "author")'),
      expect.any(Object),
    );
  });

  it('reuses an identical render within the session', async () => {
    await renderEntryCitationSvg(
      sampleData,
      'cached-entry',
      'mla',
      'mla',
      sampleFonts,
    );
    await renderEntryCitationSvg(
      sampleData,
      'cached-entry',
      'mla',
      'mla',
      sampleFonts,
    );

    expect(renderTypstMock).toHaveBeenCalledTimes(1);
  });
});
