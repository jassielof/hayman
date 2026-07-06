import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hayagriva } from '$lib/types/hayagriva';

const svgMock = vi
  .fn()
  .mockResolvedValue('<svg width="100" height="50"></svg>');

vi.mock('@myriaddreamin/typst.ts', () => ({
  $typst: {
    use: vi.fn(),
    setCompilerInitOptions: vi.fn(),
    setRendererInitOptions: vi.fn(),
    svg: svgMock
  }
}));

vi.mock('@myriaddreamin/typst.ts/contrib/snippet', () => ({
  TypstSnippet: {
    disableDefaultFontAssets: () => ({}),
    preloadFonts: () => ({}),
    fetchPackageRegistry: () => ({})
  }
}));

import {
  renderBibliographySvg,
  renderEntryCitationSvg,
  reinitTypstPreview
} from '$lib/services/typst-preview.service';

const sampleData: Hayagriva = {
  entry1: { type: 'article', title: 'Sample' }
};

describe('typst-preview.service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await reinitTypstPreview();
  });

  it('renders bibliography SVG via $typst.svg', async () => {
    const svg = await renderBibliographySvg(
      sampleData,
      'ieee',
      'ieee',
      'IBM Plex Sans'
    );

    expect(svg).toContain('<svg');
    expect(svgMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mainContent: expect.stringContaining('#bibliography('),
        inputs: expect.objectContaining({
          style: 'ieee',
          yaml: expect.stringContaining('entry1'),
          csl: ''
        })
      })
    );
  });

  it('passes entry key for citation preview', async () => {
    await renderEntryCitationSvg(
      sampleData,
      'entry1',
      'apa',
      'apa',
      'IBM Plex Sans'
    );

    expect(svgMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mainContent: expect.stringContaining('#cite('),
        inputs: expect.objectContaining({
          'entry-key': 'entry1',
          style: 'apa'
        })
      })
    );
  });

  it('passes custom CSL through inputs', async () => {
    const csl = new TextEncoder().encode('<style></style>');
    await renderBibliographySvg(
      sampleData,
      'custom',
      'Custom',
      'IBM Plex Sans',
      csl
    );

    expect(svgMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({
          csl: '<style></style>'
        })
      })
    );
  });
});
