<script lang="ts">
  import FormattedBibliography from './FormattedBibliography.svelte';
  import type { EntryPreview } from '#lib/services/citation-preview.service.js';
  import { externalPreviewLinks } from '#lib/utils/external-preview-links.js';

  let {
    preview,
    loading,
    error,
  }: { preview?: EntryPreview; loading: boolean; error?: string } = $props();
  let linkError = $state<string>();
</script>

<div class="space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6">
  {#if loading}
    <p role="status">Formatting citation preview with Hayagriva…</p>
  {:else if error}
    <p role="alert" class="text-destructive">{error}</p>
  {:else if preview}
    <section
      aria-label="Citation examples"
      class="font-serif text-base leading-relaxed"
    >
      <div
        class="whitespace-pre-line"
        use:externalPreviewLinks={(error) => (linkError = error)}
      >
        {#each preview.parts as part, index (index)}
          {#if 'text' in part}{part.text}{:else}
            <!-- Only escaped, backend-produced Hayagriva HTML. -->
            <bdi lang={preview.language}
              ><!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html preview.citations[part.citation]}</bdi
            >
          {/if}
        {/each}
      </div>
      {#if linkError}<p role="alert" class="mt-3 text-sm text-destructive">
          Could not open link: {linkError}
        </p>{/if}
    </section>
    <section
      aria-label="Entry bibliography"
      class="space-y-3 border-t border-border pt-4"
    >
      <h2 class="text-sm font-medium">Bibliography</h2>
      <FormattedBibliography bibliography={preview.bibliography} />
    </section>
  {:else}
    <p class="text-sm text-muted-foreground">
      Click “Render preview” to format this entry.
    </p>
  {/if}
</div>
