<script lang="ts">
  import CitationStyleControls from '$lib/components/CitationStyleControls.svelte';
  import TypstPreview from '$lib/components/TypstPreview.svelte';
  import { SettingsService } from '$lib/services/settings.service';
  import { renderBibliographySvg } from '$lib/services/typst-preview.service';
  import type { AppSettings } from '$lib/types/app-settings';
  import type { Hayagriva } from '$lib/types/hayagriva';
  import { resolvePreviewCitationStyle } from '$lib/utils/citation-style';

  let {
    bibliographyData,
    active = false
  }: {
    bibliographyData: Hayagriva;
    active?: boolean;
  } = $props();

  let settings = $state<AppSettings | null>(null);
  let styleInput = $state('ieee');
  let useDefaultStyle = $state(true);
  let overrideKind = $state<'bundled' | 'custom-csl'>('bundled');
  let svg = $state<string | undefined>();
  let loading = $state(false);
  let error = $state<string | undefined>();
  let previewRendered = $state(false);

  function customCslText(loaded: AppSettings) {
    return loaded.citation.customCsl?.trim()
      ? loaded.citation.customCsl
      : undefined;
  }

  async function renderPreview() {
    loading = true;
    error = undefined;
    try {
      const loaded = settings ?? (await SettingsService.get());
      settings = loaded;
      const resolved = resolvePreviewCitationStyle(loaded, {
        useSettingsDefault: useDefaultStyle,
        overrideKind,
        bundledStyle: styleInput
      });
      svg = await renderBibliographySvg(
        bibliographyData,
        resolved.typstStyle,
        resolved.label,
        loaded.fonts,
        resolved.useCustomCsl ? customCslText(loaded) : undefined
      );
      previewRendered = true;
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : 'Failed to render bibliography preview.';
      svg = undefined;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!active || previewRendered || loading) return;
    queueMicrotask(() => renderPreview());
  });
</script>

<div class="space-y-4">
  <CitationStyleControls
    bind:settings
    bind:styleInput
    bind:useDefaultStyle
    bind:overrideKind
    onRender={renderPreview}
  />
  <TypstPreview {svg} {loading} {error} />
</div>
