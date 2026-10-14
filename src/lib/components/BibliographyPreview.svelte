<script lang="ts">
  import CitationStyleControls from '#lib/components/CitationStyleControls.svelte';
  import FormattedBibliography from '#lib/components/FormattedBibliography.svelte';
  import { SettingsService } from '#lib/services/settings.service.js';
  import {
    tauriBackend,
    type RenderedBibliography,
  } from '#lib/services/tauri-backend.js';
  import { toYaml } from '#lib/services/hayagriva.service.js';
  import type { AppSettings } from '#lib/types/app-settings.js';
  import { resolvePreviewCitationStyle } from '#lib/utils/citation-style.js';
  import type { Hayagriva } from '@hayman/hayagriva-schema';

  let {
    bibliographyData,
    active = false,
  }: { bibliographyData: Hayagriva; active?: boolean } = $props();
  let settings = $state<AppSettings | null>(null);
  let styleInput = $state('ieee');
  let useDefaultStyle = $state(true);
  let overrideKind = $state<'bundled' | 'custom-csl'>('bundled');
  let styleInputDebounced = $state('ieee');
  let bibliography = $state<RenderedBibliography>();
  let loading = $state(false);
  let error = $state<string>();
  let lastRenderedStyleKey = $state<string | null>(null);
  const previewStyleKey = $derived(
    settings
      ? JSON.stringify({
          useDefaultStyle,
          overrideKind,
          style: styleInputDebounced.trim(),
          defaultStyle: settings.citation.defaultStyle,
          cslName: settings.citation.customCslName ?? '',
          bibliographyData,
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
      // Record the attempt before invoking native code so a render error does
      // not trigger an automatic retry loop.
      lastRenderedStyleKey = previewStyleKey;
      bibliography = await tauriBackend.renderBibliography(
        toYaml(bibliographyData),
        resolved.styleName,
        resolved.useCustomCsl ? loaded.citation.customCsl : undefined,
      );
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      bibliography = undefined;
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
    const timer = setTimeout(() => (styleInputDebounced = value), 400);
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
  <div class="citation-surface rounded-lg p-6 shadow-xs sm:p-8">
    {#if loading}
      <div
        class="flex min-h-48 flex-col items-center justify-center gap-2"
        role="status"
      >
        <span class="loading loading-md loading-spinner"></span>
        <span>Formatting bibliography with Hayagriva…</span>
      </div>
    {:else if error}
      <div role="alert" class="alert alert-error"><span>{error}</span></div>
    {:else if bibliography}
      <FormattedBibliography {bibliography} />
    {:else}
      <p class="text-sm text-muted-foreground">
        Click “Render preview” to format the reference list with Hayagriva.
      </p>
    {/if}
  </div>
</div>
