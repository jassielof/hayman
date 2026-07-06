import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hayagriva } from '$lib/types/hayagriva';

const svgMock = vi
  .fn()
  .mockResolvedValue('<svg width="100" height="50"></svg>');
const resetShadowMock = vi.fn().mockResolvedValue(undefined);
const mapShadowMock = vi.fn().mockResolvedValue(undefined);
const addSourceMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@myriaddreamin/typst.ts/contrib/snippet', () => ({
  TypstSnippet: class {
    use() {
      return this;
    }
    setCompilerInitOptions() {}
    setRendererInitOptions() {}
    addSource = addSourceMock;
    resetShadow = resetShadowMock;
    mapShadow = mapShadowMock;
    svg = svgMock;
    static fetchPackageRegistry() {
      return () => {};
    }
    static disableDefaultFontAssets() {
      return () => {};
    }
    static preloadFonts() {
      return () => {};
    }
  }
}));

vi.mock('$lib/typst/templates/entry-citation.typ?raw', () => ({
  default: '#entry template'
}));
vi.mock('$lib/typst/templates/bibliography-full.typ?raw', () => ({
  default: '#bibliography template'
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

  it('renders bibliography SVG via typst snippet', async () => {
    const svg = await renderBibliographySvg(
      sampleData,
      'ieee',
      'ieee',
      'IBM Plex Sans'
    );

    expect(svg).toContain('<svg');
    expect(resetShadowMock).toHaveBeenCalled();
    expect(mapShadowMock).toHaveBeenCalled();
    expect(svgMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mainFilePath: '/templates/bibliography-full.typ',
        inputs: expect.objectContaining({
          style: 'ieee',
          'sans-font': 'New Computer Modern'
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
        mainFilePath: '/templates/entry-citation.typ',
        inputs: expect.objectContaining({ 'entry-key': 'entry1', style: 'apa' })
      })
    );
  });

  it('maps custom CSL bytes into shadow filesystem', async () => {
    const csl = new TextEncoder().encode('<style></style>');
    await renderBibliographySvg(
      sampleData,
      '/styles/custom.csl',
      'Custom',
      'IBM Plex Sans',
      csl
    );

    expect(mapShadowMock).toHaveBeenCalledWith('/styles/custom.csl', csl);
  });
});
