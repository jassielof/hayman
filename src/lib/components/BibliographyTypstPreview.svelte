<script lang="ts">
  import CitationStyleControls from '$lib/components/CitationStyleControls.svelte';
  import TypstPreview from '$lib/components/TypstPreview.svelte';
  import { SettingsService } from '$lib/services/settings.service';
  import { renderBibliographySvg } from '$lib/services/typst-preview.service';
  import type { AppSettings } from '$lib/types/app-settings';
  import type { Hayagriva } from '$lib/types/hayagriva';
  import { resolveCitationStyle } from '$lib/utils/citation-style';

  let {
    bibliographyData
  }: {
    bibliographyData: Hayagriva;
  } = $props();

  let settings = $state<AppSettings | null>(null);
  let styleInput = $state('ieee');
  let useDefaultStyle = $state(true);
  let svg = $state<string | undefined>();
  let loading = $state(false);
  let error = $state<string | undefined>();
  let open = $state(false);

  async function renderPreview() {
    loading = true;
    error = undefined;
    try {
      const loaded = settings ?? (await SettingsService.get());
      settings = loaded;
      const resolved = resolveCitationStyle(
        useDefaultStyle ? loaded.citation.defaultStyle : styleInput,
        loaded
      );
      svg = await renderBibliographySvg(
        bibliographyData,
        resolved.typstStyle,
        resolved.label,
        loaded.fonts.sans,
        resolved.useCustomCsl ? loaded.citation.customCslBytes : undefined
      );
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
</script>

<!-- TODO: The preview become unreadable when the theme is in dark mode, because the font is still in dark mode, fix that, but also I wanna see how HTML looks, so add one (just for testing and temporarily) to see how it might look.  -->
 <!-- TODO: The position of this being at the bottom makes it really hard to preview it, as one needs to scroll fully to the bottom just to look at it, we need better UX, maybe using the top header bar. -->
<details class="fieldset mt-6" bind:open>
  <summary class="fieldset-legend cursor-pointer select-none">
    Rendered bibliography (Typst)
  </summary>

  <div class="mt-4 space-y-4">
    <CitationStyleControls
      bind:settings
      bind:styleInput
      bind:useDefaultStyle
      onRender={renderPreview}
    />
    <TypstPreview {svg} {loading} {error} />
  </div>
</details>
