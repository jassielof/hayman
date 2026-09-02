<script lang="ts">
  import CitationStyleControls from '$lib/components/CitationStyleControls.svelte';
  import TypstPreview from '$lib/components/TypstPreview.svelte';
  import { SettingsService } from '$lib/services/settings.service';
  import { renderBibliographySvg } from '$lib/services/typst-preview.service';
  import type { AppSettings } from '$lib/types/app-settings';
  import { resolvePreviewCitationStyle } from '$lib/utils/citation-style';
  import type { Hayagriva } from '@hayman/hayagriva-schema';

  let {
    bibliographyData,
    active = false,
  }: {
    bibliographyData: Hayagriva;
    active?: boolean;
  } = $props();

  let settings = $state<AppSettings | null>(null);
  let styleInput = $state('ieee');
  let useDefaultStyle = $state(true);
  let overrideKind = $state<'bundled' | 'custom-csl'>('bundled');
  let styleInputDebounced = $state('ieee');
  let svg = $state<string | undefined>();
  let loading = $state(false);
  let error = $state<string | undefined>();
  let lastRenderedStyleKey = $state<string | null>(null);

  const previewStyleKey = $derived(
    settings
      ? JSON.stringify({
          useDefaultStyle,
          overrideKind,
          style: styleInputDebounced.trim(),
          defaultStyle: settings.citation.defaultStyle,
          cslName: settings.citation.customCslName ?? '',
        })
      : null,
  );

  async function renderPreview() {
    loading = true;
    error = undefined;
    try {
      const loaded = settings ?? (await SettingsService.get());
      settings = loaded;
      const resolved = resolvePreviewCitationStyle(loaded, {
        useSettingsDefault: useDefaultStyle,
        overrideKind,
        bundledStyle: styleInputDebounced,
      });
      svg = await renderBibliographySvg(
        bibliographyData,
        resolved.typstStyle,
        resolved.label,
        loaded.fonts,
        resolved.useCustomCsl ? loaded.citation.customCsl : undefined,
      );
      lastRenderedStyleKey = previewStyleKey;
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
    const value = styleInput;
    if (useDefaultStyle || overrideKind !== 'bundled') {
      styleInputDebounced = value;
      return;
    }

    const timer = setTimeout(() => {
      styleInputDebounced = value;
    }, 400);

    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (!active) {
      lastRenderedStyleKey = null;
      return;
    }

    const key = previewStyleKey;
    if (!key || loading || key === lastRenderedStyleKey) return;

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
