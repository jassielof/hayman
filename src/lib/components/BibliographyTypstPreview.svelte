<script lang="ts">
  import TypstPreview from '$lib/components/TypstPreview.svelte';
  import { SettingsService } from '$lib/services/settings.service';
  import { renderBibliographySvg } from '$lib/services/typst-preview.service';
  import type { AppSettings } from '$lib/types/app-settings';
  import type { Hayagriva } from '$lib/types/hayagriva';

  let {
    bibliographyData,
    active = false
  }: {
    bibliographyData: Hayagriva;
    active?: boolean;
  } = $props();

  let settings = $state<AppSettings | null>(null);
  let svg = $state<string | undefined>();
  let loading = $state(false);
  let error = $state<string | undefined>();
  let rendered = $state(false);

  async function renderPreview() {
    loading = true;
    error = undefined;
    try {
      const loaded = settings ?? (await SettingsService.get());
      settings = loaded;
      svg = await renderBibliographySvg(
        bibliographyData,
        loaded.fonts
      );
      rendered = true;
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
    if (!active) {
      rendered = false;
      return;
    }

    if (loading || rendered) return;

    queueMicrotask(() => renderPreview());
  });
</script>

<div class="space-y-4">
  <TypstPreview {svg} {loading} {error} />
</div>
