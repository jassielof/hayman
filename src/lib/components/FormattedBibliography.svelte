<script lang="ts">
  import type { RenderedBibliography } from '#lib/services/tauri-backend.js';
  import { externalPreviewLinks } from '#lib/utils/external-preview-links.js';

  let { bibliography }: { bibliography: RenderedBibliography } = $props();
  let linkError = $state<string>();
</script>

<ol
  use:externalPreviewLinks={(error) => (linkError = error)}
  class="flex list-none flex-col font-serif text-base text-foreground sm:text-[1.05rem]"
  style:line-height={Math.max(1, bibliography.lineSpacing) * 1.35}
  style:gap={`${Math.max(0, bibliography.entrySpacing)}lh`}
>
  {#each bibliography.items as reference (reference.key)}
    <li
      data-entry-key={reference.key}
      class={[
        'break-words',
        bibliography.secondFieldAlign &&
          'grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3',
        bibliography.hangingIndent &&
          !bibliography.secondFieldAlign &&
          'pl-6 -indent-6',
      ]}
    >
      <!-- Only backend-produced HTML is accepted here. Its Hayagriva tree is
           escaped before serialization; user YAML and CSL are never raw HTML. -->
      {#if reference.firstFieldHtml !== null}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <span>{@html reference.firstFieldHtml}</span>
      {/if}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <div class="min-w-0">{@html reference.html}</div>
    </li>
  {/each}
</ol>
{#if linkError}
  <p role="alert" class="mt-3 text-sm text-destructive">
    Could not open link: {linkError}
  </p>
{/if}
